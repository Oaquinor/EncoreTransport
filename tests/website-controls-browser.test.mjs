import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
    { id: 12, origin: 'Linden', destination: 'Georgetown', status: 'active', distance_km: 80, segments: [{ origin: 'Linden', destination: 'Georgetown', active: true }] },
  ],
};
const liveFixture = {
  data: {
    routes: [{ id: 10, origin: 'Georgetown', destination: 'New Amsterdam', name: 'Georgetown → New Amsterdam' }],
    trips: [{ trip_id: 'trip-10', route_id: 10, bus_code: 'ET-10', origin: 'Georgetown', destination: 'New Amsterdam', latitude: 6.8, longitude: -58.16, is_stale: false, last_location_at: '2026-11-03T15:00:00Z' }],
    updated_at: '2026-11-03T15:00:00Z',
  },
};

const { server, host, port } = await startEncoreServer({ port: 0, host: '127.0.0.1', apiTargetUrl: 'http://127.0.0.1:65534', quiet: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const origin = `http://${host}:${port}`;
const internalHrefs = new Set();
const buttonMatrix = [];
const controlInventory = [];
const behaviorEvidence = new Map();
let routesShouldFail = false;
let liveShouldFail = false;

function recordBehavior(mechanism, evidence, screen = 'public Website') {
  const current = behaviorEvidence.get(mechanism) ?? { mechanism, evidence: [], screens: new Set() };
  if (!current.evidence.includes(evidence)) current.evidence.push(evidence);
  current.screens.add(screen);
  behaviorEvidence.set(mechanism, current);
}

await page.route('**/api/v1/routes', (route) => routesShouldFail
  ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Route service unavailable' }) })
  : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routeFixture) }));
await page.route('**/api/v1/trips/search**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
await page.route('**/api/v1/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
await page.route('**/api/v1/website-content', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }));
await page.route('**/api/v1/network/live', (route) => liveShouldFail
  ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Live service unavailable' }) })
  : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(liveFixture) }));
await page.route('**/api/v1/maps/tiles/**', (route) => route.fulfill({ status: 204, body: '' }));

