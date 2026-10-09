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
  ['.woff2', 'font/woff2'],
]);

const appAliases = new Map([
  ['/website', '/apps/website'],
  ['/move', '/apps/passenger-pwa'],
  ['/passenger', '/apps/passenger/dist'],
  ['/driver', '/apps/driver-pwa'],
  ['/admin', '/apps/admin-dashboard'],
]);

function redirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function safeJoin(baseDirectory, relativePath) {
  const resolved = path.resolve(baseDirectory, relativePath);
  const relative = path.relative(baseDirectory, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://localhost:${port}`);
  const normalizedPathname = parsedUrl.pathname.replace(/\/$/, '');

  for (const [aliasPath, targetPath] of appAliases.entries()) {
    const appDirectory = path.resolve(rootDirectory, `.${targetPath}`);

    if (normalizedPathname === aliasPath) {
      return safeJoin(appDirectory, 'index.html');
    }

    if (normalizedPathname.startsWith(`${aliasPath}/`)) {
      const remainingPath = normalizedPathname.slice(aliasPath.length + 1);
      return safeJoin(appDirectory, remainingPath);
    }
  }

  return safeJoin(rootDirectory, parsedUrl.pathname.replace(/^\/+/, ''));
}

async function serveFile(response, filePath) {
  if (!filePath) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) return serveFile(response, path.join(filePath, 'index.html'));

    const extension = path.extname(filePath).toLowerCase();
    const fileContents = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extension) ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(fileContents);
  } catch {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end('Not found. If this is /passenger/, run npm run build:passenger first.');
  }
}

function proxyApi(request, response) {
  const incomingUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, apiTarget);
  const transport = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = { ...request.headers, host: targetUrl.host };

  delete headers['content-length'];
  delete headers['connection'];

  const proxy = transport(targetUrl, { method: request.method, headers }, (upstream) => {
    const outHeaders = { ...upstream.headers };
    delete outHeaders['transfer-encoding'];
    response.writeHead(upstream.statusCode ?? 502, outHeaders);
    upstream.pipe(response);
  });

  proxy.on('error', (error) => {
    if (!response.headersSent) {
      response.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
    }
    response.end(JSON.stringify({ message: 'Laravel API is unavailable.', detail: error.message }));
  });

  request.pipe(proxy);
}

createServer(async (request, response) => {
  const parsedUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (parsedUrl.pathname.startsWith('/api/')) return proxyApi(request, response);

  // Important: the public website uses relative ./styles.css and ./app.mjs paths.
  // Serving apps/website/index.html directly at / makes those assets resolve from /
  // and produces an unstyled page. Redirecting keeps the original visual intact.
  if (parsedUrl.pathname === '/') {
    return redirect(response, `/website/${parsedUrl.search}`);
  }

  for (const aliasPath of appAliases.keys()) {
    if (parsedUrl.pathname === aliasPath) {
      return redirect(response, `${aliasPath}/${parsedUrl.search}`);
    }
  }

  await serveFile(response, resolveRequestPath(request.url ?? '/'));
}).listen(port, host, () => {
  console.log(`Encore Transport running on http://${host}:${port}`);
  console.log(`Website:   http://${host}:${port}/website/`);
  console.log(`Passenger: http://${host}:${port}/passenger/`);
  console.log(`Driver:    http://${host}:${port}/driver/`);
  console.log(`Admin:     http://${host}:${port}/admin/`);
  console.log(`API proxy: ${apiTarget.origin}/api/*`);
});
