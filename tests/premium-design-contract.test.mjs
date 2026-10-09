import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');

const website = read('apps/website/index.html');
const passengerMain = read('apps/passenger/src/main.tsx');
const passengerApp = read('apps/passenger/src/passenger-app.tsx');
const driver = read('apps/driver-pwa/index.html');
const admin = read('apps/admin-dashboard/index.html');
const auth = read('apps/auth/index.html');
const tracking = read('apps/package-tracking/index.html');
const adminViews = read('apps/admin-dashboard/src/views.mjs');

for (const [name, source] of [
  ['website', website],
  ['driver', driver],
  ['admin', admin],
  ['auth', auth],
  ['tracking', tracking],
]) {
  assert.equal(
    source.includes('packages/shared/premium.css'),
    true,
    `${name} must load the shared premium design system`,
  );
}

assert.equal(
  passengerMain.includes("import '../../../packages/shared/premium.css';"),
  true,
  'Passenger must load the shared premium design system',
);

assert.equal(
  passengerMain.includes("import './premium.css';"),
  true,
  'Passenger must load its premium application styles',
);

assert.equal(
  website.includes('encore') && website.includes('transport'),
  true,
  'Website must display the Encore Transport lockup',
);

assert.equal(
  /Laravel|framework/i.test(website),
  false,
  'Website customer copy must not expose technical framework/API details',
);

assert.equal(
  /Laravel|framework/i.test(passengerApp),
  false,
  'Passenger customer copy must not expose technical framework/API details',
);

assert.equal(
  adminViews.includes('data-table-search'),
  true,
  'Admin tables must expose a real search control',
);

assert.equal(
  adminViews.includes('data-sort-column'),
  true,
  'Admin tables must expose sortable headers',
);

assert.equal(
  adminViews.includes('data-table-prev') && adminViews.includes('data-table-next'),
  true,
  'Admin tables must expose pagination controls',
);

console.log('premium-design-contract.test.mjs: OK');
