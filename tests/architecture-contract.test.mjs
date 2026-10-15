import fs from 'node:fs';
import assert from 'node:assert/strict';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    );

const htmlEntryPoints = [
  'apps/website/index.html',
  'apps/driver-pwa/index.html',
  'apps/admin-dashboard/index.html',
  'apps/auth/index.html',
  'apps/package-tracking/index.html',
];

for (
  const file
  of htmlEntryPoints
) {
  const source =
    read(file);

  assert.match(
    source,
    /href="\.\/app\.css"/,
    `${file} must use one canonical stylesheet.`,
  );

  assert.equal(
    (
      source.match(
        /rel="stylesheet"/g,
      ) ?? []
    ).length,
    1,
    `${file} must not stack multiple stylesheet links.`,
  );
}

const passengerMain =
  read(
    'apps/passenger/src/main.tsx',
  );

assert.match(
  passengerMain,
  /import '\.\/app\.css';/,
);

assert.equal(
  (
    passengerMain.match(
      /\.css';/g,
    ) ?? []
  ).length,
  1,
  'Passenger must import one CSS entrypoint.',
);

const server =
  read('server.mjs');

for (
  const route
  of [
    '/website',
    '/passenger',
    '/driver',
    '/admin',
    '/login',
    '/track-package',
  ]
) {
  assert.equal(
    server.includes(
      `['${route}'`,
    ),
    true,
    `server.mjs must expose ${route}.`,
  );
}

const productionFiles = [
  'apps/website/app.mjs',
  'apps/passenger/src/passenger-app.tsx',
  'apps/driver-pwa/app.mjs',
  'apps/admin-dashboard/app.mjs',
  'apps/auth/app.mjs',
  'apps/package-tracking/app.mjs',
];

for (
  const file
  of productionFiles
) {
  assert.doesNotMatch(
    read(file),
    /mock-data\.mjs/,
    `${file} must not import mock-data.mjs.`,
  );
}

console.log(
  'architecture-contract.test.mjs: OK',
);
