import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const origin = `http://${host}:${port}`;

await page.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (value) => { window.__copiedTrackingLink = value; } },
  });
});

await page.route('**/api/v1/driver/trips/current', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ data: { id: 77, route: { origin: 'Georgetown', destination: 'New Amsterdam' }, departure_at: '2026-11-03T16:00:00Z' } }),
}));
await page.route('**/api/v1/driver/packages', async (route) => {
  const payload = JSON.parse(route.request().postData() || '{}');
  assert.equal(payload.trip_id, '77', 'package registration must send the active trip');
  assert.equal(payload.recipient_name, 'Ada Lovelace', 'package registration must send the recipient');
  await route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ data: { package: { id: 88, reference: 'PK-000088', trip_id: 77 }, tracking_token: 'opaque-token-88' } }),
  });
});

try {
  const response = await page.goto(`${origin}/package-register/`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, 'package registration must load');
  await page.locator('#submitButton:not([disabled])').waitFor({ state: 'visible' });
  await page.locator('#recipientName').fill('Ada Lovelace');
  await page.locator('#description').fill('Sealed documents');
  await page.locator('#submitButton').click();
  await page.locator('#successCard').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#submitButton [data-action-label]')?.textContent === 'Register package');
  assert.equal(await page.locator('#submitButton [data-action-label]').textContent(), 'Register package');
  assert.equal(await page.locator('#submitButton .ui-icon').count(), 1, 'registration loading must preserve its icon');
  assert.equal(await page.locator('#trackingLink').getAttribute('href'), '/track-package/?token=opaque-token-88');

  await page.locator('#copyTrackingLink').click();
  assert.equal(await page.locator('#copyTrackingLink [data-action-label]').textContent(), 'Copied');
  assert.equal(await page.evaluate(() => window.__copiedTrackingLink), `${origin}/track-package/?token=opaque-token-88`);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log('package-register-browser.test.mjs: registration, icon state and tracking copy passed');
