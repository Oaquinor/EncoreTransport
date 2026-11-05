import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getPageKey, pageSeo } from './apps/website/locale-data.mjs';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const gzipAsync = promisify(gzip);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.woff2', 'font/woff2'],
]);

const appAliases = new Map([
  ['/website', 'apps/website'],
  ['/passenger', 'apps/passenger/dist'],
  ['/driver', 'apps/driver-pwa'],
  ['/admin', 'apps/admin-dashboard'],
  ['/login', 'apps/auth'],
  ['/track-package', 'apps/package-tracking'],
  ['/package-register', 'apps/package-register'],
]);

const publicRoots = ['assets', 'packages/shared'];
const publicFiles = new Set(['/logo.svg', '/robots.txt', '/sitemap.xml']);
const vendorFiles = new Map([
  ['/vendor/leaflet/leaflet.css', 'node_modules/leaflet/dist/leaflet.css'],
  ['/vendor/leaflet/leaflet.js', 'node_modules/leaflet/dist/leaflet.js'],
]);

function redirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function safeJoin(rootDirectory, relativePath) {
  const absoluteRoot = path.resolve(rootDirectory);
  const candidate = path.resolve(absoluteRoot, relativePath);
  const relative = path.relative(absoluteRoot, candidate);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return candidate;
}

function resolveAliasedPath(rootDirectory, pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  for (const [alias, target] of appAliases) {
    if (normalized === alias) {
      return safeJoin(rootDirectory, `${target}/index.html`);
    }

    if (normalized.startsWith(`${alias}/`)) {
      const remaining = normalized.slice(alias.length + 1);
      return safeJoin(rootDirectory, `${target}/${remaining}`);
    }
  }

  return null;
}

function resolvePublicPath(rootDirectory, pathname) {
  if (publicFiles.has(pathname)) {
    return safeJoin(rootDirectory, pathname.slice(1));
  }

  for (const publicRoot of publicRoots) {
    const prefix = `/${publicRoot}/`;
    if (pathname.startsWith(prefix)) {
      return safeJoin(rootDirectory, pathname.slice(1));
    }
  }

  return null;
}

function resolveVendorPath(rootDirectory, pathname) {
  const relativePath = vendorFiles.get(pathname);
  return relativePath ? safeJoin(rootDirectory, relativePath) : null;
}

function normalizePublicSiteUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return '';
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function applyPublicSeoOrigin(filePath, contents, publicSiteUrl, request) {
  if (!filePath.includes(path.join('apps', 'website'))) return contents;
  const source = contents.toString('utf8');
  const normalized = filePath.split(path.sep).join('/');
  const websiteRelative = normalized.split('/apps/website/').at(-1) ?? 'index.html';
  const pagePath = websiteRelative === 'index.html' ? '/website/' : `/website/${websiteRelative.replace(/\/index\.html$/, '/')}`;
  const requestedLocale = new URL(request?.url ?? '/', 'http://encore.local').searchParams.get('lang') === 'es' ? 'es' : 'en';
  const seo = pageSeo(getPageKey(pagePath), requestedLocale);
  const localizedPath = requestedLocale === 'es' ? `${pagePath}?lang=es` : pagePath;
  const absolute = publicSiteUrl ? `${publicSiteUrl}${localizedPath}` : localizedPath;
  const enUrl = publicSiteUrl ? `${publicSiteUrl}${pagePath}` : pagePath;
  const esUrl = publicSiteUrl ? `${publicSiteUrl}${pagePath}?lang=es` : `${pagePath}?lang=es`;
  let rewritten = source
    .replace(/(<html[^>]*\blang=")[^"]*/i, `$1${requestedLocale}`)
    .replace(/(<title>)[\s\S]*?(<\/title>)/i, `$1${seo.title}$2`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*/i, `$1${seo.description}`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*/i, `$1${seo.title}`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*/i, `$1${seo.description}`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*/i, `$1${seo.title}`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*/i, `$1${seo.description}`)
    .replace(/(rel="canonical"\s+href=")[^"]*/i, `$1${absolute}`)
    .replace(/(property="og:url"\s+content=")[^"]*/i, `$1${absolute}`);
  const socialMeta = `<meta property="og:site_name" content="Encore Transport" /><meta property="og:title" content="${seo.title}" /><meta property="og:description" content="${seo.description}" /><meta property="og:type" content="website" /><meta property="og:url" content="${absolute}" /><meta name="twitter:card" content="summary" /><meta name="twitter:title" content="${seo.title}" /><meta name="twitter:description" content="${seo.description}" />`;
  if (!/property="og:title"/i.test(rewritten)) rewritten = rewritten.replace(/<\/head>/i, `${socialMeta}</head>`);
  if (!/rel="alternate"\s+hreflang="en"/i.test(rewritten)) {
    const alternates = `<link rel="alternate" hreflang="en" href="${enUrl}" /><link rel="alternate" hreflang="es" href="${esUrl}" /><link rel="alternate" hreflang="x-default" href="${enUrl}" />`;
    rewritten = rewritten.includes('<link rel="icon"')
      ? rewritten.replace(/<link rel="icon"/i, `${alternates}<link rel="icon"`)
      : rewritten.replace(/<\/head>/i, `${alternates}</head>`);
  }
  return Buffer.from(rewritten, 'utf8');
}

