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
  icon,
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
  routes: [],
  drivers: [],
  vehicles: [],
  driverFormOpen: false,
  driverEditingId: null,
  routeFormOpen: false,
  routeEditingId: null,
  vehicleStatus: [],
  reportType: 'executive',
  reportData: null,
  reportFrom: '',
  reportTo: '',
  reportWidgetOrder: JSON.parse(localStorage.getItem('encore_report_widgets') || '[]'),
  user: null,
  permissions: [],
  users: [],
  roles: [],
  permissionCatalog: [],
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

function roleHome(user) {
  const permissions = new Set(user?.permissions ?? state.permissions);
  if (permissions.has('dashboard.view')) return '/admin/';
  if (permissions.has('driver.access')) return '/driver/';
  if (user?.active) return '/passenger/';
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

    state.permissions = payload.permissions ?? [];

    if (!state.permissions.includes('dashboard.view')) {
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
        ${modules.filter((module) => state.permissions.includes(module.permission)).map((module) => {
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

      <div class="admin-access-profile" aria-label="Current access profile">
        <span class="admin-access-profile__icon" aria-hidden="true">✓</span>
        <div>
          <small>Access profile</small>
          <strong>${esc(state.user?.role ?? 'Staff account')}</strong>
          <span>${state.permissions.length} active permissions</span>
        </div>
      </div>
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
          <a class="button button--primary" href="${roleHome(state.user)}">Go to my area</a>
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
    return `<section class="admin-panel admin-panel--pad fleet-module"><div class="module-view__header"><div><div class="eyebrow">Fleet registry</div><h2>Vehicles</h2><p class="module-subtitle">Keep vehicle capacity and operational status accurate.</p></div><span class="badge badge--neutral">${state.vehicles.length} records</span></div><form id="vehicleForm" class="premium-form-grid fleet-form"><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>Add vehicle to fleet</strong><span>Vehicle capacity controls seat availability.</span></div></div><label><span>Vehicle code</span><input name="code" required placeholder="BUS-001" /></label><label><span>Plate</span><input name="plate" required placeholder="Registration plate" /></label><label><span>Capacity</span><input name="capacity" type="number" min="1" max="500" required placeholder="42" /></label><label><span>Status</span><select name="status"><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="out_of_service">Out of service</option></select></label><div class="form-actions"><button class="button button--primary button--with-icon" type="submit">${icon('save')}Save vehicle</button></div><div id="vehicleMessage" aria-live="polite"></div></form></section>${table(
      'Vehicles',
      ['Code', 'Plate', 'Capacity', 'Status'],
      state.vehicles.map((bus) => [
        bus.code,
        bus.plate,
        bus.capacity,
        bus.status,
      ]),
    )}`;
  }

  if (state.module === 'drivers') {
    const form = state.driverFormOpen ? `<form id="driverForm" class="premium-form-grid fleet-form"><input type="hidden" name="id" value="${esc(state.driverEditingId ?? '')}" /><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.driverEditingId ? 'Update driver profile' : 'Create a driver profile'}</strong><span>Keep identity and operational status up to date.</span></div></div><label><span>Name</span><input name="name" required maxlength="150" placeholder="Full name" /></label><label><span>License number</span><input name="license_number" required maxlength="80" placeholder="Driver license or internal ID" /></label><label><span>Status</span><select name="status"><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option></select></label><label class="file-field"><span>Profile photo</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG or WebP · maximum 5 MB</small></label><div class="form-actions"><button class="button button--primary button--with-icon" type="submit">${icon('save')}${state.driverEditingId ? 'Update driver' : 'Save driver'}</button><button class="button button--ghost button--with-icon" id="cancelDriverForm" type="button">${icon('close')}Cancel</button></div><div id="driverMessage" aria-live="polite"></div></form>` : '';
    return `<section class="admin-panel admin-panel--pad fleet-module"><div class="module-view__header"><div><div class="eyebrow">Fleet registry</div><h2>Drivers</h2><p class="module-subtitle">Manage profiles, status and identity documents from one place.</p></div><button class="button button--primary button--with-icon" id="addDriver" type="button">${icon('plus')}Add driver</button></div>${form}</section>${table(
      'Drivers',
      ['Photo', 'Name', 'License', 'Status', 'Actions'],
      state.drivers.map((driver) => [
        driver.photo_path ? { html: `<img class="admin-driver-photo" src="/storage/${esc(driver.photo_path)}" alt="${esc(driver.name)}" loading="lazy" />` } : '—',
        driver.name,
        driver.license_number,
        driver.status,
        { html: `<div class="table-actions"><button class="button button--icon" title="Edit driver" aria-label="Edit driver" data-edit-driver="${esc(driver.id)}" type="button">${icon('edit')}</button><button class="button button--icon" title="Deactivate driver" aria-label="Deactivate driver" data-deactivate-driver="${esc(driver.id)}" type="button" ${driver.status === 'inactive' ? 'disabled' : ''}>${icon('archive')}</button></div>` },
      ]),
    )}`;
  }

  if (state.module === 'routes') {
    const form = state.routeFormOpen ? `<form id="routeForm" class="premium-form-grid fleet-form"><input type="hidden" name="id" value="${esc(state.routeEditingId ?? '')}" /><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.routeEditingId ? 'Update route' : 'Create a route'}</strong><span>Define the service corridor and intermediate stops.</span></div></div><label><span>Origin</span><input name="origin" required maxlength="150" placeholder="Starting terminal" /></label><label><span>Destination</span><input name="destination" required maxlength="150" placeholder="Destination terminal" /></label><label><span>Distance (km)</span><input name="distance_km" type="number" min="0" required placeholder="0" /></label><label><span>Intermediate stops</span><input name="stops" placeholder="Stop 1, Stop 2" /></label><label><span>Commercial segments JSON</span><textarea name="segments" rows="6" placeholder='[{"origin":"Georgetown","destination":"Rosignol","price":40,"duration_seconds":4500,"distance_meters":45000}]'></textarea></label><label><span>Published</span><select name="active"><option value="1">Active</option><option value="0">Inactive</option></select></label><div class="form-actions"><button type="submit" class="button button--primary button--with-icon">${icon('save')}${state.routeEditingId ? 'Update route' : 'Save route'}</button> <button type="button" class="button button--ghost button--with-icon" id="cancelRoute">${icon('close')}Cancel</button></div><div id="routeMessage" aria-live="polite"></div></form>` : '';
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div><div class="eyebrow">Network configuration</div><h2>Routes</h2></div>
          <button class="button button--primary button--with-icon" id="addRoute" type="button">${icon('plus')}Add route</button>
        </div>
        ${form}
      </section>
      ${table('Saved routes', ['Origin', 'Destination', 'Distance', 'Stops', 'Active', 'Actions'], state.routes.map((route) => [
        route.origin, route.destination, `${route.distance_km ?? 0} km`, route.stops?.length ?? 0,
        route.active ? 'Yes' : 'No', { html: `<div class="table-actions"><button type="button" class="button button--icon" title="Edit route" aria-label="Edit route" data-edit-route="${esc(route.id)}">${icon('edit')}</button><button type="button" class="button button--icon" title="Deactivate route" aria-label="Deactivate route" data-deactivate-route="${esc(route.id)}" ${route.active ? '' : 'disabled'}>${icon('archive')}</button></div>` },
      ]), { id: 'admin-routes' })}`;
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
          <div class="report-filters"><label><span>From</span><input id="reportFrom" type="date" value="${esc(state.reportFrom)}" /></label><label><span>To</span><input id="reportTo" type="date" value="${esc(state.reportTo)}" /></label><button class="button button--primary" id="applyReportFilters" type="button">Update report</button></div>
        </div>
      </section>

      ${state.reportData ? reportView(state.reportType, state.reportData, { widgetOrder: state.reportWidgetOrder }) : ''}`;
  }

  if (state.module === 'users') return table('Users', ['Name', 'Email', 'Legacy role', 'Roles', 'Effective permissions', 'Status'], state.users.map((user) => [user.name, user.email, user.role, (user.roles ?? []).map((role) => role.label ?? role.name).join(', '), (user.permissions ?? []).length, user.active ? 'Active' : 'Disabled']));
  if (state.module === 'roles') return table('Roles', ['Name', 'Label', 'System', 'Permissions'], state.roles.map((role) => [role.name, role.label, role.system ? 'Yes' : 'No', (role.permissions ?? []).length]));
  if (state.module === 'permissions') return table('Permissions', ['Key', 'Label', 'Resource'], state.permissionCatalog.map((permission) => [permission.key, permission.label, permission.resource]));

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
      requestJson(`/trips/${tripId}/location`)
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

    if (state.module === 'routes') {
      state.routes = await api.routes();
    }

    if (state.module === 'drivers') {
      state.drivers = await api.drivers();
    }

    if (state.module === 'vehicles') {
      state.vehicles = await api.vehicles();
    }

    if (state.module === 'vehicles') {
      state.vehicleStatus = await api.vehicleStatus();
    }

    if (state.module === 'reports') {
      state.reportData = await api.report(state.reportType, { from: state.reportFrom, to: state.reportTo });
    }

    if (state.module === 'users') state.users = await api.users();
    if (state.module === 'roles') state.roles = await api.roles();
    if (state.module === 'permissions') state.permissionCatalog = await api.permissions();

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

  document.querySelector('#applyReportFilters')?.addEventListener('click', () => {
    state.reportFrom = document.querySelector('#reportFrom')?.value ?? '';
    state.reportTo = document.querySelector('#reportTo')?.value ?? '';
    state.reportData = null;
    void loadModule();
  });

  document.querySelectorAll('[data-report-widget]').forEach((widget) => {
    widget.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', widget.dataset.reportWidget ?? '');
      widget.classList.add('is-dragging');
    });
    widget.addEventListener('dragend', () => widget.classList.remove('is-dragging'));
    widget.addEventListener('dragover', (event) => event.preventDefault());
    widget.addEventListener('drop', (event) => {
      event.preventDefault();
      const source = event.dataTransfer?.getData('text/plain');
      const target = widget.dataset.reportWidget;
      if (!source || !target || source === target) return;
      const order = [...document.querySelectorAll('[data-report-widget]')].map((item) => item.dataset.reportWidget);
      const from = order.indexOf(source);
      const to = order.indexOf(target);
      if (from < 0 || to < 0) return;
      order.splice(from, 1);
      order.splice(to, 0, source);
      state.reportWidgetOrder = order;
      localStorage.setItem('encore_report_widgets', JSON.stringify(order));
      render();
    });
  });

  const routeForm = document.querySelector('#routeForm');
  routeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(routeForm);
    const id = String(form.get('id') ?? '').trim() || null;
    const stops = String(form.get('stops') ?? '').split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({ name }));
    let segments = [];
    const message = document.querySelector('#routeMessage');
    try {
      segments = JSON.parse(String(form.get('segments') ?? '[]'));
      if (!Array.isArray(segments)) throw new Error('Segments must be a JSON array.');
      await api.saveRoute({
        origin: form.get('origin'),
        destination: form.get('destination'),
        distance_km: Number(form.get('distance_km')),
        active: form.get('active') === '1',
        stops,
        segments,
      }, id);
      message.textContent = 'Route saved.';
      state.routes = await api.routes();
      state.routeFormOpen = false;
      state.routeEditingId = null;
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.querySelector('#addRoute')?.addEventListener('click', () => {
    state.routeFormOpen = true;
    state.routeEditingId = null;
    render();
  });

  document.querySelector('#cancelRoute')?.addEventListener('click', () => {
    state.routeFormOpen = false;
    state.routeEditingId = null;
    render();
  });

  document.querySelectorAll('[data-edit-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const route = state.routes.find((item) => String(item.id) === button.dataset.editRoute);
      if (!route) return;
      state.routeFormOpen = true;
      state.routeEditingId = route.id;
      render();
      const form = document.querySelector('#routeForm');
      form.elements.id.value = route.id;
      form.elements.origin.value = route.origin ?? '';
      form.elements.destination.value = route.destination ?? '';
      form.elements.distance_km.value = route.distance_km ?? 0;
      form.elements.active.value = route.active ? '1' : '0';
      form.elements.stops.value = (route.stops ?? []).map((stop) => stop.name).join(', ');
      form.elements.segments.value = JSON.stringify((route.segments ?? []).map((segment) => ({
        origin: segment.origin, destination: segment.destination, price: segment.price,
        distance_meters: segment.distance_meters, duration_seconds: segment.duration_seconds, active: segment.active,
      })), null, 2);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-deactivate-route]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Deactivate this route? Historical trips will be preserved.')) return;
      try {
        await api.deactivateRoute(button.dataset.deactivateRoute);
        state.routes = await api.routes();
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
  });

  document.querySelector('#driverForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#driverMessage');
    try {
      const id = String(form.get('id') ?? '').trim() || null;
      const driver = await api.saveDriver({
        name: form.get('name'),
        license_number: form.get('license_number'),
        status: form.get('status'),
      }, id);
      const photo = form.get('photo');
      if (photo instanceof File && photo.size > 0) await api.uploadDriverPhoto(driver.id, photo);
      state.drivers = await api.drivers();
      state.driverFormOpen = false;
      state.driverEditingId = null;
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.querySelector('#addDriver')?.addEventListener('click', () => {
    state.driverFormOpen = true;
    state.driverEditingId = null;
    render();
  });

  document.querySelector('#cancelDriverForm')?.addEventListener('click', () => {
    state.driverFormOpen = false;
    state.driverEditingId = null;
    render();
  });

  document.querySelectorAll('[data-edit-driver]').forEach((button) => {
    button.addEventListener('click', () => {
      const driver = state.drivers.find((item) => String(item.id) === button.dataset.editDriver);
      if (!driver) return;
      state.driverFormOpen = true;
      state.driverEditingId = driver.id;
      render();
      const form = document.querySelector('#driverForm');
      form.elements.name.value = driver.name ?? '';
      form.elements.license_number.value = driver.license_number ?? '';
      form.elements.status.value = driver.status ?? 'pending';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-deactivate-driver]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Deactivate this driver? Their history will be preserved.')) return;
      try {
        await api.deactivateDriver(button.dataset.deactivateDriver);
        state.drivers = await api.drivers();
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
  });

  document.querySelector('#vehicleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#vehicleMessage');
    try {
      await api.saveVehicle({
        code: form.get('code'),
        plate: form.get('plate'),
        capacity: Number(form.get('capacity')),
        status: form.get('status'),
      });
      state.vehicles = await api.vehicles();
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

const isAdmin = await ensureAdmin();

if (isAdmin) {
  await loadModule();
} else if (!location.pathname.startsWith('/login')) {
  render();
}
