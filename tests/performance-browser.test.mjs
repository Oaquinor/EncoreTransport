import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const homepage = await readFile('apps/website/app.mjs', 'utf8');
const api = await readFile('packages/shared/api/public.mjs', 'utf8');
const map = await readFile('packages/shared/real-map.mjs', 'utf8');

assert.doesNotMatch(homepage, /Promise\.allSettled\([\s\S]*fetchTripSeats/);
assert.match(homepage, /IntersectionObserver/);
assert.match(homepage, /setInterval\(refreshLiveNetwork, 25000\)/);
assert.match(homepage, /visibilitychange/);
assert.match(api, /\/network\/live/);
assert.match(map, /renderLiveNetworkMap/);
assert.match(map, /vehicleMarkers/);

console.log('performance-browser.test.mjs: homepage performance contract OK');
