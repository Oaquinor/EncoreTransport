import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const pages = [
  '/website/',
  '/website/routes/',
  '/website/trips/',
  '/website/packages/',
  '/website/services/',
  '/website/live/',
  '/website/about/',
  '/website/contact/',
  '/website/help/',
];

const routeFixture = {
  data: [
    { id: 10, origin: 'Georgetown', destination: 'New Amsterdam', status: 'active', distance_km: 120, segments: [{ origin: 'Georgetown', destination: 'New Amsterdam', active: true }] },
    { id: 11, origin: 'New Amsterdam', destination: 'Georgetown', status: 'active', distance_km: 120, segments: [{ origin: 'New Amsterdam', destination: 'Georgetown', active: true }] },
  ],
};
const liveFixture = {
  data: {
    routes: [{ id: 10, origin: 'Georgetown', destination: 'New Amsterdam', name: 'Georgetown → New Amsterdam' }],
    trips: [{ trip_id: 'trip-10', route_id: 10, bus_code: 'ET-10', origin: 'Georgetown', destination: 'New Amsterdam', latitude: 6.8, longitude: -58.16, is_stale: false, last_location_at: '2026-11-03T15:00:00Z' }],
    updated_at: '2026-11-03T15:00:00Z',
  },
};

const controlSelector = [
  'button',
  'a.button',
  '.site-menu__button',
  '.site-mobile-menu__button',
  '.mobile-menu-toggle',
  '.public-footer__primary-link',
].join(',');

const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/v1/routes', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routeFixture) }));
await page.route('**/api/v1/network/live', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(liveFixture) }));
await page.route('**/api/v1/website-content', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }));
await page.route('**/api/v1/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
await page.route('**/api/v1/maps/tiles/**', (route) => route.fulfill({ status: 204, body: '' }));

const signatures = new Map();
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const pathname of pages) {
      await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(160);
      const controls = await page.locator(controlSelector).evaluateAll((elements) => elements
        .filter((element) => {
          const style = getComputedStyle(element);
          return element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const classes = element.className?.toString() ?? '';
          return {
            label: element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim(),
            classes,
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            radius: style.borderRadius,
            boxSizing: style.boxSizing,
            display: style.display,
            gap: style.gap,
          };
        }));

      assert.ok(controls.length > 0, `${pathname} at ${width}px must expose visible controls`);
      for (const control of controls) {
        assert.ok(control.label, `${pathname} at ${width}px has an unlabeled control`);
        assert.ok(control.width >= 1 && control.height >= 36, `${pathname} at ${width}px has a control below the 36px visual target: ${control.label}`);
        assert.notEqual(control.boxSizing, 'content-box', `${pathname} at ${width}px has a control outside the border-box system: ${control.label}`);
        assert.notEqual(control.radius, '0px', `${pathname} at ${width}px has a square control: ${control.label}`);
      }

      for (const variant of ['button--primary', 'button--ghost']) {
        for (const control of controls.filter(({ classes }) => classes.includes(variant))) {
          const key = `${variant}:${control.radius}:${control.height}:${control.boxSizing}`;
          signatures.set(key, (signatures.get(key) ?? 0) + 1);
        }
      }
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const variantSignatures = [...signatures.keys()];
assert.ok(variantSignatures.some((key) => key.startsWith('button--primary:')), 'Website must render a primary control variant');
assert.ok(variantSignatures.some((key) => key.startsWith('button--ghost:')), 'Website must render a ghost control variant');
console.log(`website-control-visual-contract.test.mjs: PASS — ${pages.length} pages × 3 viewports; ${variantSignatures.length} stable control signatures`);
