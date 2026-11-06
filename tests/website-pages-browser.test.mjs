import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

await mkdir('artifacts/visual', { recursive: true });
const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const routeFixture = { data: [{ id: 10, origin: 'Georgetown', destination: 'New Amsterdam', status: 'active', distance_km: 120, image_url: '/storage/routes/georgetown-new-amsterdam.webp', segments: [{ origin: 'Georgetown', destination: 'New Amsterdam', active: true }] }] };
await page.route('**/api/v1/routes', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routeFixture) }));
await page.route('**/api/v1/trips/search**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) }));
await page.route('**/api/v1/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
await page.route('**/api/v1/website-content', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }));
await page.route('**/api/v1/network/live', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { routes: [], trips: [], updated_at: null } }) }));
await page.route('**/api/v1/maps/tiles/**', (route) => route.fulfill({ status: 204, body: '' }));
await page.route('**/storage/routes/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#0e526d"/><circle cx="500" cy="90" r="120" fill="#39b7ea" opacity=".35"/><path d="M50 300 250 170l100 70 110-120 130 180Z" fill="#8bd2e9" opacity=".8"/></svg>' }));

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

const assertHorizontalGeometry = async (name, width) => {
  const result = await page.evaluate((viewportWidth) => {
    const selectors = [
      'main > .shell',
      'main .site-page__hero',
      'main .site-page__section',
      'main .public-booking',
      'main .site-live-map',
      'footer > .shell',
    ];
    const overflowing = [];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1)) {
          overflowing.push({ selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) });
        }
      }
    }
    const unusableControls = [...document.querySelectorAll('a,button,input,select,summary')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden' && (rect.width < 1 || rect.height < 1);
      })
      .slice(0, 8)
      .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 60) }));
    return {
      scrollWidth: document.documentElement.scrollWidth,
      overflowing,
      unusableControls,
    };
  }, width);
  assert.ok(result.scrollWidth <= width + 1, `${name} must not overflow at ${width}px`);
  assert.deepEqual(result.overflowing, [], `${name} has horizontally misaligned regions at ${width}px`);
  assert.deepEqual(result.unusableControls, [], `${name} has visible controls without usable geometry at ${width}px`);
};

const assertTripSearchRow = async (width) => {
  if (width < 1280) return;
  const result = await page.evaluate(() => {
    const form = document.querySelector('#bookingForm');
    const controls = [...(form?.querySelectorAll('.booking-field, .public-swap, .public-search-button') ?? [])]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width };
      });
    const card = form?.getBoundingClientRect();
    return {
      controls,
      card: card ? { left: card.left, right: card.right, bottom: card.bottom } : null,
      cardScrollWidth: form?.scrollWidth ?? 0,
      cardClientWidth: form?.clientWidth ?? 0,
    };
  });
  assert.equal(result.controls.length, 6, 'trip search must expose six aligned controls');
  const centers = result.controls.map(({ top, bottom }) => (top + bottom) / 2);
  assert.ok(Math.max(...centers) - Math.min(...centers) <= 2, `trip controls must share one vertically aligned desktop row at ${width}px`);
  assert.ok(result.card && result.controls.every(({ left, right }) => left >= result.card.left - 1 && right <= result.card.right + 1), `trip controls must stay inside the card at ${width}px`);
  assert.ok(result.cardScrollWidth <= result.cardClientWidth + 1, `trip form must not overflow horizontally at ${width}px`);
};

