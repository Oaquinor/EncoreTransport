import fs from 'node:fs';
import assert from 'node:assert/strict';

const website = fs.readFileSync(
  'apps/website/index.html',
  'utf8',
);

const websiteApp = fs.readFileSync(
  'apps/website/app.mjs',
  'utf8',
);

const sharedMap = fs.readFileSync(
  'packages/shared/real-map.mjs',
  'utf8',
);

const routes = fs.readFileSync(
  'backend/laravel/routes/api.php',
  'utf8',
);

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

/*
 * The shared browser client receives appConfig.apiBaseUrl = /api/v1
 * by default and appends /maps/tiles/... itself.
 *
 * Therefore the runtime request is:
 *
 *   /api/v1/maps/tiles/{z}/{x}/{y}.png
 *
 * The old assertion incorrectly expected that fully composed URL to
 * exist as one literal string in real-map.mjs. That contradicts the
 * shared API configuration used by the application.
 */
assert.equal(
  sharedMap.includes('appConfig.apiBaseUrl'),
  true,
  'Shared map must use the centralized API base URL.',
);

assert.equal(
  sharedMap.includes(
    '/maps/tiles/{z}/{x}/{y}.png',
  ),
  true,
  'Shared map must request tiles through the Laravel maps tile endpoint.',
);

assert.equal(
  sharedMap.includes('TOMTOM_API_KEY'),
  false,
  'Shared map must not expose the TomTom API key in browser code.',
);

assert.equal(
  routes.includes(
    "Route::prefix('maps')",
  ) &&
    routes.includes(
      "tiles/{z}/{x}/{y}.png",
    ),
  true,
  'Laravel must expose the tile proxy route under /api/v1/maps.',
);

console.log(
  'real-map-contract.test.mjs: OK',
);
