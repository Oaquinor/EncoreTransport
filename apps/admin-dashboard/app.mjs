import {
  getApiToken,
  me,
  logout,
  mapJourney,
  requestJson,
} from '../../packages/shared/api.mjs';
import {
  renderJourneyMap,
  destroyRealMap,
} from '../../packages/shared/real-map.mjs';
import { modules } from './src/module-registry.mjs';
import * as api from './src/api.mjs';
import {
  dashboardView,
  table,
  reportView,
} from './src/views.mjs';

const root = document.querySelector('#app');

const state = {
  module: 'dashboard',
  loading: true,
  error: '',
  accessDenied: false,
  dashboard: null,
  incidents: [],
  schedules: [],
  packages: [],
  vehicleStatus: [],
  reportType: 'executive',
  reportData: null,
  user: null,
};

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[character]));
}

function redirectLogin() {
  location.replace('/login/?return=' + encodeURIComponent('/admin/'));
}

function roleHome(role) {
  if (role === 'driver') return '/driver/';
  if (role === 'passenger') return '/passenger/';
  return '/website/';
}

async function ensureAdmin() {
  if (!getApiToken()) {
    redirectLogin();
    return false;
  }

  try {
    const payload = await me();
    state.user = payload.user ?? payload.data?.user ?? payload;

    if (state.user?.role !== 'admin') {
      state.loading = false;
      state.accessDenied = true;
      state.error = 'Your account is signed in, but it does not have permission to access Operations.';
      return false;
    }

    state.accessDenied = false;
    return true;
  } catch (error) {
    state.loading = false;

    if (error?.status === 401 || error?.status === 403) {
      redirectLogin();
      return false;
    }

    state.error = error?.message ?? 'Unable to verify your account.';
    return false;
  }
}

function sidebar() {
  let lastGroup = '';

  return `
    <aside class="admin-sidebar">
      <a class="admin-brand" href="/website/" aria-label="Encore Transport home">
        <img class="admin-brand__logo" src="/logo.svg" alt="" aria-hidden="true">
        <div>
          <strong>encore</strong>
          <small>transport · operations</small>
        </div>
      </a>

      <nav class="admin-nav" aria-label="Operations modules">
        ${modules.map((module) => {
          const group = module.group !== lastGroup
            ? `<div class="eyebrow" style="margin:16px 12px 6px">${esc(module.group)}</div>`
            : '';

          lastGroup = module.group;

          return `${group}
            <button
              class="admin-nav__item ${state.module === module.id ? 'admin-nav__item--active' : ''}"
              data-module="${module.id}"
              ${state.accessDenied ? 'disabled' : ''}>
              ${esc(module.label)}
            </button>`;
        }).join('')}
      </nav>
    </aside>`;
}

function liveMapPanel() {
  const trips = state.dashboard?.trips ?? [];

  const trip = trips.find((item) =>
    ['boarding', 'in_progress', 'scheduled'].includes(item.status)
  ) ?? trips[0];

  if (!trip) {
    return `
      <section class="admin-panel admin-panel--pad admin-map-panel">
        <div class="admin-map-panel__head">
          <div>
            <div class="eyebrow">Live route context</div>
            <h2>No trip available for mapping.</h2>
          </div>
        </div>
      </section>`;
  }

  return `
    <section class="admin-panel admin-panel--pad admin-map-panel">
      <div class="admin-map-panel__head">
        <div>
          <div class="eyebrow">Live route context</div>
          <h2>${esc(trip.route?.origin ?? '')} → ${esc(trip.route?.destination ?? '')}</h2>
          <small>Vehicle position appears only when the assigned driver has sent authorized GPS data.</small>
        </div>

        <span class="badge badge--neutral">${esc(trip.status ?? '')}</span>
      </div>

      <div
        id="adminLiveMap"
        class="admin-live-map"
        data-trip-id="${esc(trip.id)}"
        data-origin="${esc(trip.route?.origin ?? '')}"
        data-destination="${esc(trip.route?.destination ?? '')}"
        aria-label="Operations route map"></div>
    </section>`;
}

