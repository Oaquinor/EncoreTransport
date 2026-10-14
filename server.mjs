import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const moduleRoot = path.dirname(fileURLToPath(import.meta.url));

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
  ['/passenger', '/apps/passenger/dist'],
  ['/driver', '/apps/driver-pwa'],
  ['/admin', '/apps/admin-dashboard'],
  ['/login', '/apps/auth'],
  ['/track-package', '/apps/package-tracking'],
]);

function redirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function safePath(rootDirectory, candidate) {
  const resolved = path.resolve(rootDirectory, candidate.replace(/^[/\\]+/, ''));
  const relative = path.relative(rootDirectory, resolved);

  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return resolved;
}

function resolveRequestPath(rootDirectory, requestUrl) {
  const parsedUrl = new URL(requestUrl, 'http://localhost');
  const normalizedPathname = parsedUrl.pathname.replace(/\/$/, '');

  for (const [aliasPath, targetPath] of appAliases.entries()) {
    if (normalizedPathname === aliasPath) {
      return safePath(rootDirectory, `${targetPath}/index.html`);
    }

    if (normalizedPathname.startsWith(`${aliasPath}/`)) {
      const remainingPath = normalizedPathname.slice(aliasPath.length + 1);
      return safePath(rootDirectory, `${targetPath}/${remainingPath}`);
    }
  }

  return safePath(rootDirectory, parsedUrl.pathname);
}

async function serveFile(response, filePath) {
  if (!filePath) {
    response.writeHead(400, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end('Bad request');
    return;
  }

  try {
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      await serveFile(response, path.join(filePath, 'index.html'));
      return;
    }

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
    response.end(
      'Not found. If this is /passenger/, run npm run build:passenger first.'
    );
  }
}

function proxyApi(request, response, apiTarget) {
  const incomingUrl = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`
  );

  const targetUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    apiTarget
  );

  const transport =
    targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;

  const headers = {
    ...request.headers,
    host: targetUrl.host,
  };

  delete headers['content-length'];
  delete headers.connection;

  const proxy = transport(
    targetUrl,
    {
      method: request.method,
      headers,
    },
    (upstream) => {
      const outHeaders = { ...upstream.headers };

      delete outHeaders['transfer-encoding'];
      delete outHeaders.connection;

      response.writeHead(upstream.statusCode ?? 502, outHeaders);
      upstream.pipe(response);
    }
  );

  proxy.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
    }

    response.end(
      JSON.stringify({
        message: 'Laravel API is unavailable.',
      })
    );
  });

  request.pipe(proxy);
}

export function createEncoreServer({
  rootDirectory = moduleRoot,
  apiTargetUrl = process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000',
} = {}) {
  const apiTarget = new URL(apiTargetUrl);

  return createServer(async (request, response) => {
    const parsedUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? 'localhost'}`
    );

    if (parsedUrl.pathname.startsWith('/api/')) {
      proxyApi(request, response, apiTarget);
      return;
    }

    if (parsedUrl.pathname === '/') {
      redirect(response, '/website/');
      return;
    }

    /*
     * /move was the old Passenger PWA alias.
     * The current Passenger application is /passenger/, so both /move and
     * /move/* are redirected instead of serving the obsolete PWA.
     */
    if (
      parsedUrl.pathname === '/move' ||
      parsedUrl.pathname === '/move/' ||
      parsedUrl.pathname.startsWith('/move/')
    ) {
      const suffix = parsedUrl.search || '';
      redirect(response, `/passenger/${suffix}`);
      return;
    }

    for (const aliasPath of appAliases.keys()) {
      if (parsedUrl.pathname === aliasPath) {
        redirect(response, `${aliasPath}/${parsedUrl.search}`);
        return;
      }
    }

    const requestPath = resolveRequestPath(
      rootDirectory,
      request.url ?? '/'
    );

    await serveFile(response, requestPath);
  });
}

export async function startEncoreServer({
  port = Number(process.env.PORT ?? 4173),
  host = process.env.HOST ?? '127.0.0.1',
  rootDirectory = moduleRoot,
  apiTargetUrl = process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000',
  quiet = false,
} = {}) {
  const server = createEncoreServer({
    rootDirectory,
    apiTargetUrl,
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Encore Transport server did not expose a TCP address.');
  }

  if (!quiet) {
    const base = `http://${host}:${address.port}`;

    console.log(`Encore Transport running on ${base}`);
    console.log(`Website:   ${base}/website/`);
    console.log(`Passenger: ${base}/passenger/`);
    console.log(`Driver:    ${base}/driver/`);
    console.log(`Admin:     ${base}/admin/`);
    console.log(`Login:     ${base}/login/`);
    console.log(`Tracking:  ${base}/track-package/`);
    console.log(`API proxy: ${new URL(apiTargetUrl).origin}/api/*`);
  }

  return {
    server,
    host,
    port: address.port,
  };
}

function isDirectExecution() {
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    return pathToFileURL(path.resolve(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  startEncoreServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
