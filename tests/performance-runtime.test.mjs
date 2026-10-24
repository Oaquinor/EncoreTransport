import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const surfaces = [
  ['website', '/website/'],
  ['passenger', '/passenger/'],
  ['driver', '/driver/'],
  ['admin', '/admin/'],
];

const { server, host, port } = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl: 'http://127.0.0.1:65534',
  quiet: true,
});

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [surface, pathname] of surfaces) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const requests = [];
    page.on('request', (request) => requests.push(request));
    const started = Date.now();
    await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'load', timeout: 15000 });
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
        load: Math.round(navigation.loadEventEnd),
        transferBytes: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
        resourceCount: resources.length,
      };
    });
    results.push({ surface, wallTime: Date.now() - started, ...metrics, apiRequests: requests.filter((request) => request.url().includes('/api/')).length });
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

assert.equal(results.length, surfaces.length);
console.log(JSON.stringify(results, null, 2));
