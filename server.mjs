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
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const appAliases = new Map([
  ['/website', 'apps/website'],
  ['/passenger', 'apps/passenger/dist'],
  ['/driver', 'apps/driver-pwa'],
  ['/admin', 'apps/admin-dashboard'],
  ['/login', 'apps/auth'],
  ['/track-package', 'apps/package-tracking'],
]);

const publicPrefixes = new Map([
  ['/assets/', 'assets'],
  ['/packages/shared/', 'packages/shared'],
  ['/node_modules/leaflet/dist/', 'node_modules/leaflet/dist'],
]);

const publicFiles = new Map([
  ['/logo.svg', 'logo.svg'],
  ['/robots.txt', 'robots.txt'],
]);

function redirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function safeJoin(baseDirectory, relativePath) {
  let decoded;

  try {
    decoded = decodeURIComponent(relativePath);
  } catch {
    return null;
  }

  if (
    decoded.includes('\0') ||
    decoded.startsWith('/') ||
    decoded.startsWith('\\')
  ) {
    return null;
  }

  const resolved = path.resolve(baseDirectory, decoded);
  const relative = path.relative(baseDirectory, resolved);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return resolved;
}

function resolveStaticPath(rootDirectory, requestUrl) {
  const parsedUrl = new URL(requestUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const normalizedPathname =
    pathname.length > 1
      ? pathname.replace(/\/+$/, '')
      : pathname;

  for (const [aliasPath, targetDirectory] of appAliases.entries()) {
    if (normalizedPathname === aliasPath) {
      return safeJoin(
        path.join(rootDirectory, targetDirectory),
        'index.html',
      );
    }

    if (pathname.startsWith(`${aliasPath}/`)) {
      const remainingPath =
        pathname.slice(aliasPath.length + 1) || 'index.html';

      return safeJoin(
        path.join(rootDirectory, targetDirectory),
        remainingPath,
      );
    }
  }

  const publicFile = publicFiles.get(pathname);

  if (publicFile) {
    return safeJoin(rootDirectory, publicFile);
  }

  for (const [publicPrefix, targetDirectory] of publicPrefixes.entries()) {
    if (!pathname.startsWith(publicPrefix)) continue;

    return safeJoin(
      path.join(rootDirectory, targetDirectory),
      pathname.slice(publicPrefix.length),
    );
  }

  return null;
}

async function serveFile(response, filePath) {
  if (!filePath) {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end('Not found.');
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
      'Content-Type':
        mimeTypes.get(extension) ??
        'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    response.end(fileContents);
  } catch {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(
      'Not found. If this is /passenger/, run npm run build:passenger from the repository root first.',
    );
  }
}

function proxyApi(request, response, apiTarget) {
  const incomingUrl = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  const targetUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    apiTarget,
  );

  const transport =
    targetUrl.protocol === 'https:'
      ? httpsRequest
      : httpRequest;

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
      const outHeaders = {
        ...upstream.headers,
      };

      delete outHeaders['transfer-encoding'];
      delete outHeaders.connection;

      response.writeHead(
        upstream.statusCode ?? 502,
        outHeaders,
      );

      upstream.pipe(response);
    },
  );

  proxy.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, {
        'Content-Type':
          'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
    }

    response.end(
      JSON.stringify({
        message:
          'Encore Transport could not reach the Laravel API.',
      }),
    );
  });

  request.pipe(proxy);
}

export function createEncoreServer({
  rootDirectory = moduleRoot,
  apiTargetUrl =
    process.env.LARAVEL_API_URL ??
    'http://127.0.0.1:8000',
} = {}) {
  const apiTarget = new URL(apiTargetUrl);

  return createServer(
    async (request, response) => {
      const parsedUrl = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? 'localhost'}`,
      );

      if (
        parsedUrl.pathname.startsWith(
          '/api/',
        )
      ) {
        proxyApi(
          request,
          response,
          apiTarget,
        );
        return;
      }

      if (parsedUrl.pathname === '/') {
        redirect(
          response,
          '/website/',
        );
        return;
      }

      if (
        parsedUrl.pathname === '/move' ||
        parsedUrl.pathname === '/move/' ||
        parsedUrl.pathname.startsWith(
          '/move/',
        )
      ) {
        redirect(
          response,
          `/passenger/${parsedUrl.search}`,
        );
        return;
      }

      for (
        const aliasPath
        of appAliases.keys()
      ) {
        if (
          parsedUrl.pathname ===
          aliasPath
        ) {
          redirect(
            response,
            `${aliasPath}/${parsedUrl.search}`,
          );
          return;
        }
      }

      await serveFile(
        response,
        resolveStaticPath(
          rootDirectory,
          request.url ?? '/',
        ),
      );
    },
  );
}

export async function startEncoreServer({
  port = Number(
    process.env.PORT ?? 4173,
  ),
  host =
    process.env.HOST ??
    '127.0.0.1',
  rootDirectory = moduleRoot,
  apiTargetUrl =
    process.env.LARAVEL_API_URL ??
    'http://127.0.0.1:8000',
  quiet = false,
} = {}) {
  const server =
    createEncoreServer({
      rootDirectory,
      apiTargetUrl,
    });

  await new Promise(
    (resolve, reject) => {
      server.once(
        'error',
        reject,
      );

      server.listen(
        port,
        host,
        resolve,
      );
    },
  );

  const address =
    server.address();

  if (
    !address ||
    typeof address === 'string'
  ) {
    throw new Error(
      'Encore Transport server did not expose a TCP address.',
    );
  }

  if (!quiet) {
    const base =
      `http://${host}:${address.port}`;

    console.log(
      `Encore Transport running on ${base}`,
    );
    console.log(
      `Website:   ${base}/website/`,
    );
    console.log(
      `Passenger: ${base}/passenger/`,
    );
    console.log(
      `Driver:    ${base}/driver/`,
    );
    console.log(
      `Admin:     ${base}/admin/`,
    );
    console.log(
      `Login:     ${base}/login/`,
    );
    console.log(
      `Tracking:  ${base}/track-package/`,
    );
    console.log(
      `API proxy: ${new URL(apiTargetUrl).origin}/api/*`,
    );
  }

  return {
    server,
    host,
    port: address.port,
  };
}

function isDirectExecution() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  try {
    return (
      pathToFileURL(
        path.resolve(entry),
      ).href === import.meta.url
    );
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  startEncoreServer().catch(
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
