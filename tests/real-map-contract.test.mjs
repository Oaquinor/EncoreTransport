import fs from 'node:fs';
import assert from 'node:assert/strict';

const website = fs.readFileSync('apps/website/index.html', 'utf8');
const websiteApp = fs.readFileSync('apps/website/app.mjs', 'utf8');
const sharedMap = fs.readFileSync('packages/shared/real-map.mjs', 'utf8');
const routes = fs.readFileSync('backend/laravel/routes/api.php', 'utf8');

assert.equal(
  website.includes('class="route-svg"'),
  false,
  'Website must not present the old decorative SVG route as a real map.',
);

assert.equal(
  website.includes('id="routeMapCanvas"'),
  true,
  'Website must expose a real interactive map container.',
);

assert.equal(
  websiteApp.includes('renderJourneyMap'),
  true,
  'Website must render the map through the shared map component.',
);

assert.equal(
  sharedMap.includes('/api/v1/maps/tiles/{z}/{x}/{y}.png'),
  true,
  'Shared map must use the Laravel TomTom tile proxy.',
);

assert.equal(
  routes.includes("Route::prefix('maps')") &&
    routes.includes("tiles/{z}/{x}/{y}.png"),
  true,
  'Laravel must expose the tile proxy route under /api/v1/maps.',
);

console.log('real-map-contract.test.mjs: OK');
