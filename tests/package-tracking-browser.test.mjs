import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const { server, host, port } = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl: 'http://127.0.0.1:65534',
  quiet: true,
});

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/v1/packages/track/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: {
      reference: 'PK-QA-001',
      status: 'in_progress',
      route: 'Georgetown → New Amsterdam',
      events: [{ status: 'received', occurred_at: '2026-11-03T12:00:00Z', notes: 'Received at Georgetown terminal.' }],
    } }),
  }));
  await page.route('https://quickchart.io/qr?**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280"><rect width="280" height="280" fill="white"/><path d="M24 24h70v70H24zM186 24h70v70h-70zM24 186h70v70H24zM130 130h24v24h-24z" fill="black"/></svg>',
  }));

  const response = await page.goto(`http://${host}:${port}/track-package/`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  await page.locator('[name="token"]').fill('public-demo-token');
  await page.locator('#trackForm button[type="submit"]').click();
  await page.locator('.track-result').waitFor();

  const actions = await page.locator('.track-actions .button').evaluateAll((buttons) => buttons.map((button) => ({
    type: button.getAttribute('type'),
    label: button.textContent.replace(/\s+/g, ' ').trim(),
    hasIcon: Boolean(button.querySelector('.ui-icon')),
    height: Math.round(button.getBoundingClientRect().height),
  })));
  assert.deepEqual(actions.map((action) => action.label), ['Copy tracking link', 'Show QR code', 'Refresh status']);
  assert.ok(actions.every((action) => action.type === 'button' && action.hasIcon && action.height >= 34));

  const qrButton = page.locator('[data-show-tracking-qr]');
  await qrButton.click();
  await page.locator('[data-tracking-qr-panel]').waitFor({ state: 'visible' });
  const qr = await page.locator('[data-tracking-qr]').evaluate((image) => ({
    src: image.getAttribute('src'),
    alt: image.getAttribute('alt'),
  }));
  assert.match(qr.src, /^https:\/\/quickchart\.io\/qr\?text=/);
  assert.match(decodeURIComponent(qr.src), /track-package\/\?token=public-demo-token/);
  assert.equal(qr.alt, 'QR code for this package tracking view');
  assert.equal(await qrButton.isDisabled(), false);
  assert.equal(await qrButton.getAttribute('aria-expanded'), 'true');
  assert.equal(await qrButton.locator('[data-action-label]').textContent(), 'Hide QR code');
  await qrButton.click();
  assert.equal(await page.locator('[data-tracking-qr-panel]').isVisible(), false);
  assert.equal(await qrButton.getAttribute('aria-expanded'), 'false');
  await page.screenshot({ path: 'artifacts/visual/package-tracking-qr-390.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('package-tracking-browser.test.mjs: QR and action controls passed');
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
