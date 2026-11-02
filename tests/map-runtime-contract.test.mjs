import fs from 'node:fs';
import assert from 'node:assert/strict';

const realMap = fs.readFileSync('packages/shared/real-map.mjs', 'utf8');
const websiteApp = fs.readFileSync('apps/website/app.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const envExample = fs.readFileSync('backend/laravel/.env.example', 'utf8');
const mapService = fs.readFileSync(
  'backend/laravel/app/Services/Maps/TomTomMapService.php',
  'utf8',
);
const mapController = fs.readFileSync(
  'backend/laravel/app/Http/Controllers/Api/V1/MapController.php',
  'utf8',
);
const mapConfig = fs.readFileSync('backend/laravel/config/maps.php', 'utf8');

assert.equal(
  packageJson.dependencies?.leaflet,
  '1.9.4',
  'Leaflet must be available locally instead of relying only on an external CDN.',
);

assert.match(
  realMap,
  /\/vendor\/leaflet\/leaflet\.js/,
  'Web maps must try the local Leaflet installation first.',
);

assert.match(
  realMap,
  /probeTileProxy/,
  'The browser map must verify the backend tile proxy before reporting the map as ready.',
);

assert.match(
  realMap,
  /tileerror/,
  'Leaflet tile failures must be observed instead of producing a silent blank map.',
);

assert.match(
  realMap,
  /appConfig\.apiBaseUrl/,
  'Map tile requests must use the shared API base URL.',
);

assert.match(
  envExample,
  /TOMTOM_DISPLAY_BASE_URL=/,
  'The map display configuration must be documented.',
);

assert.match(
  mapService,
  /TomTom-Api-Version/,
  'TomTom Map Display requests must include the API version header.',
);

assert.match(mapService, /Cache::store[\s\S]*->get\(\$cacheKey\)/, 'TomTom tiles must be read from a bounded server cache.');
assert.match(mapService, /cacheTtl\(/, 'Tile cache TTL must be derived from upstream cache directives.');
assert.match(mapConfig, /TOMTOM_TILE_CACHE_MAX_TTL/, 'Tile cache must have an explicit maximum lifetime.');
assert.match(mapController, /matchesEtag/, 'The tile proxy must support conditional ETag responses.');
assert.match(mapController, /X-Map-Cache/, 'The tile proxy must expose cache evidence for measurements.');
assert.match(mapController, /Server-Timing/, 'The tile proxy must expose upstream timing evidence.');

assert.doesNotMatch(
  realMap,
  /TOMTOM_API_KEY/,
  'The browser renderer must not reference TOMTOM_API_KEY.',
);

assert.match(
  realMap,
  /liveMapRequests/,
  'Overlapping live-network renders must not initialize or paint the same map out of order.',
);
assert.match(realMap, /__ENCORE_MAP_METRICS__/, 'Browser maps must expose measurable runtime metrics.');
assert.match(realMap, /firstImageMs/, 'Browser maps must measure first tile image timing.');
assert.match(realMap, /lastRouteViewKey/, 'Live maps must not refit the viewport for every moving GPS position.');
assert.match(realMap, /sampleAt/, 'Live marker animation must use real GPS sample timestamps.');
assert.doesNotMatch(realMap, /const duration = 900/, 'Live marker animation must not use a fixed 900ms duration.');

assert.match(
  websiteApp,
  /renderLiveNetworkMap\(routeMapCanvas,[\s\S]*?\.catch\(/,
  'Map initialization failures must result in a visible fallback instead of an empty panel.',
);

console.log('map-runtime-contract.test.mjs: OK');
