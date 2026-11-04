import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const routes = [
  '/website/',
  '/website/routes/',
  '/website/trips/?origin=Georgetown&destination=New%20Amsterdam&date=2027-01-08&passengers=2',
  '/website/packages/',
  '/website/services/',
  '/website/live/',
  '/website/about/',
  '/website/contact/',
  '/website/help/',
  '/track-package/',
  '/package-register/',
  '/login/',
  '/driver/',
  '/admin/',
];

await mkdir('artifacts/control-audit', { recursive: true });
const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/v1/**', (route) => route.fulfill({
  status: 401,
  contentType: 'application/json',
  body: JSON.stringify({ message: 'Unauthenticated test fixture' }),
}));

const rows = [];
try {
  for (const pathname of routes) {
    const response = await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded' });
    assert.ok(response && response.status() < 500, `${pathname} must not return a server error`);
    await page.waitForTimeout(80);
    const controls = await page.locator('button, a[href], input, select, textarea, summary').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        return element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('placeholder') || element.textContent?.replace(/\s+/g, ' ').trim();
        return {
          tag: element.tagName.toLowerCase(),
          label: label?.slice(0, 120) || '',
          href: element.getAttribute('href') || '',
          anchorTargetExists: element.tagName === 'A' && element.getAttribute('href')?.startsWith('#') && element.getAttribute('href') !== '#'
            ? Boolean(document.querySelector(element.getAttribute('href')))
            : true,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          type: element.getAttribute('type') || '',
        };
      }));
    for (const control of controls) {
      assert.ok(control.width >= 1 && control.height >= 1, `${pathname} has a control without usable geometry: ${control.tag} ${control.label}`);
      if (control.tag === 'button' || control.tag === 'summary') {
        assert.ok(control.label, `${pathname} has an interactive control without a label`);
      }
      if (control.tag === 'a') {
        assert.ok(control.href && (!control.href.endsWith('#') || control.anchorTargetExists), `${pathname} has an anchor without a destination`);
      }
      rows.push({ route: pathname, ...control });
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await writeFile('artifacts/control-audit/runtime-controls.json', `${JSON.stringify({ generated_at: new Date().toISOString(), routes, controls: rows }, null, 2)}\n`);
const byRoute = Object.fromEntries(routes.map((route) => [route, rows.filter((row) => row.route === route).length]));
assert.ok(rows.length >= 40, `runtime audit should inspect a meaningful control surface, found ${rows.length}`);
console.log(`control-runtime-audit.test.mjs: OK — ${rows.length} visible controls across ${routes.length} routes`);
console.log(JSON.stringify(byRoute));