async function serveFile(response, filePath, request, publicSiteUrl = '') {
  if (!filePath) {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end('Not found.');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      return serveFile(response, path.join(filePath, 'index.html'), request, publicSiteUrl);
    }

    const extension = path.extname(filePath).toLowerCase();
    const fileContents = applyPublicSeoOrigin(filePath, await readFile(filePath), publicSiteUrl, request);
    const etag = `"${createHash('sha1').update(fileContents).digest('hex')}"`;
    if (request?.headers?.['if-none-match'] === etag) {
      response.writeHead(304, { ETag: etag });
      response.end();
      return;
    }
    const isHtml = extension === '.html';
    const isCompressible = /^(text\/|application\/(javascript|json|manifest\+json))/.test(mimeTypes.get(extension) ?? '');
    const production = process.env.NODE_ENV === 'production';
    const acceptsGzip = String(request?.headers?.['accept-encoding'] ?? '').includes('gzip');
    const body = production && acceptsGzip && isCompressible
      ? await gzipAsync(fileContents)
      : fileContents;

    const revalidateAsset = ['.css', '.js', '.mjs'].includes(extension);
    const headers = {
      'Content-Type': mimeTypes.get(extension) ?? 'application/octet-stream',
      'Cache-Control': isHtml
        ? 'no-cache'
        : (revalidateAsset
          ? 'public, max-age=0, must-revalidate'
          : (production ? 'public, max-age=86400' : 'no-cache')),
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), payment=(), usb=()',
    };
    if (body !== fileContents) {
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    response.writeHead(200, headers);
    response.end(body);
  } catch {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end('Not found.');
  }
}

function proxyApi(request, response, apiTarget) {
  const incomingUrl = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, apiTarget);
  const transport = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = { ...request.headers, host: targetUrl.host };
  delete headers['content-length'];

  const proxy = transport(
    targetUrl,
    { method: request.method, headers },
    (upstream) => {
      const outHeaders = { ...upstream.headers };
      delete outHeaders.connection;
      outHeaders['x-robots-tag'] = 'noindex, nofollow, noarchive';
      outHeaders['x-content-type-options'] = 'nosniff';
      outHeaders['x-frame-options'] = 'DENY';
      outHeaders['referrer-policy'] = 'strict-origin-when-cross-origin';
      outHeaders['permissions-policy'] = 'camera=(), microphone=(), payment=(), usb=()';
      response.writeHead(upstream.statusCode ?? 502, outHeaders);
      upstream.pipe(response);
    },
  );

  const timeoutId = setTimeout(() => {
    proxy.destroy(new Error('API upstream timeout'));
  }, 15000);

  proxy.on('response', () => clearTimeout(timeoutId));

  proxy.on('error', () => {
    clearTimeout(timeoutId);
    if (!response.headersSent) {
      response.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      });
    }
    response.end(JSON.stringify({
      message: 'Encore Transport is temporarily unable to reach the API.',
    }));
  });

  request.pipe(proxy);
}

export function createEncoreServer({
  rootDirectory = moduleDirectory,
  apiTargetUrl = process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000',
  publicSiteUrl = normalizePublicSiteUrl(process.env.PUBLIC_SITE_URL),
} = {}) {
  const apiTarget = new URL(apiTargetUrl);

  return createServer(async (request, response) => {
    const parsedUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? 'localhost'}`,
    );

    if (parsedUrl.pathname.startsWith('/api/')) {
      proxyApi(request, response, apiTarget);
      return;
    }

    // Laravel's public disk is exposed through the same origin as the apps.
    // Without this proxy, /storage/* is incorrectly resolved by the frontend
    // server and every uploaded CMS/profile image appears broken in local dev.
    if (parsedUrl.pathname.startsWith('/storage/')) {
      proxyApi(request, response, apiTarget);
      return;
    }

    if (parsedUrl.pathname === '/') {
      redirect(response, '/website/');
      return;
    }

    if (
      parsedUrl.pathname === '/move' ||
      parsedUrl.pathname === '/move/' ||
      parsedUrl.pathname.startsWith('/move/')
    ) {
      redirect(response, `/passenger/${parsedUrl.search}`);
      return;
    }

    for (const alias of appAliases.keys()) {
      if (parsedUrl.pathname === alias) {
        redirect(response, `${alias}/${parsedUrl.search}`);
        return;
      }
    }

    const requestPath =
      resolveAliasedPath(rootDirectory, parsedUrl.pathname) ??
      resolveVendorPath(rootDirectory, parsedUrl.pathname) ??
      resolvePublicPath(rootDirectory, parsedUrl.pathname);

    await serveFile(response, requestPath, request, publicSiteUrl);
  });
}

export async function startEncoreServer({
  port = Number(process.env.PORT ?? 4173),
  host = process.env.HOST ?? '127.0.0.1',
  rootDirectory = moduleDirectory,
  apiTargetUrl = process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000',
  publicSiteUrl = process.env.PUBLIC_SITE_URL,
  quiet = false,
} = {}) {
  const server = createEncoreServer({ rootDirectory, apiTargetUrl, publicSiteUrl });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  if (!quiet) {
    console.log(`Encore Transport running on http://${host}:${actualPort}`);
    console.log(`Website:   http://${host}:${actualPort}/website/`);
    console.log(`Passenger: http://${host}:${actualPort}/passenger/`);
    console.log(`Driver:    http://${host}:${actualPort}/driver/`);
    console.log(`Admin:     http://${host}:${actualPort}/admin/`);
    console.log(`Login:     http://${host}:${actualPort}/login/`);
    console.log(`Tracking:  http://${host}:${actualPort}/track-package/`);
    console.log(`Packages:  http://${host}:${actualPort}/package-register/`);
    console.log(`API proxy: ${apiTargetUrl}/api/*`);
  }

  return { server, host, port: actualPort };
}

const directExecution =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (directExecution) {
  await startEncoreServer();
}