for (const width of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
  await page.setViewportSize({ width, height: 900 });
  for (const [name, pathname] of pages) {
    const response = await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200, `${name} must load at ${width}px`);
    await page.waitForTimeout(75);
    assert.ok(await page.title(), `${name} must have a title`);
    await assertHorizontalGeometry(name, width);
    if (name === 'trips') await assertTripSearchRow(width);
    const primaryShell = page.locator('main > .shell').first();
    if (await primaryShell.count()) {
      const shellBox = await primaryShell.boundingBox();
      const expectedShellWidth = Math.min(1240, width - 48);
      assert.ok(shellBox && shellBox.width >= expectedShellWidth * 0.95, `${name} must use the available layout width at ${width}px`);
    }
    if (width === 1440 && ['home', 'routes', 'trips', 'packages', 'services', 'live', 'about', 'contact', 'help'].includes(name)) {
      await page.screenshot({ path: `artifacts/visual/website-${name}-multipage-1440.png`, fullPage: true });
    }
  }
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://${host}:${port}/website/`, { waitUntil: 'domcontentloaded' });
await page.locator('#routesBrowseLink').waitFor({ state: 'visible' });
assert.equal(await page.locator('#routesBrowseLink').textContent(), 'View all routes →', 'route directory action must be explicit when routes exist');
await page.evaluate(() => localStorage.removeItem('encore_recent_searches_v1'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(document.querySelector('[name="origin"] option[value="Georgetown"]')));
await page.locator('[name="origin"]').selectOption('Georgetown');
await page.waitForFunction(() => Boolean(document.querySelector('[name="destination"] option[value="New Amsterdam"]')));
await page.locator('[name="destination"]').selectOption('New Amsterdam');
await page.locator('[name="date"]').fill('2027-01-08');
await Promise.all([
  page.waitForURL('**/passenger/**'),
  page.locator('#bookingForm').evaluate((form) => form.requestSubmit()),
]);
await page.goto(`http://${host}:${port}/website/`, { waitUntil: 'domcontentloaded' });
const recentSearches = page.locator('#recentSearches');
await recentSearches.waitFor({ state: 'visible' });
assert.equal(await recentSearches.locator('[data-recent-search]').count(), 1, 'the latest search must persist in browser storage');
await recentSearches.locator('[data-recent-search]').click();
assert.equal(await page.locator('[name="origin"]').inputValue(), 'Georgetown', 'recent search must restore origin');
assert.equal(await page.locator('[name="destination"]').inputValue(), 'New Amsterdam', 'recent search must restore destination');

await page.locator('#primaryNav [data-menu-button]').first().click();
await page.screenshot({ path: 'artifacts/visual/website-navigation-desktop-1440.png', fullPage: false });
await page.locator('#primaryNav [data-menu-button]').first().hover();
const routeMenuLink = page.locator('#travelMenu a').first();
const menuGeometry = await page.locator('#primaryNav [data-menu-button]').first().evaluate((button) => {
  const panel = button.closest('[data-menu]')?.querySelector('[data-menu-panel]');
  const buttonRect = button.getBoundingClientRect();
  const panelRect = panel?.getBoundingClientRect();
  return { buttonBottom: buttonRect.bottom, panelTop: panelRect?.top ?? Number.POSITIVE_INFINITY };
});
assert.ok(menuGeometry.panelTop <= menuGeometry.buttonBottom + 1, 'Desktop dropdown must touch its trigger so the pointer cannot fall through a gap');
await routeMenuLink.hover();
assert.equal(await routeMenuLink.isVisible(), true, 'Desktop dropdown must remain selectable while crossing to its panel');
await routeMenuLink.click();
await page.waitForURL('**/website/routes/**');
await page.goto(`http://${host}:${port}/website/`, { waitUntil: 'domcontentloaded' });
const keyboardTravelMenu = page.locator('#primaryNav [data-menu-button]').first();
await keyboardTravelMenu.focus();
await page.keyboard.press('ArrowDown');
assert.equal(await page.locator('#travelMenu').getAttribute('hidden'), null, 'Desktop dropdown must open with ArrowDown');
assert.equal(await page.locator('#travelMenu a').first().evaluate((element) => document.activeElement === element), true, 'ArrowDown must move focus into the dropdown');
await page.keyboard.press('Escape');
assert.notEqual(await page.locator('#travelMenu').getAttribute('hidden'), null, 'Escape must close the keyboard-open dropdown');
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(`http://${host}:${port}/website/`, { waitUntil: 'domcontentloaded' });
await page.locator('#mobileMenuToggle').click();
await page.locator('#mobileNavigation [data-mobile-menu-button]').first().click();
await page.screenshot({ path: 'artifacts/visual/website-navigation-mobile-390.png', fullPage: false });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://${host}:${port}/website/routes/`, { waitUntil: 'domcontentloaded' });
await page.locator('#routesPageGrid a').first().waitFor();
assert.equal(await page.locator('#routesPageGrid .route-directory-card__visual img').count(), 1, 'published route photos must be shown in the route directory');
assert.equal(await page.locator('#routesPageGrid .route-directory-card__visual img').getAttribute('loading'), 'lazy', 'route photos must use lazy loading');
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

await page.goto(`http://${host}:${port}/website/routes/`, { waitUntil: 'domcontentloaded' });
await page.locator('#routeFilter').fill('Georgetown');
await page.locator('#routeFilterClear').waitFor({ state: 'visible' });
assert.equal(await page.locator('#routesPageGrid .route-directory-card').count(), 1, 'route search must filter the published directory');
await page.locator('#routeFilterClear').click();
assert.equal(await page.locator('#routeFilter').inputValue(), '', 'route search clear must reset the query');
assert.equal(await page.locator('#routeFilterClear').isHidden(), true, 'route search clear must hide when there is no query');

await page.goto(`http://${host}:${port}/website/packages/`, { waitUntil: 'domcontentloaded' });
const packageSteps = page.locator('[data-package-step]');
assert.equal(await packageSteps.count(), 3, 'parcel induction must expose three navigable stages');
await packageSteps.nth(0).focus();
await page.keyboard.press('ArrowRight');
assert.equal(await packageSteps.nth(1).getAttribute('aria-selected'), 'true', 'parcel stages must support ArrowRight navigation');
assert.equal(await page.locator('[data-package-title]').textContent(), 'Hand over', 'ArrowRight must update the active parcel stage');
assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-package-step="1"]')), true, 'keyboard navigation must move focus to the active parcel stage');
await page.keyboard.press('End');
assert.equal(await packageSteps.nth(2).getAttribute('aria-selected'), 'true', 'parcel stages must support End navigation');