try {
  for (const pathname of pages) {
    const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200, `${pathname} must load`);
    await page.waitForTimeout(120);

    const audit = await page.evaluate(() => [...document.querySelectorAll('button, a, summary')]
      .filter((element) => element.getClientRects().length > 0 || element.matches('[data-menu-panel] *'))
      // Leaflet owns its zoom anchors; map controls are intentionally outside this public Website control contract.
      .filter((element) => !(element.tagName === 'A' && ['', '#'].includes(element.getAttribute('href') || '') && (element.closest('.public-real-map, .website-real-map') || /zoom/i.test(typeof element.className === 'string' ? element.className : '') || /^Zoom (in|out)$/i.test(element.getAttribute('aria-label') || element.textContent?.trim() || ''))))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        label: element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.replace(/\s+/g, ' ').trim(),
        type: element.getAttribute('type') || '',
        href: element.getAttribute('href') || '',
        targetExists: element.tagName !== 'A' || !element.getAttribute('href')?.startsWith('#') || element.getAttribute('href') === '#' || Boolean(document.querySelector(element.getAttribute('href'))),
      })));

    for (const control of audit) {
      assert.ok(control.label, `${pathname} has an unlabeled ${control.tag}`);
      if (control.tag === 'button') assert.ok(['button', 'submit', 'reset'].includes(control.type), `${pathname} has a button without an explicit valid type: ${control.label}`);
      if (control.tag === 'a') {
        assert.ok(control.href && control.href !== '#', `${pathname} has an anchor without a destination: ${control.label}`);
        assert.ok(control.targetExists, `${pathname} has an anchor pointing to a missing target: ${control.href}`);
        if (control.href.startsWith('/')) internalHrefs.add(control.href.split('#')[0]);
        recordBehavior('navigation', `HTTP destination ${control.href}`, pathname);
      }
      if (control.tag === 'summary') recordBehavior('disclosure', 'FAQ/footer disclosure contract', pathname);
    }

    const inventory = await page.evaluate(() => [...document.querySelectorAll('button, a, summary, input, select, textarea')]
      .map((element) => {
        const style = getComputedStyle(element);
        const visible = element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden' && !element.closest('[hidden]');
        const mechanism = element.matches('[data-menu-button]') ? 'desktop-menu'
          : element.matches('[data-mobile-menu-button]') ? 'mobile-menu-group'
            : element.matches('#mobileMenuToggle') ? 'mobile-menu'
              : element.matches('.website-select__trigger') ? 'select-trigger'
                : element.matches('.website-select__option') ? 'select-option'
              : element.matches('.swap') ? 'route-swap'
                : element.matches('form button[type="submit"]') ? `form:${element.closest('form')?.id || 'unnamed'}`
                  : element.matches('[data-package-step]') ? 'package-step'
                    : element.matches('[data-network-trip]') ? 'live-trip-selection'
                      : element.matches('[data-network-retry]') ? 'live-retry'
                        : element.matches('#retryRoutes') ? 'routes-retry'
                          : element.matches('[data-recent-search]') ? 'recent-search'
                            : element.tagName === 'SUMMARY' ? 'disclosure'
                              : element.tagName === 'A' ? 'navigation'
                                : element.matches('input, select, textarea') ? 'form-field'
                                  : 'control';
        const label = element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('placeholder') || element.textContent?.replace(/\s+/g, ' ').trim() || element.getAttribute('name') || element.id;
        const destination = element.getAttribute('href') || (element.form ? `form:${element.form.id || 'unnamed'}` : '') || (element.matches('summary') && element.parentElement?.id ? `disclosure:#${element.parentElement.id}` : '') || (element.getAttribute('aria-controls') ? `#${element.getAttribute('aria-controls')}` : '') || element.getAttribute('name') || element.id || '';
        const rect = element.getBoundingClientRect();
        return {
          application: 'Website',
          screen: location.pathname,
          control: label?.slice(0, 160) || '',
          purpose: mechanism,
          destination,
          permissions: 'public',
          status: visible ? 'visible' : 'available-hidden',
          test: 'test:website-controls-browser',
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || '',
          width: visible ? Math.round(rect.width) : 0,
          height: visible ? Math.round(rect.height) : 0,
        };
      }));
    for (const control of inventory) {
      assert.ok(control.control, `${pathname} has an unlabeled ${control.tag} in the control inventory`);
      assert.ok(control.destination, `${pathname} has a control without a destination or functional reference: ${control.control}`);
      controlInventory.push(control);
    }

    const visibleButtons = await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map((element) => {
        const mechanism = element.matches('[data-menu-button]') ? 'desktop-menu'
          : element.matches('#mobileMenuToggle') ? 'mobile-menu'
            : element.matches('.website-select__trigger') ? 'select-trigger'
              : element.matches('.website-select__option') ? 'select-option'
            : element.matches('.swap') ? 'route-swap'
              : element.matches('form button[type="submit"]') ? `form:${element.closest('form')?.id || 'unnamed'}`
                : element.matches('[data-package-step]') ? 'package-step'
                  : element.matches('[data-network-trip]') ? 'live-trip-selection'
                    : element.matches('[data-network-retry]') ? 'live-retry'
                      : element.matches('#retryRoutes') ? 'routes-retry'
                        : element.matches('[data-recent-search]') ? 'recent-search'
                          : '';
        return {
          label: element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim(),
          mechanism,
          type: element.getAttribute('type') || '',
          id: element.id || '',
        };
      }));
    for (const button of visibleButtons) {
      assert.ok(button.mechanism, `${pathname} exposes a button without a registered behavior: ${button.label}`);
      recordBehavior(button.mechanism, `Visible button: ${button.label}`, pathname);
      buttonMatrix.push({ route: pathname, ...button, status: 'verified-by-contract' });
    }

    const fields = await page.evaluate(() => [...document.querySelectorAll('input, select, textarea')]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map((element) => element.getAttribute('name') || element.id || element.getAttribute('aria-label') || 'unnamed field'));
    fields.forEach((field) => recordBehavior('form-field', `Field: ${field}`, pathname));
  }

  await page.goto(`${origin}/website/?lang=en`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(document.querySelector('[name="origin"] option[value="Georgetown"]')));
  await page.waitForFunction(() => {
    const select = document.querySelector('#bookingForm [name="origin"]');
    return Boolean(select && !select.disabled && select.options.length === 4);
  });

  const originTrigger = page.locator('#bookingForm .website-select__trigger').first();
  await originTrigger.waitFor({ state: 'visible' });
  await originTrigger.click();
  const originMenu = page.locator('#bookingForm .website-select__menu[aria-hidden="false"]');
  await originMenu.getByRole('option').first().waitFor({ state: 'visible' });
  assert.equal(await originMenu.getByRole('option').count(), 4, 'origin combo must render its real options in the custom menu');
  const menuVisuals = await originMenu.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow, maxHeight: style.maxHeight };
  });
  assert.notEqual(menuVisuals.borderRadius, '0px', 'custom combo menu must keep rounded corners');
  assert.notEqual(menuVisuals.boxShadow, 'none', 'custom combo menu must keep a professional shadow');
  assert.notEqual(menuVisuals.maxHeight, 'none', 'custom combo menu must keep a bounded scroll area');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[name="origin"]').inputValue(), 'Georgetown', 'keyboard option selection must sync the native form control');
  assert.match(await originTrigger.textContent(), /Georgetown/, 'custom trigger must reflect the selected value');
  await originTrigger.click();
  await page.keyboard.press('Escape');
  assert.equal(await originTrigger.getAttribute('aria-expanded'), 'false', 'Escape must close the custom combo');
  await originTrigger.click();
  await originMenu.getByRole('option', { name: 'Linden', exact: true }).click();
  assert.equal(await page.locator('[name="origin"]').inputValue(), 'Linden', 'mouse option selection must sync the native form control');
  recordBehavior('select-combo', 'Custom combo opens with rounded menu, supports keyboard/mouse selection and Escape, and syncs the native form control', '/website/');

  await page.locator('[name="origin"]').selectOption('Georgetown');
  await page.waitForFunction(() => Boolean(document.querySelector('[name="destination"] option[value="New Amsterdam"]')));
  await page.locator('[name="destination"]').selectOption('New Amsterdam');
  await page.locator('#bookingForm .swap').click();
  assert.equal(await page.locator('[name="origin"]').inputValue(), 'New Amsterdam', 'home swap must exchange origin');
  assert.equal(await page.locator('[name="destination"]').inputValue(), 'Georgetown', 'home swap must exchange destination');
  await page.locator('[name="origin"]').selectOption('Linden');
  await page.locator('[name="destination"]').selectOption('Georgetown');
  await page.locator('#bookingForm .swap').click();
  assert.equal(await page.locator('[name="origin"]').inputValue(), 'Linden', 'swap must preserve origin when no reverse route exists');
  assert.equal(await page.locator('[name="destination"]').inputValue(), 'Georgetown', 'swap must preserve destination when no reverse route exists');
  assert.match(await page.locator('#searchMessage').textContent(), /return route/i, 'swap must explain why an unavailable reverse route was not applied');
  recordBehavior('route-swap', 'Home planner exchanges a valid return route and preserves an unavailable reverse route safely', '/website/');
  assert.equal(await page.getByLabel('Date').count(), 1, 'home date input must expose a stable accessible name');
  assert.equal(await page.getByLabel('Passengers').count(), 1, 'home passenger input must expose a stable accessible name');

  await page.locator('#desktopLocale').selectOption('es');
  await page.waitForURL(/lang=es/);
  assert.equal(await page.locator('html').getAttribute('lang'), 'es', 'Spanish switch must update the document language');
  assert.match(await page.locator('h1').first().textContent(), /viaje/i, 'Spanish switch must translate the page headline');
  recordBehavior('locale-switch', 'EN/ES switch updates document language and localized content', '/website/');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('#mobileMenuToggle').click();
  assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-label'), 'Cerrar navegación', 'Spanish mobile menu must expose a localized close label');
  await page.locator('#mobileMenuToggle').click();
  assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-label'), 'Abrir navegación', 'Spanish mobile menu must expose a localized open label');
  await page.evaluate(() => localStorage.removeItem('encore_site_locale_v1'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/website/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.lang === 'en');

  await page.waitForFunction(() => Boolean(document.querySelector('[name="origin"] option[value="Georgetown"]')));
  await page.locator('[name="origin"]').selectOption('Georgetown');
  await page.locator('[name="destination"]').selectOption('New Amsterdam');
  await page.locator('[name="date"]').fill('2027-01-08');
  await Promise.all([
    page.waitForURL('**/passenger/**'),
    page.locator('#bookingForm').evaluate((form) => form.requestSubmit()),
  ]);
  await page.goto(`${origin}/website/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-recent-search]').waitFor({ state: 'visible' });
  await page.locator('[data-recent-search]').click();
  assert.equal(await page.locator('[name="origin"]').inputValue(), 'Georgetown', 'recent search must restore its origin');
  assert.equal(await page.locator('[name="destination"]').inputValue(), 'New Amsterdam', 'recent search must restore its destination');
  buttonMatrix.push({ route: '/website/', label: 'Recent search', mechanism: 'recent-search', type: 'button', id: '', status: 'verified-by-click' });
  recordBehavior('recent-search', 'Recent search restores origin and destination', '/website/');

  for (const menuButton of await page.locator('#primaryNav [data-menu-button]').all()) {
    await menuButton.click();
    const panelId = await menuButton.getAttribute('aria-controls');
    assert.equal(await page.locator(`#${panelId}`).getAttribute('hidden'), null, 'desktop menu must open on click');
    await page.keyboard.press('Escape');
    assert.notEqual(await page.locator(`#${panelId}`).getAttribute('hidden'), null, 'desktop menu must close on Escape');
  }
  recordBehavior('desktop-menu', 'Click opens each desktop menu and Escape closes it', '/website/');

  // Regression for the original disappearing-dropdown bug: the pointer must be
  // able to travel from the trigger into the panel and activate a real link.
  const tripsMenu = page.getByRole('button', { name: 'Trips', exact: true });
  const tripsPanel = page.locator(`#${await tripsMenu.getAttribute('aria-controls')}`);
  await tripsMenu.hover();
  await tripsPanel.locator('a').first().hover();
  assert.equal(await tripsPanel.getAttribute('hidden'), null, 'desktop menu must remain open while the pointer enters its panel');
  await tripsPanel.locator('a').first().click();
  await page.waitForURL(/\/website\/routes\//);

  await page.goto(`${origin}/website/`, { waitUntil: 'domcontentloaded' });
  const keyboardMenu = page.getByRole('button', { name: 'Packages', exact: true });
  const keyboardPanel = page.locator(`#${await keyboardMenu.getAttribute('aria-controls')}`);
  await keyboardMenu.focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await keyboardPanel.getAttribute('hidden'), null, 'desktop menu must open with ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-menu-panel]') !== null), true, 'desktop menu must move focus into its panel');
  await page.keyboard.press('Escape');
  assert.notEqual(await keyboardPanel.getAttribute('hidden'), null, 'keyboard Escape must close the open menu');
  recordBehavior('desktop-menu-keyboard', 'ArrowDown moves focus into a desktop menu and Escape closes it', '/website/');
  await page.getByRole('button', { name: 'Trips', exact: true }).click();
  await page.mouse.click(24, 300);
  assert.notEqual(await page.locator(`#${await page.getByRole('button', { name: 'Trips', exact: true }).getAttribute('aria-controls')}`).getAttribute('hidden'), null, 'outside click must close desktop menus');

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${origin}/website/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#mobileMenuToggle').click();
  for (const accordionButton of await page.locator('#mobileNavigation [data-mobile-menu-button]').all()) {
    await accordionButton.click();
    const panelId = await accordionButton.getAttribute('aria-controls');
    assert.equal(await page.locator(`#${panelId}`).getAttribute('hidden'), null, 'mobile menu group must open as an accordion');
  }
  recordBehavior('mobile-menu', 'Mobile navigation opens and groups expand as accordions', '/website/');

  await page.goto(`${origin}/website/routes/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#routeFilter').fill('Georgetown');
  await page.locator('#routeFilterClear').click();
  assert.equal(await page.locator('#routeFilter').inputValue(), '', 'route clear action must reset the public directory');
  buttonMatrix.push({ route: '/website/routes/', label: 'Clear search', mechanism: 'route-filter-clear', type: 'button', id: 'routeFilterClear', status: 'verified-by-click' });
  recordBehavior('route-filter-clear', 'Route directory query clears and restores all routes', '/website/routes/');

  routesShouldFail = true;
  await page.goto(`${origin}/website/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#retryRoutes').waitFor({ state: 'visible' });
  buttonMatrix.push({ route: '/website/', label: 'Try again', mechanism: 'routes-retry', type: 'button', id: 'retryRoutes', status: 'verified-by-error-state' });
  recordBehavior('routes-retry', 'Route service error recovers after retry', '/website/');
  routesShouldFail = false;
  await page.locator('#retryRoutes').click();
  await page.locator('#routesBrowseLink').waitFor({ state: 'visible' });
  await page.waitForFunction(() => /routes? available/i.test(document.querySelector('#routesState')?.textContent || ''));
  assert.match(await page.locator('#routesState').textContent(), /routes? available/i, 'route retry must recover the route directory');

  await page.goto(`${origin}/website/packages/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-package-step="2"]').click();
  assert.equal(await page.locator('[data-package-title]').textContent(), 'Follow', 'parcel stage control must update the content');
  assert.equal(await page.locator('[data-package-link]').getAttribute('href'), '/track-package/', 'parcel stage must expose its real next action');
  assert.equal(await page.locator('[data-package-step="2"]').getAttribute('aria-controls'), 'packageStagePanel', 'parcel tabs must point to their content panel');
  await page.locator('[data-package-step="2"]').focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('[data-package-step="1"]').getAttribute('aria-selected'), 'true', 'parcel tabs must support keyboard navigation');
  assert.equal(await page.locator('#packageStagePanel').getAttribute('aria-labelledby'), 'package-step-1', 'parcel panel must track the active tab');
  recordBehavior('package-step', 'Parcel tab click and ArrowLeft update the active stage', '/website/packages/');

  // The dedicated Trips page must submit the same real search contract as the
  // home planner, preserving every parameter when handing off to Passenger.
  await page.goto(`${origin}/website/trips/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(document.querySelector('[name="origin"] option[value="Georgetown"]')));
  await page.locator('[name="origin"]').selectOption('Georgetown');
  await page.locator('[name="destination"]').selectOption('New Amsterdam');
  await page.locator('[name="date"]').fill('2027-01-08');
  await page.locator('[name="passengers"]').fill('2');
  await Promise.all([
    page.waitForURL('**/passenger/**'),
    page.locator('#bookingForm').evaluate((form) => form.requestSubmit()),
  ]);
  const tripSearchUrl = new URL(page.url());
  assert.equal(tripSearchUrl.searchParams.get('origin'), 'Georgetown', 'Trips search must preserve origin');
  assert.equal(tripSearchUrl.searchParams.get('destination'), 'New Amsterdam', 'Trips search must preserve destination');
  assert.equal(tripSearchUrl.searchParams.get('passengers'), '2', 'Trips search must preserve passenger count');
  assert.equal(tripSearchUrl.searchParams.get('date'), '2027-01-08', 'Trips search must preserve date');
  buttonMatrix.push({ route: '/website/trips/', label: 'Continue to results', mechanism: 'form:bookingForm', type: 'submit', id: '', status: 'verified-by-click' });
  recordBehavior('form-submit', 'Home and Trips booking forms transfer all search parameters to Passenger', '/website/trips/');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/website/live/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#routeMapCanvas').scrollIntoViewIfNeeded();
  await page.locator('#networkRouteSelect option[value="10"]').waitFor({ state: 'attached', timeout: 10000 });
  await page.locator('#networkRouteSelect').selectOption('10');
  await page.locator('[data-network-trip="trip-10"]').waitFor({ state: 'visible' });
  assert.match(await page.locator('#mapStatus').textContent(), /1 bus/i, 'Encore Live must report the selected route signal');
  const liveBusGeometry = await page.locator('[data-network-trip="trip-10"]').evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { height: rect.height, radius: style.borderRadius, boxSizing: style.boxSizing };
  });
  assert.ok(liveBusGeometry.height >= 40, 'Encore Live bus action must meet the touch target');
  assert.equal(liveBusGeometry.radius, '12px', 'Encore Live bus action must use the canonical control radius');
  assert.equal(liveBusGeometry.boxSizing, 'border-box', 'Encore Live bus action must use border-box geometry');
  await page.locator('[data-network-trip="trip-10"]').click();
  assert.equal(await page.locator('[data-network-trip="trip-10"]').getAttribute('aria-pressed'), 'true', 'Encore Live bus action must select the real marker');
  buttonMatrix.push({ route: '/website/live/', label: 'View on map', mechanism: 'live-trip-selection', type: 'button', id: '', status: 'verified-by-click' });
  recordBehavior('live-trip-selection', 'Selecting a live bus updates aria-pressed and map state', '/website/live/');

  liveShouldFail = true;
  await page.goto(`${origin}/website/live/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#routeMapCanvas').scrollIntoViewIfNeeded();
  await page.locator('[data-network-retry]').waitFor({ state: 'visible' });
  buttonMatrix.push({ route: '/website/live/', label: 'Try again', mechanism: 'live-retry', type: 'button', id: '', status: 'verified-by-error-state' });
  recordBehavior('live-retry', 'Live service error recovers after retry', '/website/live/');
  liveShouldFail = false;
  await page.locator('[data-network-retry]').click();
  await page.locator('#networkRouteSelect option[value="10"]').waitFor({ state: 'attached', timeout: 10000 });
  assert.equal(await page.locator('#serviceStatus').textContent(), 'Service available', 'Live retry must recover the service status');

  await page.goto(`${origin}/website/help/`, { waitUntil: 'domcontentloaded' });
  for (const helpItem of await page.locator('.help-faq-list details').all()) {
    if (await helpItem.getAttribute('open') !== null) await helpItem.locator('summary').click();
    await helpItem.locator('summary').click();
    assert.equal(await helpItem.getAttribute('open'), '', 'FAQ summary must reveal its answer');
    await helpItem.locator('summary').click();
    assert.notEqual(await helpItem.getAttribute('open'), '', 'FAQ summary must close its answer');
  }

  await page.goto(`${origin}/website/`, { waitUntil: 'domcontentloaded' });
  for (const legalItem of await page.locator('.public-footer__legal details').all()) {
    await legalItem.locator('summary').click();
    assert.equal(await legalItem.getAttribute('open'), '', 'footer legal disclosure must reveal its copy');
    assert.ok((await legalItem.locator('p').textContent())?.trim(), 'footer legal disclosure must contain real copy');
  }
  recordBehavior('disclosure', 'All Help FAQ and footer legal details open and close', '/website/help/');

  for (const href of internalHrefs) {
    const response = await page.request.get(`${origin}${href || '/'}`);
    assert.ok(response.status() < 400, `internal Website destination ${href} returned ${response.status()}`);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await mkdir('artifacts/control-audit', { recursive: true });
assert.ok(controlInventory.length >= 500, `Website control inventory should include every public route control, found ${controlInventory.length}`);
const requiredBehaviors = [
  'navigation', 'desktop-menu', 'desktop-menu-keyboard', 'mobile-menu', 'route-swap',
  'form-field', 'form-submit', 'recent-search', 'locale-switch', 'route-filter-clear',
  'routes-retry', 'package-step', 'live-trip-selection', 'live-retry', 'disclosure',
];
const missingBehaviors = requiredBehaviors.filter((mechanism) => !behaviorEvidence.has(mechanism));
assert.deepEqual(missingBehaviors, [], `Website behavior coverage is incomplete: ${missingBehaviors.join(', ')}`);
await writeFile('artifacts/control-audit/website-control-coverage.json', `${JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'tests/website-controls-browser.test.mjs',
  inventory_rows: controlInventory.length,
  action_rows: buttonMatrix.length,
  required_behaviors: requiredBehaviors,
  behaviors: [...behaviorEvidence.values()].map((item) => ({ ...item, screens: [...item.screens] })),
}, null, 2)}\n`);
await writeFile('artifacts/control-audit/website-button-matrix.json', `${JSON.stringify({ generated_at: new Date().toISOString(), rows: buttonMatrix }, null, 2)}\n`);
await writeFile('artifacts/control-audit/website-control-inventory.json', `${JSON.stringify({
  generated_at: new Date().toISOString(),
  columns: ['Aplicación', 'Pantalla', 'Control', 'Propósito', 'Destino', 'Permisos', 'Estado', 'Prueba'],
  rows: controlInventory,
}, null, 2)}\n`);
console.log(`website-controls-browser.test.mjs: ${internalHrefs.size} internal destinations and all public control contracts passed`);
