import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

await mkdir('artifacts/performance', { recursive: true });

const tilePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const networkFixture = {
  routes: [{
    route_id: 'route-1',
    origin: 'Georgetown',
    destination: 'New Amsterdam',
    stops: [
      { name: 'Georgetown', latitude: 6.8013, longitude: -58.1551 },
      { name: 'New Amsterdam', latitude: 6.2473, longitude: -57.5170 },
    ],
  }],
  trips: [{
    trip_id: 'trip-1',
    route_id: 'route-1',
    bus_code: 'ET-01',
    origin: 'Georgetown',
    destination: 'New Amsterdam',
    latitude: 6.55,
    longitude: -57.88,
    status: 'in_progress',
    is_stale: false,
    last_location_at: new Date(Date.now() - 10_000).toISOString(),
  }],
  updated_at: new Date().toISOString(),
};

const { server, host, port } = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl: 'http://127.0.0.1:65534',
  quiet: true,
});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const tileRequests = [];
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.route('**/api/v1/**', async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.includes('/maps/tiles/')) {
    tileRequests.push(url.pathname);
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'Cache-Control': 'public, max-age=300', ETag: '"fixture-tile"' },
      body: tilePng,
    });
    return;
  }
  if (url.pathname.endsWith('/network/live')) {
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Live-Query-Ms': '2.5', 'Server-Timing': 'live-query;dur=2.5' }, body: JSON.stringify({ data: networkFixture }) });
    return;
  }
  if (url.pathname.endsWith('/routes')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: networkFixture.routes }) });
    return;
  }
  if (url.pathname.endsWith('/health')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
});

try {
  await page.goto(`http://${host}:${port}/website/live/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#networkRouteSelect option[value="route-1"]').waitFor({ state: 'attached', timeout: 8000 });
  await page.locator('#networkRouteSelect').selectOption('route-1');
  await page.locator('#routeMapCanvas').scrollIntoViewIfNeeded();
  await page.locator('#routeMapCanvas.leaflet-container').waitFor({ state: 'attached', timeout: 8000 });
  await page.waitForTimeout(250);

  const mapBox = await page.locator('#routeMapCanvas').boundingBox();
  if (mapBox) {
    await page.mouse.move(mapBox.x + mapBox.width * 0.45, mapBox.y + mapBox.height * 0.5);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1) {
      await page.mouse.move(
        mapBox.x + mapBox.width * (0.45 + step * 0.0125),
        mapBox.y + mapBox.height * (0.5 + step * 0.0025),
      );
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.waitForTimeout(100);
  }

  const first = await page.evaluate(() => ({
    maps: globalThis.__ENCORE_MAP_METRICS__ ?? null,
    api: globalThis.__ENCORE_API_METRICS__ ?? null,
    resources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/maps/tiles/')).length,
  }));
  assert.ok(first.maps?.maps, 'Live map must expose runtime metrics.');
  assert.ok(Object.values(first.maps.maps).some((map) => map.tiles.started >= 1), 'Live map must measure tile requests.');

  await page.screenshot({ path: 'artifacts/performance/map-live-after.png', fullPage: false });
  const firstTileRequests = tileRequests.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#networkRouteSelect option[value="route-1"]').waitFor({ state: 'attached', timeout: 8000 });
  await page.locator('#networkRouteSelect').selectOption('route-1');
  await page.locator('#routeMapCanvas').scrollIntoViewIfNeeded();
  await page.locator('#routeMapCanvas.leaflet-container').waitFor({ state: 'attached', timeout: 8000 });
  await page.waitForTimeout(250);
  const second = await page.evaluate(() => ({
    maps: globalThis.__ENCORE_MAP_METRICS__ ?? null,
    api: globalThis.__ENCORE_API_METRICS__ ?? null,
    resources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/maps/tiles/')).length,
  }));
  await page.screenshot({ path: 'artifacts/performance/map-live-cached-reload.png', fullPage: false });
  await writeFile('artifacts/performance/map-live-first.json', `${JSON.stringify({ first, second, firstTileRequests, secondTileRequests: tileRequests.length - firstTileRequests }, null, 2)}\n`);
  console.log(JSON.stringify({
    firstMap: Object.values(first.maps.maps)[0],
    apiRequests: first.api?.requests?.filter((request) => request.path.includes('/network/live')) ?? [],
    secondMap: Object.values(second.maps.maps)[0],
    tileRequests: { first: firstTileRequests, second: tileRequests.length - firstTileRequests },
  }, null, 2));
} finally {
  if (pageErrors.length) console.error(JSON.stringify({ pageErrors }, null, 2));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

