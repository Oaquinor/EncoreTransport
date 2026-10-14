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
const server =
  read('server.mjs');
const vector =
  read('apps/website/seat-layout-preview.svg');

assert.match(
  website,
  /<title>Encore Transport \| Bus Routes, Trips & Seat Selection<\/title>/,
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
  /name="twitter:title"/,
);

assert.match(
  website,
  /"@type": "FAQPage"/,
);

assert.match(
  website,
  /seat-layout-preview\.svg/,
  'Homepage seat section must use the responsive vector seat preview.',
);

assert.doesNotMatch(
  website.match(
    /<section class="public-section public-seat-section"[\s\S]*?<\/section>/,
  )?.[0] ?? '',
  /\/assets\/media\/Autobus\.png/,
  'Homepage seat section must not use the bus photo.',
);

assert.match(
  vector,
  /viewBox="0 0 980 330"/,
);

assert.match(
  vector,
  />55<\/text>/,
  'Vector preview must include the rear seat numbering.',
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
