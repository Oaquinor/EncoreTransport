import assert from 'node:assert/strict';
import fs from 'node:fs';

const website = fs.readFileSync('apps/website/app.mjs', 'utf8');
const map = fs.readFileSync('packages/shared/real-map.mjs', 'utf8');

assert.match(website, /liveNetworkFailureCount/);
assert.match(website, /LIVE_NETWORK_MAX_DELAY = 120000/);
assert.match(website, /setTimeout\(async \(\) =>/);
assert.match(website, /document\.visibilityState/);
assert.match(website, /window\.addEventListener\('online'/);
assert.match(website, /window\.clearTimeout/);
assert.match(map, /animateLiveMarker/);
assert.match(map, /requestAnimationFrame\(step\)/);
assert.match(map, /cancelAnimationFrame/);
assert.match(map, /vehicle-stale/);
assert.doesNotMatch(map, /🚌/);

console.log('live-network-resilience.test.mjs: OK');
