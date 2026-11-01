import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

await mkdir('artifacts/visual', { recursive: true });
const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const routeFixture = { data: [{ id: 10, origin: 'Georgetown', destination: 'New Amsterdam', status: 'active', distance_km: 120, segments: [{ origin: 'Georgetown', destination: 'New Amsterdam', active: true }] }] };
await page.route('**/api/v1/routes', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routeFixture) }));
await page.route('**/api/v1/trips/search**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) }));
await page.route('**/api/v1/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
await page.route('**/api/v1/website-content', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }));
await page.route('**/api/v1/network/live', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { routes: [], trips: [], updated_at: null } }) }));
await page.route('**/api/v1/maps/tiles/**', (route) => route.fulfill({ status: 204, body: '' }));

const pages = [
  ['home', '/website/'],
  ['routes', '/website/routes/'],
  ['trips', '/website/trips/?origin=Georgetown&destination=New%20Amsterdam&date=2027-01-08&passengers=2'],
  ['packages', '/website/packages/'],
  ['services', '/website/services/'],
  ['live', '/website/live/'],
  ['about', '/website/about/'],
  ['contact', '/website/contact/'],
  ['help', '/website/help/'],
];

for (const width of [390, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const [name, pathname] of pages) {
    const response = await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200, `${name} must load at ${width}px`);
    await page.waitForTimeout(150);
    assert.ok(await page.title(), `${name} must have a title`);
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 1, `${name} must not overflow at ${width}px`);
    if (width === 1440 && ['home', 'routes', 'trips', 'packages', 'live', 'help'].includes(name)) {
      await page.screenshot({ path: `artifacts/visual/website-${name}-multipage-1440.png`, fullPage: true });
    }
  }
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://${host}:${port}/website/`, { waitUntil: 'domcontentloaded' });
await page.locator('#primaryNav [data-menu-button]').first().click();
await page.screenshot({ path: 'artifacts/visual/website-navigation-desktop-1440.png', fullPage: false });
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(`http://${host}:${port}/website/`, { waitUntil: 'domcontentloaded' });
await page.locator('#mobileMenuToggle').click();
await page.locator('#mobileNavigation [data-mobile-menu-button]').first().click();
await page.screenshot({ path: 'artifacts/visual/website-navigation-mobile-390.png', fullPage: false });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://${host}:${port}/website/routes/`, { waitUntil: 'domcontentloaded' });
await page.locator('#routesPageGrid a').first().waitFor();
await page.locator('#routesPageGrid a').first().click();
await page.waitForURL('**/website/trips/**');
assert.equal(new URL(page.url()).searchParams.get('origin'), 'Georgetown');
assert.equal(new URL(page.url()).searchParams.get('destination'), 'New Amsterdam');
await page.waitForFunction(() => document.querySelector('[name="origin"]')?.value === 'Georgetown');
assert.equal(await page.locator('[name="destination"]').inputValue(), 'New Amsterdam');
assert.equal(await page.locator('[name="passengers"]').inputValue(), '1');
assert.ok(await page.locator('[name="date"]').inputValue(), 'search date must receive the current default');

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('[name="origin"]')?.value === 'Georgetown');
assert.equal(await page.locator('[name="destination"]').inputValue(), 'New Amsterdam', 'deep refresh must preserve URL search parameters');

await browser.close();
server.close();
console.log('website-pages-browser.test.mjs: deep pages, refresh and Passenger parameter transfer passed');
