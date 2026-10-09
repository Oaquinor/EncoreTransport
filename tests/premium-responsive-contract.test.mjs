import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = [
  'packages/shared/premium.css',
  'apps/website/premium.css',
  'apps/passenger/src/premium.css',
  'apps/driver-pwa/premium.css',
  'apps/admin-dashboard/premium.css',
  'apps/auth/premium.css',
  'apps/package-tracking/premium.css',
];

for (const path of files) {
  const source = fs.readFileSync(path, 'utf8');

  assert.match(
    source,
    /@media\s*\(max-width:/,
    `${path} must contain responsive rules`,
  );
}

const website = fs.readFileSync('apps/website/premium.css', 'utf8');
assert.equal(
  website.includes('overflow: hidden') || website.includes('overflow:hidden'),
  true,
  'Website must explicitly manage large visual overflow',
);

const admin = fs.readFileSync('apps/admin-dashboard/premium.css', 'utf8');
assert.equal(
  admin.includes('.table-wrap') || admin.includes('premium-table'),
  true,
  'Admin premium CSS must account for table behavior',
);

console.log('premium-responsive-contract.test.mjs: OK');