function content() {
  if (state.loading) {
    return `
      <section class="admin-panel admin-panel--pad admin-loading-state" aria-live="polite">
        <span class="admin-loading-state__spinner" aria-hidden="true"></span>
        <div>
          <h2>Loading Operations…</h2>
          <p>Checking your access and retrieving current data.</p>
        </div>
      </section>`;
  }

  if (state.accessDenied) {
    return `
      <section class="admin-panel admin-panel--pad admin-access-denied">
        <div class="eyebrow">Access denied</div>
        <h2>Operations is restricted to administrative accounts.</h2>
        <p>${esc(state.error)}</p>

        <div class="admin-access-denied__actions">
          <a class="button button--primary" href="${roleHome(state.user?.role)}">Go to my area</a>
          <button class="button button--ghost" id="logout">Sign out</button>
        </div>
      </section>`;
  }

  if (state.error) {
    return `
      <section class="admin-panel admin-panel--pad admin-error-state">
        <div class="eyebrow">Unable to load</div>
        <h2>Operations data could not be loaded.</h2>
        <p>${esc(state.error)}</p>
        <button class="button button--primary" id="retry">Retry</button>
      </section>`;
  }

  const dashboard = state.dashboard ?? {};

  if (state.module === 'dashboard') {
    return `${liveMapPanel()}${dashboardView(dashboard)}`;
  }

  if (state.module === 'trips') {
    return table(
      'Trips',
      ['Route', 'Date', 'Departure', 'Bus', 'Driver', 'Status'],
      (dashboard.trips ?? []).map((trip) => [
        trip.route?.origin && trip.route?.destination
          ? `${trip.route.origin} → ${trip.route.destination}`
          : '—',
        String(trip.departure_date ?? '').slice(0, 10),
        trip.departure_time,
        trip.bus?.code,
        trip.driver?.name,
        trip.status,
      ]),
    );
  }

  if (state.module === 'bookings') {
    return table(
      'Bookings',
      ['Reference', 'Passenger', 'Status', 'Total'],
      (dashboard.bookings ?? []).map((booking) => [
        booking.reference,
        booking.passenger_name,
        booking.status,
        booking.total_amount,
      ]),
    );
  }

  if (state.module === 'vehicles') {
    return table(
      'Vehicles',
      ['Code', 'Plate', 'Capacity', 'Status'],
      (dashboard.buses ?? []).map((bus) => [
        bus.code,
        bus.plate,
        bus.capacity,
        bus.status,
      ]),
    );
  }

  if (state.module === 'drivers') {
    return table(
      'Drivers',
      ['Name', 'License', 'Status'],
      (dashboard.drivers ?? []).map((driver) => [
        driver.name,
        driver.license_number,
        driver.status,
      ]),
    );
  }

  if (state.module === 'routes') {
    return table(
      'Routes',
      ['Origin', 'Destination', 'Distance', 'Active'],
      (dashboard.routes ?? []).map((route) => [
        route.origin,
        route.destination,
        route.distance_km ? `${route.distance_km} km` : '—',
        route.active ? 'Yes' : 'No',
      ]),
    );
  }

  if (state.module === 'incidents') {
    return table(
      'Incidents',
      ['Trip', 'Title', 'Severity', 'Status', 'Created'],
      state.incidents.map((incident) => [
        incident.trip?.id,
        incident.title,
        incident.severity,
        incident.status,
        incident.created_at,
      ]),
    );
  }

  if (state.module === 'schedules') {
    return table(
      'Driver schedules',
      ['Date', 'Driver', 'Vehicle', 'Start', 'End', 'Status'],
      state.schedules.map((schedule) => [
        String(schedule.work_date ?? '').slice(0, 10),
        schedule.driver?.name,
        schedule.bus?.code,
        schedule.starts_at,
        schedule.ends_at,
        schedule.status,
      ]),
    );
  }

  if (state.module === 'packages') {
    return table(
      'Packages',
      ['Reference', 'Route', 'Recipient', 'Status', 'Created'],
      state.packages.map((item) => [
        item.reference,
        item.trip?.route
          ? `${item.trip.route.origin} → ${item.trip.route.destination}`
          : '—',
        item.recipient_name,
        item.status,
        item.created_at,
      ]),
    );
  }

  if (state.module === 'reports') {
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div>
            <div class="eyebrow">Reports</div>
            <h2>Choose a business question</h2>
          </div>

          <select id="reportType" class="select">
            <option value="executive" ${state.reportType === 'executive' ? 'selected' : ''}>Executive dashboard</option>
            <option value="travel" ${state.reportType === 'travel' ? 'selected' : ''}>Travel Report</option>
            <option value="vehicles" ${state.reportType === 'vehicles' ? 'selected' : ''}>Vehicle Report</option>
            <option value="trips" ${state.reportType === 'trips' ? 'selected' : ''}>Trip Report</option>
            <option value="trip-costs" ${state.reportType === 'trip-costs' ? 'selected' : ''}>Trip Cost Summary</option>
          </select>
        </div>
      </section>

      ${state.reportData ? reportView(state.reportType, state.reportData) : ''}`;
  }

  return '';
}

function render() {
  root.innerHTML = `
    <div class="admin-layout motion-enter">
      ${sidebar()}

      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <div class="eyebrow">Centralized operations</div>
            <h1 class="page-title">${esc(modules.find((module) => module.id === state.module)?.label ?? 'Operations')}</h1>
          </div>

          <div class="admin-controls">
            <span>${esc(state.user?.name ?? '')}</span>
            ${state.accessDenied ? '' : '<button class="button button--ghost" id="refresh">Refresh</button>'}
            <button class="button button--ghost" id="logout">Logout</button>
          </div>
        </header>

        ${content()}
      </section>
    </div>`;

  wire();

  if (!state.accessDenied && !state.loading && !state.error) {
    void hydrateAdminMap();
  }
}

async function hydrateAdminMap() {
  const container = document.querySelector('#adminLiveMap');
  if (!container) return;

  const tripId = container.dataset.tripId;
  const origin = container.dataset.origin;
  const destination = container.dataset.destination;

  if (!tripId || !origin || !destination) return;

  try {
    const [journey, locationPayload] = await Promise.all([
      mapJourney(origin, destination),
      requestJson(`/trips/${tripId}/location`, { token: false })
        .catch(() => ({ data: null })),
    ]);

    await renderJourneyMap(container, journey, {
      driverLocation: locationPayload?.data ?? null,
    });
  } catch (error) {
    container.innerHTML = `
      <div class="encore-map-fallback">
        <div>
          <strong>Map unavailable</strong>
          <span>${esc(error.message)}</span>
        </div>
      </div>`;
  }
}

async function loadModule() {
  state.loading = true;
  state.error = '';
  render();

  try {
    if (!state.dashboard) {
      state.dashboard = await api.dashboard();
    }

    if (state.module === 'incidents') {
      state.incidents = await api.incidents();
    }

    if (state.module === 'schedules') {
      state.schedules = await api.schedules();
    }

    if (state.module === 'packages') {
      state.packages = await api.packages();
    }

    if (state.module === 'vehicles') {
      state.vehicleStatus = await api.vehicleStatus();
    }

    if (state.module === 'reports') {
      state.reportData = await api.report(state.reportType);
    }

    state.loading = false;
  } catch (error) {
    state.loading = false;
    state.error = error.message;
  }

  render();
}

function wire() {
  document.querySelectorAll('[data-module]').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.accessDenied) return;

      const mapContainer = document.querySelector('#adminLiveMap');
      if (mapContainer) destroyRealMap(mapContainer);

      state.module = button.dataset.module;
      state.reportData = null;
      void loadModule();
    });
  });

  document.querySelector('#refresh')?.addEventListener('click', () => {
    state.dashboard = null;
    void loadModule();
  });

  document.querySelector('#retry')?.addEventListener('click', loadModule);

  document.querySelector('#logout')?.addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      redirectLogin();
    }
  });

  document.querySelector('#reportType')?.addEventListener('change', (event) => {
    state.reportType = event.target.value;
    state.reportData = null;
    void loadModule();
  });
}

const isAdmin = await ensureAdmin();

if (isAdmin) {
  await loadModule();
} else if (!location.pathname.startsWith('/login')) {
  render();
}
