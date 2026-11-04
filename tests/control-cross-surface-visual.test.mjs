import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const surfaces = [
  ['website', '/website/'],
  ['trips', '/website/trips/'],
  ['tracking', '/track-package/'],
  ['package-register', '/package-register/'],
  ['login', '/login/'],
  ['driver', '/driver/'],
  ['admin', '/admin/'],
];

const routeFixture = {
  data: [
    { id: 10, origin: 'Georgetown', destination: 'New Amsterdam', status: 'active', distance_km: 120, segments: [{ origin: 'Georgetown', destination: 'New Amsterdam', active: true }] },
    { id: 11, origin: 'New Amsterdam', destination: 'Georgetown', status: 'active', distance_km: 120, segments: [{ origin: 'New Amsterdam', destination: 'Georgetown', active: true }] },
  ],
};

const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/v1/routes', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routeFixture) }));
await page.route('**/api/v1/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
await page.route('**/api/v1/website-content', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }));
await page.route('**/api/v1/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthenticated test fixture' }) }));

const inspected = [];
const signatures = new Set();
try {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [surface, pathname] of surfaces) {
      await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(140);
      const controls = await page.locator('.button').evaluateAll((elements) => elements
        .filter((element) => {
          const classes = element.className?.toString() ?? '';
          const style = getComputedStyle(element);
          return element.getClientRects().length > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && /button--(primary|ghost|danger|subtle)|primary-button|secondary-button/.test(classes)
            && !/site-menu__button|site-mobile-menu__button|mobile-menu-toggle|public-account-link|public-passenger-link|button--tab|package-flow__steps|public-swap|swap/.test(classes);
        })
        .map((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim(),
            radius: style.borderRadius,
            boxSizing: style.boxSizing,
            height: Math.round(rect.height),
            classes: element.className?.toString() ?? '',
          };
        }));

      for (const control of controls) {
        assert.ok(control.label, `${surface} at ${width}px exposes an unlabeled canonical control`);
        assert.equal(control.radius, '12px', `${surface} at ${width}px has a non-canonical control radius: ${control.label}`);
        assert.equal(control.boxSizing, 'border-box', `${surface} at ${width}px is outside border-box: ${control.label}`);
        assert.ok(control.height >= 40, `${surface} at ${width}px has a short canonical control: ${control.label}`);
        signatures.add(`${control.radius}:${control.boxSizing}`);
        inspected.push({ surface, width, ...control });
      }
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

assert.ok(inspected.length >= 12, `cross-surface contract should inspect at least 12 controls, found ${inspected.length}`);
assert.deepEqual([...signatures], ['12px:border-box'], 'canonical controls must share one geometry signature');
console.log(`control-cross-surface-visual.test.mjs: PASS — ${inspected.length} canonical controls across ${surfaces.length} surfaces × 2 viewports`);
