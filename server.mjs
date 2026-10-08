import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const apiTarget = new URL(process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000');

const mimeTypes = new Map([
  ['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],
  ['.mjs','text/javascript; charset=utf-8'],['.json','application/json; charset=utf-8'],['.webmanifest','application/manifest+json; charset=utf-8'],
  ['.svg','image/svg+xml'],['.ico','image/x-icon'],['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.woff2','font/woff2']
]);

const appAliases = new Map([
  ['/website','/apps/website'],['/move','/apps/passenger-pwa'],['/passenger','/apps/passenger/dist'],['/driver','/apps/driver-pwa'],['/admin','/apps/admin-dashboard']
]);

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://localhost:${port}`);
  const normalizedPathname = parsedUrl.pathname.replace(/\/$/, '');
  for (const [aliasPath,targetPath] of appAliases.entries()) {
    if (normalizedPathname === aliasPath) return path.join(rootDirectory,targetPath,'index.html');
    if (normalizedPathname.startsWith(`${aliasPath}/`)) {
      const remainingPath = normalizedPathname.slice(aliasPath.length + 1);
      return path.normalize(path.join(rootDirectory,targetPath,remainingPath));
    }
  }
  if (parsedUrl.pathname === '/') return path.join(rootDirectory,'apps/website/index.html');
  const candidatePath = path.normalize(path.join(rootDirectory, parsedUrl.pathname));
  if (!candidatePath.startsWith(rootDirectory)) return null;
  return candidatePath;
}

async function serveFile(response,filePath) {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) return serveFile(response,path.join(filePath,'index.html'));
    const extension = path.extname(filePath).toLowerCase();
    const fileContents = await readFile(filePath);
    response.writeHead(200, {'Content-Type': mimeTypes.get(extension) ?? 'application/octet-stream','Cache-Control':'no-store'});
    response.end(fileContents);
  } catch {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    response.end('Not found. If this is /passenger, run npm run build:passenger first.');
  }
}

function proxyApi(request,response) {
  const incomingUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, apiTarget);
  const transport = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = {...request.headers, host: targetUrl.host};
  delete headers['content-length'];

  const proxy = transport(targetUrl, {method: request.method, headers}, (upstream) => {
    const outHeaders = {...upstream.headers};
    delete outHeaders['transfer-encoding'];
    response.writeHead(upstream.statusCode ?? 502, outHeaders);
    upstream.pipe(response);
  });
  proxy.on('error', (error) => {
    if (!response.headersSent) response.writeHead(502, {'Content-Type':'application/json; charset=utf-8'});
    response.end(JSON.stringify({message:'Laravel API is unavailable.', detail:error.message}));
  });
  request.pipe(proxy);
}

createServer(async (request,response) => {
  const parsedUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (parsedUrl.pathname.startsWith('/api/')) return proxyApi(request,response);
  const requestPath = resolveRequestPath(request.url ?? '/');
  if (!requestPath) {
    response.writeHead(400, {'Content-Type':'text/plain; charset=utf-8'});
    response.end('Bad request');
    return;
  }
  await serveFile(response,requestPath);
}).listen(port,host,() => {
  console.log(`Encore Transport running on http://${host}:${port}`);
  console.log(`Website:   http://${host}:${port}/website/`);
  console.log(`Passenger: http://${host}:${port}/passenger/`);
  console.log(`Driver:    http://${host}:${port}/driver/`);
  console.log(`Admin:     http://${host}:${port}/admin/`);
  console.log(`API proxy: ${apiTarget.origin}/api/*`);
});
