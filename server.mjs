import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const apiTarget = new URL(process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const appAliases = new Map([
  ['/website', '/apps/website'],
  ['/login', '/apps/auth'],
  ['/track-package', '/apps/package-tracking'],
  ['/passenger', '/apps/passenger/dist'],
  ['/driver', '/apps/driver-pwa'],
  ['/admin', '/apps/admin-dashboard'],
]);

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(self)',
};

function redirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    ...securityHeaders,
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function safeJoin(base, relativePath) {
  const candidate = path.resolve(base, `.${relativePath}`);
  const normalizedBase = path.resolve(base);
  return candidate === normalizedBase || candidate.startsWith(`${normalizedBase}${path.sep}`)
    ? candidate
    : null;
}

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://localhost:${port}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  for (const [aliasPath, targetPath] of appAliases.entries()) {
    if (pathname === `${aliasPath}/`) {
      return path.join(rootDirectory, targetPath, 'index.html');
    }

    if (pathname.startsWith(`${aliasPath}/`)) {
      const remainder = pathname.slice(aliasPath.length);
      return safeJoin(path.join(rootDirectory, targetPath), remainder);
    }
  }

  return safeJoin(rootDirectory, pathname);
}

async function serveFile(request, response, filePath) {
  try {
    const fileStat = await stat(filePath);
    const effectivePath = fileStat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const extension = path.extname(effectivePath).toLowerCase();
    const fileContents = await readFile(effectivePath);
    const isHtml = extension === '.html';

    response.writeHead(200, {
      ...securityHeaders,
      'Content-Type': mimeTypes.get(extension) ?? 'application/octet-stream',
      'Cache-Control': isHtml ? 'no-store' : 'public, max-age=300',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    response.end(fileContents);
  } catch {
    response.writeHead(404, {
      ...securityHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end('Not found. If this is /passenger/, run npm run build:passenger first.');
  }
}

function proxyApi(request, response) {
  const incomingUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiTarget);
  const transport = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = { ...request.headers, host: targetUrl.host };
  delete headers['content-length'];

  const proxy = transport(targetUrl, { method: request.method, headers }, (upstream) => {
    const outHeaders = { ...upstream.headers };
    delete outHeaders['transfer-encoding'];
    response.writeHead(upstream.statusCode ?? 502, {
      ...securityHeaders,
      ...outHeaders,
      'Cache-Control': 'no-store',
    });
    upstream.pipe(response);
  });

  proxy.on('error', (error) => {
    if (!response.headersSent) {
      response.writeHead(502, {
        ...securityHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
    }
    response.end(JSON.stringify({ message: 'Encore API is unavailable.', detail: error.message }));
  });

  request.pipe(proxy);
}

createServer(async (request, response) => {
  const parsedUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (parsedUrl.pathname.startsWith('/api/')) {
    proxyApi(request, response);
    return;
  }

  if (parsedUrl.pathname === '/') {
    redirect(response, '/website/');
    return;
  }

  if (parsedUrl.pathname === '/move' || parsedUrl.pathname.startsWith('/move/')) {
    redirect(response, '/passenger/');
    return;
  }

  for (const aliasPath of appAliases.keys()) {
    if (parsedUrl.pathname === aliasPath) {
      redirect(response, `${aliasPath}/${parsedUrl.search}`);
      return;
    }
  }

  const requestPath = resolveRequestPath(request.url ?? '/');
  if (!requestPath) {
    response.writeHead(400, {
      ...securityHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end('Bad request');
    return;
  }

  await serveFile(request, response, requestPath);
}).listen(port, host, () => {
  console.log(`Encore Transport running on http://${host}:${port}`);
  console.log(`Website:   http://${host}:${port}/website/`);
  console.log(`Login:     http://${host}:${port}/login/`);
  console.log(`Tracking:  http://${host}:${port}/track-package/`);
  console.log(`Passenger: http://${host}:${port}/passenger/`);
  console.log(`Driver:    http://${host}:${port}/driver/`);
  console.log(`Admin:     http://${host}:${port}/admin/`);
  console.log(`API proxy: ${apiTarget.origin}/api/*`);
});
