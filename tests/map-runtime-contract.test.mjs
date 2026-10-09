import fs from 'node:fs';
import assert from 'node:assert/strict';

const realMap = fs.readFileSync('packages/shared/real-map.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const envExample = fs.readFileSync('backend/laravel/.env.example', 'utf8');
const mapService = fs.readFileSync(
  'backend/laravel/app/Services/Maps/TomTomMapService.php',
  'utf8',
);

assert.equal(
  packageJson.dependencies?.leaflet,
  '1.9.4',
  'Leaflet must be available locally instead of relying only on an external CDN.',
);

assert.match(
  realMap,
  /\/node_modules\/leaflet\/dist\/leaflet\.js/,
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

assert.doesNotMatch(
  realMap,
  /TOMTOM_API_KEY/,
  'The browser renderer must not reference TOMTOM_API_KEY.',
);

console.log('map-runtime-contract.test.mjs: OK');
