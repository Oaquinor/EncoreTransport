import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const controller = await readFile(
  'backend/laravel/app/Http/Controllers/Api/V1/PackageController.php',
  'utf8',
);
const driverApi = await readFile('packages/shared/api/driver.mjs', 'utf8');
const tracking = controller.slice(
  controller.indexOf('public function track'),
  controller.indexOf('public function index'),
);

assert.match(controller, /DB::transaction\(/, 'Package writes must be transactional.');
assert.match(controller, /lockForUpdate\(\)/, 'Package status changes must serialize concurrent retries.');
assert.match(controller, /store\('package-deliveries', 'local'\)/, 'Delivery evidence must stay on private storage.');
assert.match(controller, /recipient_verified/, 'Delivery must require recipient verification.');
assert.match(controller, /delivery_photo/, 'Delivery must require photographic evidence.');
assert.match(tracking, /last_updated_at/, 'Public tracking must expose a current update timestamp.');
assert.match(tracking, /next_action/, 'Public tracking must tell the customer what happens next.');
assert.doesNotMatch(tracking, /recipient_phone|recipient_email/, 'Public tracking must not expose contact data.');
assert.match(driverApi, /new FormData\(\)/, 'Driver status API must support multipart delivery evidence.');

console.log('package-custody-contract.test.mjs: OK');
