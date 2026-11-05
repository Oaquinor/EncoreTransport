import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const website =
  read('apps/website/index.html');
const passenger =
  read('apps/passenger/index.html');
const driver =
  read('apps/driver-pwa/index.html');
const admin =
  read('apps/admin-dashboard/index.html');
const login =
  read('apps/auth/index.html');
const tracking =
  read('apps/package-tracking/index.html');
const robots =
  read('robots.txt');
const sitemap =
  read('sitemap.xml');
const server =
  read('server.mjs');

assert.match(
  website,
  /<title>Travel and parcels \| Encore Transport<\/title>/,
);

assert.match(
  website,
  /name="description"/,
);

assert.match(
  website,
  /name="robots" content="index,follow,max-image-preview:large"/,
);

assert.match(
  website,
  /property="og:title"/,
);

assert.match(
  website,
  /name="description" content="Plan your next trip, explore published routes and follow your parcel/,
);

assert.match(
  website,
  /name="twitter:title"/,
);

assert.match(
  website,
  /"@type":"Organization"/,
);

assert.match(
  website,
  /href="\/website\/trips\/"/,
  'The homepage must preserve a direct path to trip and seat selection.',
);

for (
  const [name, html]
  of [
    ['Passenger', passenger],
    ['Driver', driver],
    ['Admin', admin],
    ['Login', login],
  ]
) {
  assert.match(
    html,
    /name="robots" content="noindex,nofollow,noarchive"/,
    `${name} must not be indexed.`,
  );

  assert.match(
    html,
    /name="description"/,
    `${name} must still have a useful description.`,
  );
}

assert.match(
  tracking,
  /name="robots" content="index,follow"/,
);

assert.match(
  tracking,
  /name="twitter:title"/,
);

assert.match(
  robots,
  /Allow: \/website\//,
);

assert.match(
  robots,
  /Allow: \/track-package\//,
);

assert.match(
  robots,
  /Sitemap: https:\/\/encoretransport\.online\/sitemap\.xml/,
);

assert.match(
  sitemap,
  /<loc>https:\/\/encoretransport\.online\/website\/<\/loc>/,
);

assert.match(
  sitemap,
  /hreflang="es" href="https:\/\/encoretransport\.online\/website\/\?lang=es"/,
);

for (
  const privatePath
  of [
    '/passenger/',
    '/driver/',
    '/admin/',
    '/login/',
    '/api/',
  ]
) {
  assert.match(
    robots,
    new RegExp(
      `Disallow: ${privatePath.replaceAll('/', '\\/')}`,
    ),
  );
}

assert.match(
  server,
  /x-robots-tag/,
  'API proxy responses must carry an X-Robots-Tag.',
);

console.log(
  'seo-contract.test.mjs: OK',
);
