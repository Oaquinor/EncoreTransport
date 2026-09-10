import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = process.cwd();
const port = Number(process.env.PORT ?? 4173);
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
  ['.woff2', 'font/woff2']
]);

const appAliases = new Map([
  ['/website', '/apps/website'],
  ['/move', '/apps/passenger-pwa'],
  ['/passenger', '/apps/passenger-pwa'],
  ['/driver', '/apps/driver-pwa'],
  ['/admin', '/apps/admin-dashboard']
]);

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://localhost:${port}`);
  const normalizedPathname = parsedUrl.pathname.replace(/\/$/, '');

  for (const [aliasPath, targetPath] of appAliases.entries()) {
    if (normalizedPathname === aliasPath) {
      return path.join(rootDirectory, targetPath, 'index.html');
    }

    if (normalizedPathname.startsWith(`${aliasPath}/`)) {
      const remainingPath = normalizedPathname.slice(aliasPath.length + 1);
      return path.normalize(path.join(rootDirectory, targetPath, remainingPath));
    }
  }

  const pathname = parsedUrl.pathname;

  if (pathname === '/') {
    return path.join(rootDirectory, 'index.html');
  }

  const candidatePath = path.normalize(path.join(rootDirectory, pathname));
  if (!candidatePath.startsWith(rootDirectory)) {
    return null;
  }

  return candidatePath;
}

async function serveFile(response, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      return serveFile(response, path.join(filePath, 'index.html'));
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes.get(extension) ?? 'application/octet-stream';
    const fileContents = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    response.end(fileContents);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

createServer(async (request, response) => {
  const requestPath = resolveRequestPath(request.url ?? '/');
  if (!requestPath) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  await serveFile(response, requestPath);
}).listen(port, () => {
  console.log(`Encore Transport preview running on http://localhost:${port}`);
});