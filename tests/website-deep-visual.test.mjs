import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

await mkdir('artifacts/visual', { recursive: true });
const { server, host, port } = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl: 'http://127.0.0.1:65534',
  quiet: true,
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const pages = [
  ['home', '/website/'],
  ['routes', '/website/routes/'],
  ['trips', '/website/trips/'],
  ['packages', '/website/packages/'],
  ['services', '/website/services/'],
  ['live', '/website/live/'],
  ['about', '/website/about/'],
  ['contact', '/website/contact/'],
  ['help', '/website/help/'],
];

try {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, pathname] of pages) {
      await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        for (let position = 0; position < document.body.scrollHeight; position += window.innerHeight * 0.8) {
          window.scrollTo(0, position);
          await new Promise((resolve) => setTimeout(resolve, 35));
        }
        document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-visible'));
        window.scrollTo(0, 0);
      });
      const geometry = await page.evaluate((viewportWidth) => {
        const controls = [...document.querySelectorAll('a,button,input,select,summary')];
        const unusableControls = controls.filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return element.getClientRects().length > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && (rect.width < 1 || rect.height < 1);
        });
        return {
          scrollWidth: document.documentElement.scrollWidth,
          overflowingShells: [...document.querySelectorAll('main > .shell, main .site-page__hero, main .site-page__section, main .public-booking, main .site-live-map, footer > .shell')]
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ rect }) => rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1))
            .map(({ rect }) => ({ left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) })),
          unusableControls: unusableControls.map((element) => element.outerHTML.slice(0, 160)),
        };
      }, width);
      assert.ok(geometry.scrollWidth <= width + 1, `${name} ${width}px must not overflow horizontally`);
      assert.deepEqual(geometry.overflowingShells, [], `${name} ${width}px has an overflowing layout region`);
      assert.deepEqual(geometry.unusableControls, [], `${name} ${width}px has an unusable visible control`);
      await page.screenshot({ path: `artifacts/visual/website-${name}-${width}-deep.png`, fullPage: true, timeout: 60000 });
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log('website-deep-visual.test.mjs: 18 responsive page captures and geometry checks passed');
