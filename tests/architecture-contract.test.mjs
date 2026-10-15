import assert from 'node:assert/strict';
import fs from 'node:fs';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    );

for (
  const file
  of [
    'packages/shared/api/core.mjs',
    'packages/shared/api/auth.mjs',
    'packages/shared/api/public.mjs',
    'packages/shared/api/bookings.mjs',
    'packages/shared/api/driver.mjs',
    'packages/shared/api/admin.mjs',
  ]
) {
  assert.equal(
    fs.existsSync(file),
    true,
    `${file} must exist`,
  );
}

const facade =
  read(
    'packages/shared/api.mjs',
  );

assert.match(
  facade,
  /Stable API facade/,
);

assert.ok(
  facade.split(/\r?\n/).length < 100,
  'Shared API facade must stay small.',
);

const ui =
  read(
    'packages/shared/ui.mjs',
  );

for (
  const helper
  of [
    'renderStatusBadge',
    'renderMetricCard',
    'renderEmptyState',
    'renderSkeletonCard',
    'renderProgressBar',
  ]
) {
  assert.match(
    ui,
    new RegExp(
      `function ${helper}`,
    ),
  );
}

const entrypoints = [
  [
    'apps/website/index.html',
    './app.css',
  ],
  [
    'apps/driver-pwa/index.html',
    './app.css',
  ],
  [
    'apps/admin-dashboard/index.html',
    './app.css',
  ],
  [
    'apps/auth/index.html',
    './app.css',
  ],
  [
    'apps/package-tracking/index.html',
    './app.css',
  ],
];

for (
  const [file, expected]
  of entrypoints
) {
  const content =
    read(file);

  assert.match(
    content,
    new RegExp(
      expected.replace(
        '.',
        '\\.',
      ),
    ),
    `${file} must load the canonical stylesheet entrypoint.`,
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

const productionFiles = [
  'apps/website/app.mjs',
  'apps/passenger/src/passenger-app.tsx',
  'apps/driver-pwa/app.mjs',
  'apps/admin-dashboard/app.mjs',
  'apps/auth/app.mjs',
  'apps/package-tracking/app.mjs',
];

for (const file of productionFiles) {
  const content = read(file);

  assert.doesNotMatch(
    content,
    /mock-data\.mjs/,
    `${file} must not import mock data.`,
  );
}

const legacyPassenger =
  read(
    'apps/passenger-pwa/index.html',
  );

assert.match(
  legacyPassenger,
  /\/passenger\//,
);

console.log(
  'architecture-contract.test.mjs: OK',
);