await page.goto(`http://${host}:${port}/website/help/`, { waitUntil: 'domcontentloaded' });
const faqItems = page.locator('.site-page--help .help-faq-list details');
assert.equal(await faqItems.count(), 6, 'help page must expose all FAQ items');
const helpCta = page.locator('.site-page--help .help-intro__copy .btn-primary');
assert.equal(await helpCta.textContent(), 'Find a trip →', 'help search action must be visibly labeled');
assert.ok(await helpCta.isVisible(), 'help search action must be visible');
assert.equal(await faqItems.nth(0).getAttribute('open'), '', 'first FAQ answer should be available immediately');
assert.equal(await faqItems.nth(1).getAttribute('open'), null, 'secondary FAQ answers should start compact');
await faqItems.nth(1).locator('summary').click();
assert.equal(await faqItems.nth(1).getAttribute('open'), '', 'FAQ question row must open its answer');
assert.ok(await faqItems.nth(1).locator('p').isVisible(), 'opened FAQ answer must be visible');

await page.goto(`http://${host}:${port}/website/about/`, { waitUntil: 'domcontentloaded' });
assert.equal(await page.locator('.about-speech-bubble').count(), 1, 'About must use the journey speech bubble composition');
assert.equal(await page.locator('.about-principle').count(), 3, 'About must expose three connected principles');
assert.ok(await page.locator('.about-next a[href="/website/routes/"]').isVisible(), 'About must keep a route discovery action');

await page.goto(`http://${host}:${port}/website/contact/`, { waitUntil: 'domcontentloaded' });
assert.equal(await page.locator('.contact-path').count(), 3, 'Contact must expose three real resolution paths');
assert.equal(await page.locator('.contact-path[href="/passenger/"]').count(), 1, 'Contact must preserve the booking path');
assert.equal(await page.locator('.contact-path[href="/track-package/"]').count(), 1, 'Contact must preserve parcel tracking');
assert.equal(await page.locator('.contact-path[href="/website/help/"]').count(), 1, 'Contact must preserve help');

await page.goto(`http://${host}:${port}/website/packages/?lang=es`, { waitUntil: 'domcontentloaded' });
await page.locator('[data-locale-switcher]').first().waitFor();
assert.equal(await page.locator('html').getAttribute('lang'), 'es', 'Spanish locale must update the document language');
assert.equal(await page.locator('[data-locale-switcher]').first().inputValue(), 'es', 'Spanish locale must be selected');
assert.match(await page.locator('body').innerText(), /Paquetería/, 'Spanish locale must translate customer-facing page content');
assert.match(await page.title(), /Paquetería/);
await page.locator('[data-locale-switcher]').first().selectOption('en');
await page.waitForURL('**/website/packages/');
assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'English locale must be restorable');

for (const [path, expected] of [
  ['/website/about/?lang=es', 'Mueve personas y encomiendas'],
  ['/website/contact/?lang=es', '¿A dónde debemos llevarte?'],
  ['/website/help/?lang=es', 'Encuentra la respuesta'],
]) {
  await page.goto(`http://${host}:${port}${path}`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'es', `${path} must expose the Spanish document language`);
  assert.match(await page.locator('body').innerText(), new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${path} must translate its redesigned customer-facing copy`);
}

await browser.close();
server.close();
console.log('website-pages-browser.test.mjs: deep pages, refresh and Passenger parameter transfer passed');
