import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const viewports = [390, 768, 1024, 1440, 1920];
const surfaces = [
  ['website', '/website/'],
  ['passenger', '/passenger/'],
  ['driver', '/driver/'],
  ['admin', '/admin/'],
  ['login', '/login/'],
  ['tracking', '/track-package/'],
];

await mkdir('artifacts/visual', { recursive: true });
const { server, host, port } = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl: process.env.VISUAL_API_TARGET ?? 'http://127.0.0.1:65534',
  quiet: true,
});

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const failures = [];

try {
  for (const [surface, pathname] of surfaces) {
    for (const width of viewports) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      if (process.env.VISUAL_API_TARGET) {
        // Keep visual assertions deterministic when the local PHP server is
        // single-threaded and the external tile provider is unavailable.
        // Route data, markers and the map renderer still use the live API.
        await page.route('**/api/v1/maps/tiles/**', (route) =>
          route.fulfill({ status: 204, body: '' }));
      }

      try {
        const response = await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        assert.equal(response?.status(), 200, `${surface} ${width}px must return 200`);
        if (process.env.VISUAL_API_TARGET && surface === 'website') {
          await page.waitForFunction(
            () => ['Route loaded', 'Route unavailable', 'Unavailable'].includes(
              document.querySelector('#mapStatus')?.textContent?.trim(),
            ),
            null,
            { timeout: 20000 },
          );
        }
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          title: document.title,
          viewportMeta: document.querySelector('meta[name="viewport"]')?.content ?? '',
        }));
        assert.ok(metrics.title, `${surface} ${width}px must have a document title`);
        assert.match(metrics.viewportMeta, /width=device-width/);
        assert.ok(metrics.documentWidth <= metrics.viewport + 1, `${surface} ${width}px horizontal overflow: ${metrics.documentWidth}px > ${metrics.viewport}px`);
        assert.equal(pageErrors.length, 0, `${surface} ${width}px page errors: ${pageErrors.join('; ')}`);
        if (surface === 'website' && width === 390) {
          const missingAnchors = await page.locator('a[href^="#"]').evaluateAll((links) =>
            links.map((link) => link.getAttribute('href').slice(1))
              .filter((id) => id && !document.getElementById(id)));
          assert.deepEqual(missingAnchors, [], 'Website in-page navigation must point to existing sections');
          assert.equal(await page.locator('.public-quick-links').count(), 0, 'Redundant quick links must be removed');
          assert.equal(await page.locator('#package-tracking a[href="/track-package/"]').count(), 1, 'Package tracking must have a clear destination');
          assert.equal(await page.locator('#networkRouteSelect').count(), 1, 'The live map must offer route selection');
          assert.equal(await page.locator('[data-open-map]').count(), 0, 'The generic current-route CTA must not show without a selected trip');
          assert.ok(await page.locator('#bookingForm input[name="date"]').inputValue(), 'The booking date must default to today');

          const menu = page.locator('#mobileMenuToggle');
          await menu.click();
          assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Mobile menu must open');
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'Escape must close the mobile menu');

        }
        if (['driver', 'admin'].includes(surface)) {
          assert.equal(new URL(page.url()).pathname, '/login/', `${surface} must require staff sign-in`);
        }
        await page.evaluate(async () => {
          document.documentElement.style.scrollBehavior = 'auto';
          for (let position = 0; position < document.body.scrollHeight; position += window.innerHeight * 0.8) {
            window.scrollTo({ top: position, behavior: 'instant' });
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
          await new Promise((resolve) => setTimeout(resolve, 150));
        });
        await page.screenshot({ path: `artifacts/visual/${surface}-${width}.png`, fullPage: true });
        console.log(`${surface} ${width}px OK width=${metrics.documentWidth} title=${JSON.stringify(metrics.title)}`);
      } catch (error) {
        failures.push(error.message);
        console.error(`${surface} ${width}px FAILED: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

assert.deepEqual(failures, [], failures.join('\n'));
console.log(`visual-browser.test.mjs: ${surfaces.length * viewports.length} browser checks and screenshots passed.`);
