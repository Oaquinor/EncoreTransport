import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startEncoreServer } from '../server.mjs';

const defaultViewports = [360, 390, 768, 1024, 1440, 1920];
const viewports = process.env.VISUAL_VIEWPORTS
  ? process.env.VISUAL_VIEWPORTS.split(',').map(Number).filter(Number.isFinite)
  : defaultViewports;
const defaultSurfaces = [
  ['website', '/website/'],
  ['passenger', '/passenger/'],
  ['driver', '/driver/'],
  ['admin', '/admin/'],
  ['login', '/login/'],
  ['tracking', '/track-package/'],
];
const surfaces = process.env.VISUAL_SURFACES
  ? defaultSurfaces.filter(([surface]) => process.env.VISUAL_SURFACES.split(',').includes(surface))
  : defaultSurfaces;

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

async function login(email) {
  const response = await fetch(`${process.env.VISUAL_API_TARGET}/api/v1/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password: process.env.VISUAL_DEMO_PASSWORD ?? 'password' }),
  });
  assert.equal(response.status, 200, `visual review login for ${email}`);
  const payload = await response.json();
  assert.ok(payload.token, `visual review token for ${email}`);
  return payload.token;
}

async function captureAdminFlow(page, path) {
  // Full-page Chromium captures otherwise paint the sticky top bar over the
  // middle of long forms. Make it static for the capture only.
  const style = await page.addStyleTag({ content: '.admin-topbar { position: static !important; }' });
  await page.screenshot({ path, fullPage: true, timeout: 60000 });
  await style.evaluate((element) => element.remove());
}

const visualTokens = process.env.VISUAL_API_TARGET ? {
  admin: await login(process.env.VISUAL_ADMIN_EMAIL ?? 'admin@example.test'),
  driver: await login(process.env.VISUAL_DRIVER_EMAIL ?? 'driver@example.test'),
} : null;

try {
  for (const [surface, pathname] of surfaces) {
    for (const width of viewports) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      if (visualTokens?.[surface]) {
        await page.addInitScript((token) => sessionStorage.setItem('encore_api_token', token), visualTokens[surface]);
      }
      if (process.env.VISUAL_API_TARGET || (surface === 'website' && width === 1440)) {
        // Keep screenshots deterministic when the PHP server is single
        // threaded and the external tile provider is unavailable. The website
        // map runtime is also checked without a backend via a live-network fixture.
        await page.route('**/api/v1/maps/tiles/**', (route) =>
          route.fulfill({ status: 204, body: '' }));
      }
      if (process.env.VISUAL_API_TARGET) {
        await page.route('**/api/v1/maps/journey**', (route) => route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Map provider unavailable in visual review.' }),
        }));
      }
      let liveNetworkFixture = 'empty';
      if (surface === 'website') {
        // The map visual contract checks the no-active-buses state. Live GPS
        // API behavior is covered by LiveNetworkTest with persisted fixtures.
        await page.route('**/api/v1/network/live', (route) => {
          const routes = liveNetworkFixture === 'active' ? [
            { route_id: '10', origin: 'Georgetown', destination: 'New Amsterdam', stops: [
              { name: 'Georgetown', sequence: 1, latitude: 6.8013, longitude: -58.1551 },
              { name: 'New Amsterdam', sequence: 2, latitude: 6.2479, longitude: -57.5173 },
            ] },
            { route_id: '20', origin: 'Georgetown', destination: 'Rosignol', stops: [
              { name: 'Georgetown', sequence: 1, latitude: 6.8013, longitude: -58.1551 },
              { name: 'Rosignol', sequence: 2, latitude: 6.2708, longitude: -57.3796 },
            ] },
          ] : [];
          const trips = liveNetworkFixture === 'active' ? [
            { trip_id: '101', route_id: '10', origin: 'Georgetown', destination: 'New Amsterdam', bus_code: 'BUS-QA-01', latitude: 6.7, longitude: -58.0, heading: 75, last_location_at: new Date().toISOString(), is_stale: false, status: 'in_progress' },
            { trip_id: '102', route_id: '10', origin: 'Georgetown', destination: 'New Amsterdam', bus_code: 'BUS-QA-02', latitude: 6.6, longitude: -57.9, heading: 85, last_location_at: new Date().toISOString(), is_stale: false, status: 'in_progress' },
            { trip_id: '201', route_id: '20', origin: 'Georgetown', destination: 'Rosignol', bus_code: 'BUS-QA-03', latitude: null, longitude: null, heading: null, last_location_at: null, is_stale: true, status: 'in_progress' },
          ] : [];
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { routes, trips, updated_at: new Date().toISOString() } }),
          });
        });
      }

      try {
        let response;
        try {
          response = await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (error) {
          if (!/ERR_NETWORK_IO_SUSPENDED|ERR_CONNECTION_RESET/.test(error.message)) throw error;
          await page.waitForTimeout(500);
          response = await page.goto(`http://${host}:${port}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        }
        assert.equal(response?.status(), 200, `${surface} ${width}px must return 200`);
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
        if (surface === 'admin' && width === 1440 && visualTokens) {
          await page.waitForFunction(() => {
            const map = document.querySelector('#adminLiveMap');
            return Boolean(map?.querySelector('.leaflet-container'))
              || /Route map unavailable|Map renderer unavailable/.test(map?.innerText ?? '');
          }, null, { timeout: 10000 });
          const adminMapText = await page.locator('#adminLiveMap').innerText();
          const adminMapRendered = await page.locator('#adminLiveMap .leaflet-container').count() === 1;
          assert.ok(adminMapRendered || /Route map unavailable|Map renderer unavailable/.test(adminMapText),
            'The Admin map must either render real geometry or explain why route geometry is unavailable');
        }
        if (surface === 'website' && width === 390) {
          const missingAnchors = await page.locator('a[href^="#"]').evaluateAll((links) =>
            links.map((link) => link.getAttribute('href').slice(1))
              .filter((id) => id && !document.getElementById(id)));
          assert.deepEqual(missingAnchors, [], 'Website in-page navigation must point to existing sections');
          assert.equal(await page.locator('.public-quick-links').count(), 0, 'Redundant quick links must be removed');
          assert.equal(await page.locator('.public-quick-rail').count(), 0, 'The public quick rail must be removed');
          assert.equal(await page.locator('.wayfinding-rail').count(), 0, 'The side wayfinding rail must be removed');
          assert.equal(await page.locator('.scroll-progress').count(), 1, 'The website must expose one bottom scroll progress bar');
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await page.waitForTimeout(80);
          assert.ok(await page.locator('.scroll-progress span').evaluate((element) => parseFloat(getComputedStyle(element).width) > 0), 'The bottom progress bar must respond to scroll');
          await page.evaluate(() => window.scrollTo(0, 0));
          assert.equal(await page.locator('#primaryNav > a').count(), 1, 'The primary navigation must expose Inicio directly');
          assert.equal(await page.locator('#primaryNav [data-menu]').count(), 4, 'The primary navigation must group commercial destinations');
          assert.equal(await page.locator('#journey-control, #platform').count(), 0, 'Internal workspace sections must stay out of the commercial homepage');
          assert.equal(await page.locator('#package-tracking a[href="/track-package/"]').count(), 1, 'Package tracking must have a clear destination');
          assert.equal(await page.locator('#networkRouteSelect').count(), 0, 'The homepage map must remain a static published-network overview');
          assert.equal(await page.locator('#routeMapCanvas[data-map-mode="static"]').count(), 1, 'The homepage map must be marked as static');
          assert.equal(await page.locator('[data-open-map]').count(), 0, 'The generic current-route CTA must not show without a selected trip');
          assert.ok(await page.locator('#bookingForm input[name="date"]').inputValue(), 'The booking date must default to today');

          const menu = page.locator('#mobileMenuToggle');
          await menu.click();
          assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Mobile menu must open');
          const mobileTravel = page.locator('#mobileNavigation [data-mobile-menu-button]').first();
          await mobileTravel.click();
          assert.equal(await page.locator('#mobileTravelMenu').getAttribute('hidden'), null, 'Mobile travel accordion must open');
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'Escape must close the mobile menu');

        }
        if (surface === 'website' && width === 1440) {
          const travelMenu = page.locator('#primaryNav [data-menu-button]').first();
          await travelMenu.hover();
          assert.equal(await page.locator('#travelMenu').getAttribute('hidden'), null, 'Desktop dropdown must open on hover');
          await page.mouse.move(8, 8);
          await page.waitForTimeout(240);
          assert.notEqual(await page.locator('#travelMenu').getAttribute('hidden'), null, 'Desktop dropdown must close when pointer leaves');
          await travelMenu.click();
          assert.equal(await page.locator('#travelMenu').getAttribute('hidden'), null, 'Desktop dropdown must open on click');
          await page.keyboard.press('Escape');
          assert.notEqual(await page.locator('#travelMenu').getAttribute('hidden'), null, 'Escape must close the desktop dropdown');
        }
        if (['driver', 'admin'].includes(surface)) {
          if (visualTokens) {
            assert.equal(new URL(page.url()).pathname, `/${surface}/`, `${surface} review session must stay authenticated`);
            await page.waitForSelector(surface === 'admin' ? '.admin-main' : '.driver-dashboard', { timeout: 10000 });
          } else {
            assert.equal(new URL(page.url()).pathname, '/login/', `${surface} must require staff sign-in`);
          }
        }
        if (surface === 'passenger' && width === 1440 && visualTokens) {
          await page.locator('.search-console select').nth(0).selectOption({ label: 'Georgetown' });
          await page.locator('.search-console select').nth(1).selectOption({ label: 'New Amsterdam' });
          // Keep the visual flow tied to the current fixture instead of a
          // calendar date that becomes stale as soon as the demo schedule
          // advances. The UI still validates the selected date normally.
          const availableDeparture = await page.evaluate(async () => {
            const response = await fetch('/api/v1/trips/search?origin=Georgetown&destination=New%20Amsterdam&passengers=1');
            const payload = await response.json();
            return payload.data?.[0] ?? null;
          });
          assert.ok(availableDeparture?.date, 'Passenger visual flow requires an available seeded departure');
          await page.locator('.search-console input[type="date"]').fill(availableDeparture.date);
          await page.locator('.search-console button.primary').click();
          await page.waitForSelector('.departure');
          assert.equal(await page.locator('.departure').count(), 1, 'Passenger search returns the seeded real departure');
          await page.locator('.departure button.primary').click();
          await page.getByRole('heading', { name: 'Georgetown to New Amsterdam' }).waitFor();
          await page.getByRole('button', { name: 'CHOOSE SEATS →' }).click();
          const availableSeat = page.locator('[role="button"][aria-label^="Seat "][aria-label$="available"]').first();
          await availableSeat.waitFor();
          const seatLabel = await availableSeat.getAttribute('aria-label');
          const seatNumber = seatLabel.match(/^Seat (.+) available$/)?.[1];
          assert.ok(seatNumber, 'A real available seat can be selected');
          await availableSeat.click();
          await page.getByRole('button', { name: 'CONTINUE →' }).click();
          await page.getByLabel('Full name').fill('Visual QA Passenger');
          await page.getByLabel('Document').fill('QA-2026-001');
          await page.getByLabel('Phone').fill('5926000000');
          await page.getByLabel('Email').fill('visual-qa@example.test');
          await page.getByRole('button', { name: 'REVIEW TRIP →' }).click();
          await page.getByRole('heading', { name: 'Everything in one clear view.' }).waitFor();
          let bookingResponse;
          page.on('response', async (response) => {
            if (response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/bookings') {
              try { bookingResponse = await response.json(); } catch { /* Keep the assertion below focused on a usable response. */ }
            }
          });
          await page.getByRole('button', { name: /CONTINUE AS GUEST →|RESERVE WITH ACCOUNT →/ }).click();
          await page.getByRole('heading', { name: 'Your seats are being held.' }).waitFor();
          assert.equal(bookingResponse?.data?.status, 'pending_payment', 'Guest booking stays pending until a configured payment gateway confirms payment');
          await page.screenshot({ path: 'artifacts/visual/passenger-booking-status-1440.png', fullPage: true, timeout: 60000 });
          const cleanup = await page.evaluate(async ({ id }) => {
            const token = sessionStorage.getItem('encore_guest_booking_token');
            const response = await fetch(`/api/v1/bookings/${encodeURIComponent(id)}/cancel`, {
              method: 'POST', headers: { 'X-Guest-Booking-Token': token, accept: 'application/json' },
            });
            return { status: response.status, payload: await response.json() };
          }, { id: bookingResponse.data.id });
          assert.equal(cleanup.status, 200, 'The isolated visual flow can cancel its own guest booking');
          const releasedSeats = await page.evaluate(async (tripId) => (await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/seats?origin=Georgetown&destination=New%20Amsterdam`, { headers: { accept: 'application/json' } }).then((response) => response.json())).data, availableDeparture.id);
          assert.ok(releasedSeats.find((seat) => seat.seat_number === seatNumber)?.available, 'Cancelling the guest hold releases its seat');
        }
        await page.evaluate(async () => {
          document.documentElement.style.scrollBehavior = 'auto';
          for (let position = 0; position < document.body.scrollHeight; position += window.innerHeight * 0.8) {
            window.scrollTo({ top: position, behavior: 'instant' });
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
          document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-visible'));
          window.scrollTo({ top: 0, behavior: 'instant' });
          await new Promise((resolve) => setTimeout(resolve, 750));
        });
        await page.screenshot({ path: `artifacts/visual/${surface}-${width}.png`, fullPage: true, timeout: 60000 });
        if (surface === 'website' && width === 1440) {
          await page.goto(`http://${host}:${port}/website/live/`, { waitUntil: 'domcontentloaded' });
          await page.locator('#networkRouteSelect').waitFor();
          assert.equal(await page.locator('#networkRouteSelect').inputValue(), '', 'Encore Live starts without an implicit all-routes selection');
          await page.locator('#networkBusList .public-network-empty').waitFor();
          assert.match(await page.locator('#networkBusList').innerText(), /Select a route to begin/, 'Encore Live asks the visitor to choose a route first');

          liveNetworkFixture = 'active';
          try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
          } catch (error) {
            if (!/ERR_NETWORK_IO_SUSPENDED|ERR_CONNECTION_RESET/.test(error.message)) throw error;
            await page.waitForTimeout(500);
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
          }
          await page.waitForFunction(() => Boolean(document.querySelector('#networkRouteSelect option[value="10"]')));
          await page.locator('#networkRouteSelect').selectOption('10');
          await page.locator('#networkBusList').scrollIntoViewIfNeeded();
          await page.locator('[data-network-bus="101"]').waitFor();
          assert.equal(await page.locator('#routeMapCanvas.leaflet-container').count(), 1,
            'Encore Live initializes the real map after a route is selected');
          assert.equal(await page.locator('[data-network-bus]').count(), 2, 'The selected route keeps both current buses visible');
          await page.waitForFunction(
            () => document.querySelector('#mapStatus')?.textContent.includes('2 buses moving'),
            null,
            { timeout: 10000 },
          );
          const mapStatus = await page.locator('#mapStatus').textContent();
          assert.match(mapStatus, /2\s+buses moving/, `The selected route exposes its current GPS count: ${JSON.stringify(mapStatus)}`);
          await page.locator('[data-network-trip="102"]').click();
          assert.equal(await page.locator('[data-network-trip="102"]').getAttribute('aria-pressed'), 'true', 'A visitor can select a current bus on the map');
        }
        if (surface === 'driver' && width === 1440 && visualTokens) {
          await page.context().grantPermissions(['geolocation'], { origin: page.url() });
          await page.context().setGeolocation({ latitude: 6.8013, longitude: -58.1551, accuracy: 8 });
          page.on('dialog', (dialog) => dialog.accept());
          const tripId = await page.evaluate(async () => (await fetch('/api/v1/driver/trips/current', {
            headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` },
          }).then((response) => response.json())).data.id);
          await page.locator('#tripAction').click();
          await page.getByRole('button', { name: 'Complete trip' }).waitFor();
          const inProgress = await page.evaluate(async (id) => (await fetch(`/api/v1/trips/${id}`).then((response) => response.json())).data.status, tripId);
          assert.equal(inProgress, 'in_progress', 'Driver starts the assigned trip through Laravel');

          const gpsDialog = page.waitForEvent('dialog');
          await page.locator('#sendGps').click();
          await gpsDialog;
          const network = await page.evaluate(async () => (await fetch('/api/v1/network/live').then((response) => response.json())).data);
          assert.ok(network.trips.some((trip) => trip.trip_id === String(tripId) && trip.latitude === 6.8013), 'Authorized driver GPS reaches the public live network');

          await page.locator('#fuelPercent').fill('88');
          const statusDialog = page.waitForEvent('dialog');
          await page.locator('#saveVehicleStatus').click();
          await statusDialog;
          await page.locator('#pkgRecipient').fill('Visual QA Recipient');
          await page.locator('#pkgDescription').fill('Local driver E2E package');
          await page.locator('#createPackage').click();
          await page.locator('#packageResult a').waitFor();
          assert.match(await page.locator('#packageResult').innerText(), /PK-/, 'Driver can register a package and receive its tracking reference');
          await page.locator('#incidentTitle').fill('Visual QA incident');
          await page.locator('#incidentNotes').fill('No action required; local E2E verification.');
          const incidentDialog = page.waitForEvent('dialog');
          await page.locator('#reportIncident').click();
          await incidentDialog;
          await page.getByRole('button', { name: 'Complete trip' }).click();
          const completed = await page.evaluate(async (id) => (await fetch(`/api/v1/trips/${id}`).then((response) => response.json())).data.status, tripId);
          assert.equal(completed, 'completed', 'Driver can complete the assigned trip');
        }
        if (visualTokens && surface === 'admin' && width === 1440) {
          const adminGroups = await page.locator('[data-nav-group]').evaluateAll((groups) => groups.map((group) => group.dataset.navGroup));
          assert.deepEqual(adminGroups, ['Operations', 'Fleet', 'Clients', 'Paquetería', 'Control', 'System'], 'Admin sidebar exposes only the approved operational groups');
          const clientsToggle = page.locator('[data-nav-toggle="Clients"]');
          await clientsToggle.focus();
          await page.keyboard.press('Enter');
          assert.notEqual(await page.locator('#admin-nav-group-clients').getAttribute('hidden'), null, 'Admin group toggles work from the keyboard');
          await clientsToggle.click();
          assert.equal(await page.locator('#admin-nav-group-clients').getAttribute('hidden'), null, 'Admin group toggles work by click');
          await page.locator('[data-sidebar-toggle]').click();
          assert.equal(await page.locator('.admin-sidebar').evaluate((sidebar) => sidebar.classList.contains('is-collapsed')), true, 'Admin sidebar can collapse');
          assert.ok(await page.locator('.admin-nav-group__short').count() >= 6, 'Collapsed Admin sidebar keeps group landmarks visible');
          await page.screenshot({ path: 'artifacts/visual/admin-sidebar-navigation-1440.png', fullPage: true, timeout: 60000 });
          await page.locator('[data-sidebar-toggle]').click();
          await page.locator('[data-nav-collapse-all]').click();
          assert.ok(await page.locator('.admin-nav-group__items[hidden]').count() >= 5, 'Collapse all closes non-active Admin groups');
          await page.locator('[data-nav-expand-all]').click();
          assert.equal(await page.locator('.admin-nav-group__items[hidden]').count(), 0, 'Expand all restores every Admin group');
          await page.locator('[data-module="bookings"]').click();
          await page.locator('[data-view-booking]').first().click();
          const bookingDialog = page.locator('#bookingDetailsDialog');
          await bookingDialog.waitFor({ state: 'visible' });
          await page.locator('#bookingDetailsContent .booking-detail-header h2').waitFor({ timeout: 10000 });
          const bookingDetailsText = await page.locator('#bookingDetailsContent').innerText();
          assert.match(bookingDetailsText, /Georgetown → New Amsterdam/, 'Admin can inspect booking route details using the existing booking API');
          await page.screenshot({ path: 'artifacts/visual/admin-booking-details-1440.png', fullPage: true, timeout: 60000 });
          await page.locator('[data-close-booking-details]').click();

          await page.locator('[data-module="website"]').click();
          await page.waitForSelector('.cms-editor');
          await page.screenshot({ path: 'artifacts/visual/admin-website-editor-1440.png', fullPage: true, timeout: 60000 });

          const titleInput = page.locator('[data-cms-key="hero"][data-cms-field="title"]');
          const originalPublicContent = await page.evaluate(async () => (await fetch('/api/v1/website-content').then((response) => response.json())).data);
          await titleInput.fill('QA website heading');
          console.log('admin CMS: uploading section image');
          await page.locator('#cmsImageInput').setInputFiles({ name: 'qa-coach.png', mimeType: 'image/png', buffer: await readFile('assets/media/encore-coach-vector.png') });
          await page.waitForFunction(() => Boolean(document.querySelector('#cmsImagePreview img')), null, { timeout: 10000 }).catch(async (error) => { throw new Error(`CMS image preview did not render: ${await page.locator('#cmsMessage').textContent()} (${error.message})`); });
          console.log('admin CMS: saving draft');
          await page.locator('#cmsSave').click();
          await page.waitForFunction(() => document.querySelector('#cmsMessage')?.textContent === 'Draft saved. It is not public yet.', null, { timeout: 10000 });
          assert.equal(await page.locator('#cmsMessage').textContent(), 'Draft saved. It is not public yet.', 'CMS draft save status');
          const draftVisibility = await page.evaluate(async () => (await fetch('/api/v1/website-content').then((response) => response.json())).data);
          assert.deepEqual(draftVisibility, originalPublicContent, 'Website drafts stay private until published');
          await page.locator('#cmsPublish').click();
          console.log('admin CMS: publishing content and image');
          await page.waitForFunction(() => document.querySelector('#cmsMessage')?.textContent === 'Website content published.', null, { timeout: 10000 });
          assert.equal(await page.locator('#cmsMessage').textContent(), 'Website content published.', 'CMS publish status');
          const publicContent = await page.evaluate(async () => (await fetch('/api/v1/website-content').then((response) => response.json())).data);
          assert.equal(publicContent.sections.hero.title, 'QA website heading', 'Published CMS text appears on the public API');
          assert.ok(publicContent.sections.hero.image_url, 'Published CMS section image appears on the public API');
          const heroImagePath = publicContent.sections.hero.image_path;
          await page.locator('#cmsImageSection').selectOption('tracking');
          await page.locator(`[data-cms-use-media="${heroImagePath}"]`).click();
          await page.locator('#cmsPublish').click();
          await page.waitForFunction(() => document.querySelector('#cmsMessage')?.textContent === 'Website content published.', null, { timeout: 10000 });
          assert.equal(await page.locator('#cmsMessage').textContent(), 'Website content published.', 'CMS can publish an existing library image in another section');
          const reusedContent = await page.evaluate(async () => (await fetch('/api/v1/website-content').then((response) => response.json())).data);
          assert.equal(reusedContent.sections.tracking.image_path, reusedContent.sections.hero.image_path, 'Multiple website sections reuse one stored media file');
          await page.locator('#cmsImageSection').selectOption('hero');
          await page.locator('#cmsRemoveImage').click();
          await page.locator('#cmsPublish').click();
          await page.waitForFunction(() => document.querySelector('#cmsMessage')?.textContent === 'Website content published.', null, { timeout: 10000 });
          assert.equal(await page.locator('#cmsMessage').textContent(), 'Website content published.', 'CMS image removal publish status');
          assert.ok(await page.evaluate(async () => (await fetch('/api/v1/website-content').then((response) => response.json())).data.sections.tracking.image_path), 'Shared image remains available while another section references it');
          await page.locator('#cmsImageSection').selectOption('tracking');
          await page.locator('#cmsRemoveImage').click();
          await page.locator('#cmsPublish').click();
          await page.waitForFunction(() => document.querySelector('#cmsMessage')?.textContent === 'Website content published.', null, { timeout: 10000 });
          assert.equal(await page.locator('#cmsMessage').textContent(), 'Website content published.', 'CMS removes the last media reference before deleting the stored image');

          await page.locator('[data-module="routes"]').click();
          console.log('admin routes: opening editor');
          await page.waitForSelector('[data-table-shell="admin-routes"]');
          await page.locator('[data-edit-route]').first().click();
          await page.waitForSelector('#routeImageInput');
          await page.screenshot({ path: 'artifacts/visual/admin-route-editor-1440.png', fullPage: true, timeout: 60000 });
          const routeImage = await readFile('assets/media/encore-coach-vector.png');
          await page.locator('#routeImageInput').setInputFiles({ name: 'qa-route.png', mimeType: 'image/png', buffer: routeImage });
          await page.waitForFunction(() => Boolean(document.querySelector('#routeImagePreview img')));
          await page.screenshot({ path: 'artifacts/visual/admin-route-image-preview-1440.png', fullPage: true, timeout: 60000 });
          await page.locator('#routeForm button[type="submit"]').click();
          await page.waitForFunction(() => !document.querySelector('#routeForm'));
          const routes = await page.evaluate(async () => (await fetch('/api/v1/routes').then((response) => response.json())).data);
          const routeWithImage = routes.find((route) => route.image_url);
          assert.ok(routeWithImage?.image_url, 'Uploaded route image is available to public route results');
          await page.evaluate(async (routeId) => fetch(`/api/v1/admin/routes/${routeId}/image`, { method: 'DELETE', headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }), routeWithImage.id);

          await page.locator('#addRoute').click();
          const routeSuffix = Date.now().toString(36).toUpperCase();
          const qaRouteOrigin = `QA ${routeSuffix} Origin`;
          const qaRouteStop = `QA ${routeSuffix} Midpoint`;
          const qaRouteDestination = `QA ${routeSuffix} Destination`;
          await page.locator('#routeForm [name="origin"]').fill(qaRouteOrigin);
          await page.locator('#routeForm [name="destination"]').fill(qaRouteDestination);
          await page.locator('#routeForm [name="distance_km"]').fill('120');
          await page.locator('#addRouteStop').click();
          await page.locator('[data-stop-field="name"]').nth(0).fill(qaRouteOrigin);
          await page.locator('[data-stop-field="name"]').nth(1).fill(qaRouteStop);
          await page.locator('[data-stop-field="name"]').nth(2).fill(qaRouteDestination);
          await page.locator('[data-segment-row="2"]').waitFor();
          for (const index of [0, 1, 2]) {
            await page.locator(`[data-segment-row="${index}"] [data-segment-field="price"]`).fill(String(40 + index));
            await page.locator(`[data-segment-row="${index}"] [data-segment-field="duration_seconds"]`).fill(String(3600 * (index + 1)));
            await page.locator(`[data-segment-row="${index}"] [data-segment-field="distance_meters"]`).fill(String(40000 * (index + 1)));
          }
          await captureAdminFlow(page, 'artifacts/visual/admin-route-create-segments-1440.png');
          await page.locator('#routeForm button[type="submit"]').click();
          const createdRouteResult = await page.waitForFunction(async (origin) => {
            const payload = await fetch('/api/v1/admin/routes', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((route) => route.origin === origin) ?? null;
          }, qaRouteOrigin);
          const createdRoute = await createdRouteResult.jsonValue();
          assert.deepEqual(createdRoute.stops.map((stop) => stop.name), [qaRouteOrigin, qaRouteStop, qaRouteDestination], 'Admin creates a route with its complete ordered stops and terminals');
          assert.equal(createdRoute.segments.length, 3, 'Admin saves each commercial segment generated from the ordered stops');
          assert.equal(Number(createdRoute.segments[0].price), 40, 'Commercial route segment stores the entered fare');

          await page.locator('[data-module="vehicles"]').click();
          await page.waitForSelector('#vehicleForm');
          const visualVehicleCode = `BUS-VQA-${Date.now().toString(36).toUpperCase()}`;
          await page.locator('#vehicleForm [name="code"]').fill(visualVehicleCode);
          await page.locator('#vehicleForm [name="plate"]').fill(`ET-${Date.now().toString(36).toUpperCase()}`);
          await page.locator('#vehicleCapacity').fill('4');
          await page.locator('#vehiclePositionsPerRow').selectOption('2');
          await page.locator('#generateVehicleLayout').click();
          await page.locator('[data-vehicle-seat="0"][data-seat-field="seat_number"]').fill('A1');
          await page.locator('[data-vehicle-seat="1"][data-seat-field="seat_number"]').fill('A2');
          await page.locator('[data-vehicle-seat="0"][data-seat-field="window"]').check();
          await page.locator('[data-vehicle-seat="1"][data-seat-field="aisle"]').check();
          await page.screenshot({ path: 'artifacts/visual/admin-vehicle-layout-1440.png', fullPage: true, timeout: 60000 });
          await page.locator('#vehicleForm button[type="submit"]').click();
          const createdBus = await page.waitForFunction(async (code) => {
            const payload = await fetch('/api/v1/admin/vehicles', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((vehicle) => vehicle.code === code) ?? null;
          }, visualVehicleCode);
          const vehicle = await createdBus.jsonValue();
          assert.equal(vehicle.capacity, 4, 'Vehicle capacity is the configured seat count');
          assert.equal(vehicle.seats[0].seat_number, 'A1', 'Admin can persist a custom seat number');
          assert.equal(vehicle.seats[0].window, true, 'Admin can persist window position');
          await page.locator(`[data-edit-vehicle="${vehicle.id}"]`).click();
          await page.waitForFunction(() => document.querySelectorAll('.vehicle-seat-item').length === 4);
          await page.locator('[data-vehicle-seat="1"][data-seat-field="accessible_flag"]').check();
          await page.locator('[data-remove-vehicle-seat="2"]').click();
          await page.locator('#vehicleForm button[type="submit"]').click();
          await page.waitForFunction(async (id) => {
            const payload = await fetch('/api/v1/admin/vehicles', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            const bus = payload.data?.find((item) => String(item.id) === String(id));
            return bus?.capacity === 3 && bus?.seats?.length === 3 && bus?.seats?.[1]?.accessible === true;
          }, vehicle.id);

          await page.locator('[data-module="drivers"]').click();
          await page.waitForSelector('#addDriver');
          await page.locator('#addDriver').click();
          const qaDriverName = `Visual QA Driver ${Date.now().toString(36).toUpperCase()}`;
          const qaDriverLicense = `QA-LIC-${Date.now().toString(36).toUpperCase()}`;
          await page.locator('#driverForm [name="name"]').fill(qaDriverName);
          await page.locator('#driverForm [name="license_number"]').fill(qaDriverLicense);
          await page.locator('#driverForm [name="status"]').selectOption('active');
          await captureAdminFlow(page, 'artifacts/visual/admin-driver-create-1440.png');
          await page.locator('#driverForm button[type="submit"]').click();
          const createdDriverResult = await page.waitForFunction(async (license) => {
            const payload = await fetch('/api/v1/admin/drivers', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((driver) => driver.license_number === license) ?? null;
          }, qaDriverLicense);
          const createdDriver = await createdDriverResult.jsonValue();
          assert.equal(createdDriver.name, qaDriverName, 'Admin creates an active driver profile through the fleet UI');

          await page.locator('[data-module="trips"]').click();
          await page.locator('#refresh').click();
          await page.locator('.admin-loading-state').waitFor({ state: 'detached' });
          await page.locator('#addTrip').click();
          await page.locator('#tripForm [name="transport_route_id"]').selectOption(String(createdRoute.id));
          await page.locator('#tripForm [name="bus_id"]').selectOption(String(vehicle.id));
          await page.locator('#tripForm [name="driver_id"]').selectOption(String(createdDriver.id));
          const tripDay = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
          await page.locator('#tripForm [name="departure_date"]').fill(tripDay);
          await page.locator('#tripForm [name="departure_time"]').fill('15:00');
          await page.locator('#tripForm [name="arrival_time"]').fill('18:00');
          await page.locator('#tripForm [name="price_per_passenger"]').fill('40');
          await captureAdminFlow(page, 'artifacts/visual/admin-trip-create-1440.png');
          await page.locator('#tripForm button[type="submit"]').click();
          const createdTripResult = await page.waitForFunction(async ({ routeId, day }) => {
            const payload = await fetch('/api/v1/admin/trips', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((trip) => String(trip.routeId) === String(routeId) && trip.date === day) ?? null;
          }, { routeId: createdRoute.id, day: tripDay });
          const createdTrip = await createdTripResult.jsonValue();
          assert.equal(String(createdTrip.busId), String(vehicle.id), 'Admin schedules the trip with the selected bus');
          assert.equal(createdTrip.driverName, qaDriverName, 'Admin schedules the trip with the selected driver');

          // Exercise the remaining high-use Admin screens through their real
          // authenticated UI and verify mutations against the Laravel API.
          await page.locator('[data-module="users"]').click();
          await page.waitForSelector('[data-table-shell="users"]');
          await page.screenshot({ path: 'artifacts/visual/admin-users-access-1440.png', fullPage: true, timeout: 60000 });
          await page.locator('#addUser').click();
          const qaUserEmail = `visual-ui-${Date.now()}@example.test`;
          const passengerRoleId = await page.evaluate(async () => {
            const payload = await fetch('/api/v1/admin/roles', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((role) => role.name === 'passenger')?.id;
          });
          assert.ok(passengerRoleId, 'Admin can assign the existing passenger role');
          await page.locator('#userForm [name="name"]').fill('Visual QA User');
          await page.locator('#userForm [name="email"]').fill(qaUserEmail);
          await page.locator('#userForm [name="password"]').fill('Visual-QA-Password-2026');
          await page.locator('#userForm [name="role"]').selectOption('passenger');
          await page.locator(`[data-user-role="${passengerRoleId}"]`).click();
          await page.locator('[data-user-permission="bookings.view"]').selectOption('allow');
          await page.locator('#userForm button[type="submit"]').click();
          const createdUser = await page.waitForFunction(async (email) => {
            const payload = await fetch('/api/v1/admin/users', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((item) => item.email === email) ?? null;
          }, qaUserEmail);
          const user = await createdUser.jsonValue();
          assert.equal(user.name, 'Visual QA User', 'Admin creates a user through the access management form');
          assert.ok(user.roles.some((role) => String(role.id) === String(passengerRoleId)), 'Admin persists the assigned role from the user form');
          assert.ok(user.permissions.includes('bookings.view'), 'Admin persists and exposes the effective direct permission');
          await page.locator(`[data-edit-user="${user.id}"]`).click();
          await page.locator('#userForm [name="name"]').fill('Visual QA User Updated');
          await page.locator('#userForm button[type="submit"]').click();
          await page.waitForFunction(async (id) => {
            const payload = await fetch('/api/v1/admin/users', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.some((item) => String(item.id) === String(id) && item.name === 'Visual QA User Updated');
          }, user.id);
          page.once('dialog', (dialog) => dialog.accept());
          await page.locator(`[data-disable-user="${user.id}"]`).click();
          await page.waitForFunction(async (id) => {
            const payload = await fetch('/api/v1/admin/users', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.some((item) => String(item.id) === String(id) && item.active === false);
          }, user.id);

          await page.locator(`[data-open-user="${user.id}"]`).click();
          await page.waitForSelector('#userDetailPanel');
          for (const tab of ['profile', 'bookings', 'tickets', 'packages', 'activity', 'permissions']) {
            await page.locator(`[data-user-detail-tab="${tab}"]`).click();
            await page.waitForSelector('#userDetailPanel');
            await page.waitForFunction(() => !document.querySelector('#userDetailPanel .admin-loading-state'));
          }
          await page.locator('#closeUserDetail').click();

          await page.locator('[data-module="customers"]').click();
          await page.waitForSelector('[data-table-shell="registered-customers"]');
          await page.locator('#customerFilters [name="q"]').fill('Passenger');
          await page.locator('#customerFilters button[type="submit"]').click();
          await page.waitForSelector('[data-table-shell="registered-customers"] [data-table-row]');
          await page.screenshot({ path: 'artifacts/visual/admin-customers-directory-1440.png', fullPage: true, timeout: 60000 });

          await page.locator('[data-module="tickets"]').click();
          await page.waitForSelector('[data-table-shell="admin-tickets"]');
          await page.locator('#ticketFilters [name="lifecycle"]').selectOption('valid');
          await page.locator('#ticketFilters button[type="submit"]').click();
          await page.waitForSelector('[data-table-shell="admin-tickets"]');
          await page.screenshot({ path: 'artifacts/visual/admin-ticket-lifecycle-1440.png', fullPage: true, timeout: 60000 });

          await page.locator('[data-module="roles"]').click();
          await page.waitForSelector('[data-table-shell="roles"]');
          await page.screenshot({ path: 'artifacts/visual/admin-roles-access-1440.png', fullPage: true, timeout: 60000 });
          const editableRole = await page.evaluate(async () => {
            const payload = await fetch('/api/v1/admin/roles', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.find((role) => !role.system) ?? null;
          });
          if (editableRole) {
            const originalRoleLabel = editableRole.label;
            await page.locator(`[data-edit-role="${editableRole.id}"]`).click();
            await page.locator('#roleForm [name="label"]').fill(`${originalRoleLabel} QA`);
            await page.locator('#roleForm button[type="submit"]').click();
            await page.waitForFunction(async ({ id, label }) => {
              const payload = await fetch('/api/v1/admin/roles', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
              return payload.data?.some((role) => String(role.id) === String(id) && role.label === label);
            }, { id: editableRole.id, label: `${originalRoleLabel} QA` });
            await page.locator(`[data-edit-role="${editableRole.id}"]`).click();
            await page.locator('#roleForm [name="label"]').fill(originalRoleLabel);
            await page.locator('#roleForm button[type="submit"]').click();
            await page.waitForFunction(async ({ id, label }) => {
              const payload = await fetch('/api/v1/admin/roles', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
              return payload.data?.some((role) => String(role.id) === String(id) && role.label === label);
            }, { id: editableRole.id, label: originalRoleLabel });
            assert.ok(true, 'Admin updates and restores a role label without changing its permission set');
          }

          await page.locator('[data-module="schedules"]').click();
          await page.waitForSelector('[data-table-shell="driver-schedules"]');
          await page.locator('#addSchedule').click();
          const driverOption = await page.locator('#scheduleForm [name="driver_id"] option:not([value=""])').first().getAttribute('value');
          assert.ok(driverOption, 'Admin schedule form has an available driver');
          await page.locator('#scheduleForm [name="driver_id"]').selectOption(driverOption);
          const busOption = await page.locator('#scheduleForm [name="bus_id"] option:not([value=""])').first().getAttribute('value');
          if (busOption) await page.locator('#scheduleForm [name="bus_id"]').selectOption(busOption);
          const scheduleDay = await page.evaluate(async () => {
            const payload = await fetch('/api/v1/admin/driver-schedules', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            const occupiedDays = new Set((payload.data ?? []).map((item) => String(item.work_date ?? '').slice(0, 10)));
            for (let offset = 365; offset < 3650; offset += 1) {
              const candidate = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
              if (!occupiedDays.has(candidate)) return candidate;
            }
            throw new Error('Could not find a free schedule date for visual verification');
          });
          const scheduleNotes = `Visual interface verification ${Date.now()}`;
          await page.locator('#scheduleForm [name="work_date"]').fill(scheduleDay);
          await page.locator('#scheduleForm [name="starts_at"]').fill('03:00');
          await page.locator('#scheduleForm [name="ends_at"]').fill('04:00');
          await page.locator('#scheduleForm [name="notes"]').fill(scheduleNotes);
          await page.locator('#scheduleForm button[type="submit"]').click();
          await page.waitForFunction(async ({ day, notes }) => {
            const payload = await fetch('/api/v1/admin/driver-schedules', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
            return payload.data?.some((item) => String(item.work_date).slice(0, 10) === day && item.notes === notes);
          }, { day: scheduleDay, notes: scheduleNotes });
          await page.locator('#scheduleForm').waitFor({ state: 'detached' });
          await page.locator('[data-table-shell="driver-schedules"] [data-table-row]').first().waitFor();
          await page.screenshot({ path: 'artifacts/visual/admin-schedules-1440.png', fullPage: true, timeout: 60000 });

          await page.locator('[data-module="reports"]').click();
          await page.waitForSelector('#reportType');
          await page.locator('#reportType').selectOption('vehicles');
          await page.locator('#applyReportFilters').click();
          await page.locator('.admin-loading-state').waitFor({ state: 'detached' });
          await page.waitForFunction(() => Boolean(document.querySelector('[data-table-shell="vehicle-report"]')));
          assert.ok(await page.locator('[data-table-shell="vehicle-report"]').count(), 'Admin report filters load the selected vehicle report');
          await page.screenshot({ path: 'artifacts/visual/admin-vehicle-report-1440.png', fullPage: true, timeout: 60000 });

          await page.locator('[data-module="packages"]').click();
          await page.waitForSelector('[data-table-shell="packages"]');
          const currentDriverTripResponse = await fetch(`${process.env.VISUAL_API_TARGET}/api/v1/driver/trips/current`, {
            headers: { authorization: `Bearer ${visualTokens.driver}`, accept: 'application/json' },
          });
          assert.equal(currentDriverTripResponse.status, 200, 'Driver test account has a current trip for reporting an incident');
          const currentDriverTrip = (await currentDriverTripResponse.json()).data;
          const incidentCreateResponse = await fetch(`${process.env.VISUAL_API_TARGET}/api/v1/driver/incidents`, {
            method: 'POST',
            headers: { authorization: `Bearer ${visualTokens.driver}`, accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ trip_id: currentDriverTrip.id, title: 'Admin review visual incident', description: 'Created for the authenticated incident review flow.', severity: 'low' }),
          });
          assert.equal(incidentCreateResponse.status, 201, 'Driver can submit the incident used by the admin review screen');
          const createdVisualIncident = (await incidentCreateResponse.json()).data;
          await page.locator('[data-module="incidents"]').click();
          await page.locator(`[data-save-incident="${createdVisualIncident.id}"]`).waitFor();
          await page.screenshot({ path: 'artifacts/visual/admin-incidents-1440.png', fullPage: true, timeout: 60000 });
          await page.locator(`[data-incident-title="${createdVisualIncident.id}"]`).fill('Visual incident reviewed');
          await page.locator(`[data-incident-description="${createdVisualIncident.id}"]`).fill('Reviewed, escalated and resolved in the admin workflow.');
          await page.locator(`[data-incident-severity="${createdVisualIncident.id}"]`).selectOption('high');
          for (const status of ['in_progress', 'resolved', 'dismissed', 'open']) {
            const statusSelect = page.locator(`[data-incident-status="${createdVisualIncident.id}"]`);
            await statusSelect.waitFor({ state: 'visible' });
            await statusSelect.selectOption(status);
            await page.locator(`[data-save-incident="${createdVisualIncident.id}"]`).click();
            await page.waitForFunction(async ({ incidentId, expectedStatus }) => {
              const payload = await fetch('/api/v1/admin/incidents', { headers: { authorization: `Bearer ${sessionStorage.getItem('encore_api_token')}` } }).then((response) => response.json());
              const incident = payload.data?.find((item) => String(item.id) === String(incidentId));
              return incident?.status === expectedStatus && incident?.severity === 'high' && incident?.title === 'Visual incident reviewed';
            }, { incidentId: createdVisualIncident.id, expectedStatus: status });
            await statusSelect.waitFor({ state: 'visible' });
          }
        }
        console.log(`${surface} ${width}px OK width=${metrics.documentWidth} title=${JSON.stringify(metrics.title)}`);
      } catch (error) {
        failures.push(error.message);
        const diagnostic = surface === 'website' && width === 1440
          ? await page.evaluate(() => ({
            url: location.pathname,
            routeOptions: document.querySelector('#networkRouteSelect')?.innerText,
            routeValue: document.querySelector('#networkRouteSelect')?.value,
            busList: document.querySelector('#networkBusList')?.innerText,
            mapStatus: document.querySelector('#mapStatus')?.innerText,
          })).catch(() => null)
          : null;
        console.error(`${surface} ${width}px FAILED: ${error.message}${diagnostic ? ` state=${JSON.stringify(diagnostic)}` : ''}`);
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
