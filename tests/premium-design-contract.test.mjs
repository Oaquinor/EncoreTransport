import fs from 'node:fs';
import assert from 'node:assert/strict';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    );

const entrypoints = [
  ['website', 'apps/website/index.html', 'apps/website/app.css'],
  ['driver', 'apps/driver-pwa/index.html', 'apps/driver-pwa/app.css'],
  ['admin', 'apps/admin-dashboard/index.html', 'apps/admin-dashboard/app.css'],
  ['auth', 'apps/auth/index.html', 'apps/auth/app.css'],
  ['tracking', 'apps/package-tracking/index.html', 'apps/package-tracking/app.css'],
];

for (
  const [name, htmlPath, cssPath]
  of entrypoints
) {
  const html =
    read(htmlPath);

  const css =
    read(cssPath);

  assert.match(
    html,
    /href="\.\/app\.css"/,
    `${name} must load one canonical stylesheet entrypoint.`,
  );

  assert.match(
    css,
    /packages\/shared\/premium\.css/,
    `${name} app.css must include the shared premium design system.`,
  );
}

const passengerMain =
  read(
    'apps/passenger/src/main.tsx',
  );

const passengerCss =
  read(
    'apps/passenger/src/app.css',
  );

assert.match(
  passengerMain,
  /import '\.\/app\.css';/,
);

assert.match(
  passengerCss,
  /packages\/shared\/premium\.css/,
);

assert.match(
  passengerCss,
  /premium\.css/,
);

const website =
  read(
    'apps/website/index.html',
  );

const passengerApp =
  read(
    'apps/passenger/src/passenger-app.tsx',
  );

const adminViews =
  read(
    'apps/admin-dashboard/src/views.mjs',
  );

assert.equal(
  website.includes('encore') &&
  website.includes('transport'),
  true,
);

assert.equal(
  /Laravel|framework/i.test(
    website,
  ),
  false,
);

assert.equal(
  /Laravel|framework/i.test(
    passengerApp,
  ),
  false,
);

assert.match(
  adminViews,
  /data-table-search/,
);

assert.match(
  adminViews,
  /data-sort-column/,
);

assert.match(
  adminViews,
  /data-table-prev/,
);

assert.match(
  adminViews,
  /data-table-next/,
);

console.log(
  'premium-design-contract.test.mjs: OK',
);
