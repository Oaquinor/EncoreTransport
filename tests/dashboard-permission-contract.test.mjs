import assert from 'node:assert/strict';
import fs from 'node:fs';

const controller = fs.readFileSync(
  'backend/laravel/app/Http/Controllers/Api/V1/AdminDashboardController.php',
  'utf8',
);
const view = fs.readFileSync('apps/admin-dashboard/src/views.mjs', 'utf8');
const routes = fs.readFileSync('backend/laravel/routes/api.php', 'utf8');
const driverControllers = [
  'DriverLocationController.php',
  'DriverTripController.php',
  'IncidentController.php',
  'PackageController.php',
  'VehicleStatusController.php',
].map((file) => fs.readFileSync(`backend/laravel/app/Http/Controllers/Api/V1/${file}`, 'utf8')).join('\n');

assert.match(controller, /PermissionService/);
assert.match(controller, /\$canTrips\s*=\s*\$can\('trips\.view'\)/);
assert.match(controller, /\$canBookings\s*=\s*\$can\('bookings\.view'\)/);
assert.match(controller, /\$canPayments\s*=\s*\$can\('payments\.view'\)/);
assert.match(controller, /'capabilities'\s*=>/);
assert.match(controller, /if \(\$canTrips\) \$data\['trips'\]/);
assert.match(controller, /if \(\$canPayments\)\s*\{[\s\S]*?\$metrics\['revenue'\]/);
assert.doesNotMatch(controller, /Trip::query\(\)->with\(\['route','bus','driver'\]\)/);
assert.match(view, /const capabilities = data\.capabilities/);
assert.match(view, /capabilities\.trips \?/);
assert.doesNotMatch(routes, /api\.token:driver,admin/);
assert.doesNotMatch(driverControllers, /role\s*[=!]==?\s*['"]admin['"]/);

console.log('dashboard-permission-contract.test.mjs: OK');
