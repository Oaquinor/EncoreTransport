import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = {
  website: 'apps/website/site-shell.mjs',
  passenger: 'apps/passenger/src/passenger-app.tsx',
  admin: 'apps/admin-dashboard/app.mjs',
  driver: 'apps/driver-pwa/app.mjs',
};

for (const [surface, file] of Object.entries(files)) {
  const source = await readFile(file, 'utf8');
  assert.match(source, /encore-loader\.gif/, `${surface} must use the Encore branded loader`);
}

const passenger = await readFile(files.passenger, 'utf8');
const admin = await readFile(files.admin, 'utf8');
assert.doesNotMatch(passenger, /passenger-boot-screen__spinner/, 'Passenger must not regress to the generic boot spinner');
assert.doesNotMatch(admin, /admin-loading-state__spinner/, 'Admin must not regress to the generic boot spinner');
assert.match(passenger, /role="status" aria-live="polite"/, 'Passenger boot state must remain announced to assistive technology');
assert.match(admin, /admin-loading-state[^>]*aria-live="polite"/, 'Admin boot state must remain announced to assistive technology');

console.log('brand-loader-contract.test.mjs: OK — branded startup loader is shared across public and operational surfaces');
