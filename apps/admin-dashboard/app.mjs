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
  scheduleFormOpen: false,
  scheduleEditingId: null,
  scheduleForm: null,
  tripFormOpen: false,
  tripEditingId: null,
  tripForm: null,
  packages: [],
  routes: [],
  drivers: [],
  vehicles: [],
  driverFormOpen: false,
  driverEditingId: null,
  routeFormOpen: false,
  routeEditingId: null,
  routeEditor: null,
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
  generalSettings: null,
  userFormOpen: false,
  userEditingId: null,
  userForm: null,
  roleEditingId: null,
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

function routeEditorFrom(route = null) {
  const stops = (route?.stops ?? []).slice().sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0)).map((stop) => ({
    name: stop.name ?? '',
    latitude: stop.latitude ?? '',
    longitude: stop.longitude ?? '',
    offset_minutes: stop.offset_minutes ?? 0,
  }));

  return {
    stops: stops.length >= 2 ? stops : [{ name: '', latitude: '', longitude: '', offset_minutes: 0 }, { name: '', latitude: '', longitude: '', offset_minutes: 0 }],
    segments: (route?.segments ?? []).map((segment) => ({
      origin: segment.origin ?? segment.origin_name ?? '',
      destination: segment.destination ?? segment.destination_name ?? '',
      price: segment.price ?? '',
      distance_meters: segment.distance_meters ?? '',
      duration_seconds: segment.duration_seconds ?? '',
      active: segment.active !== false,
    })),
  };
}

function segmentKey(origin, destination) {
  return `${origin}::${destination}`;
}

function routeSegmentRows(editor) {
  const existing = new Map(editor.segments.map((segment) => [segmentKey(segment.origin, segment.destination), segment]));
  const rows = [];
  for (let from = 0; from < editor.stops.length; from += 1) {
    for (let to = from + 1; to < editor.stops.length; to += 1) {
      const origin = String(editor.stops[from].name ?? '').trim();
      const destination = String(editor.stops[to].name ?? '').trim();
      if (!origin || !destination) continue;
      rows.push(existing.get(segmentKey(origin, destination)) ?? {
        origin, destination, price: '', distance_meters: '', duration_seconds: '', active: true,
      });
    }
  }
  editor.segments = rows;
  return rows;
}

function routeEditorFields() {
  const editor = state.routeEditor ?? routeEditorFrom();
  const segments = routeSegmentRows(editor);
  return `
    <div class="route-editor" id="routeEditor">
      <div class="route-editor__heading"><strong>Stops</strong><span>First stop is the origin and last stop is the destination.</span></div>
      <div class="route-editor__stops">
        ${editor.stops.map((stop, index) => `<div class="route-stop-row" data-stop-row="${index}">
          <span class="route-stop-index">${index + 1}</span>
          <input data-stop-field="name" aria-label="Stop ${index + 1} name" value="${esc(stop.name)}" placeholder="Stop name" required />
          <input data-stop-field="latitude" aria-label="Stop ${index + 1} latitude" type="number" step="any" value="${esc(stop.latitude)}" placeholder="Latitude" />
          <input data-stop-field="longitude" aria-label="Stop ${index + 1} longitude" type="number" step="any" value="${esc(stop.longitude)}" placeholder="Longitude" />
          <input data-stop-field="offset_minutes" aria-label="Stop ${index + 1} offset" type="number" min="0" value="${esc(stop.offset_minutes)}" placeholder="Minutes" />
          <button type="button" class="button button--icon" data-stop-up="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move stop up">↑</button>
          <button type="button" class="button button--icon" data-stop-down="${index}" ${index === editor.stops.length - 1 ? 'disabled' : ''} aria-label="Move stop down">↓</button>
          <button type="button" class="button button--icon" data-stop-remove="${index}" ${editor.stops.length <= 2 ? 'disabled' : ''} aria-label="Remove stop">×</button>
        </div>`).join('')}
      </div>
      <button type="button" class="button button--ghost" id="addRouteStop">Add stop</button>
      <div class="route-editor__heading"><strong>Commercial segments</strong><span>Prices and timings are generated from the ordered stops.</span></div>
      <div class="route-editor__segments">
        ${segments.length ? segments.map((segment, index) => `<div class="route-segment-row" data-segment-row="${index}">
          <strong>${esc(segment.origin)} → ${esc(segment.destination)}</strong>
          <input data-segment-field="price" type="number" min="0" aria-label="${esc(segment.origin)} to ${esc(segment.destination)} price" value="${esc(segment.price)}" placeholder="Price" />
          <input data-segment-field="duration_seconds" type="number" min="0" aria-label="Duration in seconds" value="${esc(segment.duration_seconds)}" placeholder="Duration (seconds)" />
          <input data-segment-field="distance_meters" type="number" min="0" aria-label="Distance in meters" value="${esc(segment.distance_meters)}" placeholder="Distance (meters)" />
          <label><input data-segment-field="active" type="checkbox" ${segment.active ? 'checked' : ''} /> Active</label>
        </div>`).join('') : '<p class="empty-state">Add named stops to configure commercial segments.</p>'}
      </div>
      <input type="hidden" name="stops" id="routeStopsPayload" />
      <input type="hidden" name="segments" id="routeSegmentsPayload" />
    </div>`;
}

function syncRouteEditorPayload() {
  const editor = state.routeEditor;
  if (!editor) return;
  const stops = editor.stops.map((stop) => ({
    name: String(stop.name ?? '').trim(),
    latitude: stop.latitude === '' ? null : Number(stop.latitude),
    longitude: stop.longitude === '' ? null : Number(stop.longitude),
    offset_minutes: Number(stop.offset_minutes || 0),
  }));
  const stopsPayload = document.querySelector('#routeStopsPayload');
  const segmentsPayload = document.querySelector('#routeSegmentsPayload');
  if (stopsPayload) stopsPayload.value = JSON.stringify(stops);
  if (segmentsPayload) segmentsPayload.value = JSON.stringify(editor.segments.map((segment) => ({
    ...segment,
    price: segment.price === '' ? null : Number(segment.price),
    distance_meters: segment.distance_meters === '' ? null : Number(segment.distance_meters),
    duration_seconds: segment.duration_seconds === '' ? null : Number(segment.duration_seconds),
  })));
}

function refreshRouteEditor() {
  const editor = document.querySelector('#routeEditor');
  if (!editor) return;
  editor.outerHTML = routeEditorFields();
  syncRouteEditorPayload();
  bindRouteEditor();
}

function bindRouteEditor() {
  const editor = document.querySelector('#routeEditor');
  if (!editor || !state.routeEditor) return;
  syncRouteEditorPayload();
  editor.addEventListener('input', (event) => {
    const stopRow = event.target.closest('[data-stop-row]');
    const segmentRow = event.target.closest('[data-segment-row]');
    if (stopRow) state.routeEditor.stops[Number(stopRow.dataset.stopRow)][event.target.dataset.stopField] = event.target.type === 'number' ? event.target.value : event.target.value;
    if (segmentRow) state.routeEditor.segments[Number(segmentRow.dataset.segmentRow)][event.target.dataset.segmentField] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    syncRouteEditorPayload();
  });
  editor.addEventListener('change', (event) => {
    if (event.target.closest('[data-stop-row]') && event.target.dataset.stopField === 'name') refreshRouteEditor();
  });
  editor.querySelector('#addRouteStop')?.addEventListener('click', () => {
    state.routeEditor.stops.push({ name: '', latitude: '', longitude: '', offset_minutes: 0 });
    refreshRouteEditor();
  });
  editor.querySelectorAll('[data-stop-remove]').forEach((button) => button.addEventListener('click', () => {
    state.routeEditor.stops.splice(Number(button.dataset.stopRemove), 1);
    refreshRouteEditor();
  }));
  editor.querySelectorAll('[data-stop-up]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.stopUp);
    [state.routeEditor.stops[index - 1], state.routeEditor.stops[index]] = [state.routeEditor.stops[index], state.routeEditor.stops[index - 1]];
    refreshRouteEditor();
  }));
  editor.querySelectorAll('[data-stop-down]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.stopDown);
    [state.routeEditor.stops[index], state.routeEditor.stops[index + 1]] = [state.routeEditor.stops[index + 1], state.routeEditor.stops[index]];
    refreshRouteEditor();
  }));
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
    const permissions = new Set(state.permissions);
    const canCreate = permissions.has('trips.create') && permissions.has('trips.assign_driver') && permissions.has('trips.assign_vehicle');
    const canEdit = permissions.has('trips.update') && permissions.has('trips.assign_driver') && permissions.has('trips.assign_vehicle');
    const canCancel = permissions.has('trips.cancel');
    const trip = state.tripForm ?? {};
    const form = state.tripFormOpen ? `
      <form id="tripForm" class="premium-form-grid fleet-form">
        <div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.tripEditingId ? 'Update scheduled trip' : 'Create scheduled trip'}</strong><span>Choose an active route, operational vehicle and available driver.</span></div></div>
        <label><span>Route</span><select name="transport_route_id" required><option value="">Select route</option>${(dashboard.routes ?? []).map((route) => `<option value="${esc(route.id)}" ${String(trip.transport_route_id) === String(route.id) ? 'selected' : ''}>${esc(route.origin)} → ${esc(route.destination)}</option>`).join('')}</select></label>
        <label><span>Vehicle</span><select name="bus_id" required><option value="">Select operational vehicle</option>${(dashboard.buses ?? []).filter((bus) => bus.status === 'operational').map((bus) => `<option value="${esc(bus.id)}" ${String(trip.bus_id) === String(bus.id) ? 'selected' : ''}>${esc(bus.code)} · ${esc(bus.plate)} · ${esc(bus.capacity)} seats</option>`).join('')}</select></label>
        <label><span>Driver</span><select name="driver_id" required><option value="">Select available driver</option>${(dashboard.drivers ?? []).filter((driver) => ['active', 'upcoming'].includes(driver.status)).map((driver) => `<option value="${esc(driver.id)}" ${String(trip.driver_id) === String(driver.id) ? 'selected' : ''}>${esc(driver.name)} · ${esc(driver.status)}</option>`).join('')}</select></label>
        <label><span>Departure date</span><input name="departure_date" type="date" min="${new Date().toISOString().slice(0, 10)}" required value="${esc(String(trip.departure_date ?? '').slice(0, 10))}" /></label>
        <label><span>Departure time</span><input name="departure_time" type="time" required value="${esc(String(trip.departure_time ?? '').slice(0, 5))}" /></label>
        <label><span>Arrival time</span><input name="arrival_time" type="time" required value="${esc(String(trip.arrival_time ?? '').slice(0, 5))}" /></label>
        <label><span>Price per passenger</span><input name="price_per_passenger" type="number" min="0" required value="${esc(trip.price_per_passenger ?? '')}" /></label>
        <div class="form-actions"><button class="button button--primary" type="submit">${state.tripEditingId ? 'Update trip' : 'Create trip'}</button><button class="button button--ghost" id="cancelTripForm" type="button">Cancel</button></div>
        <div id="tripMessage" aria-live="polite"></div>
      </form>` : '';
    const rows = (dashboard.trips ?? []).map((trip) => [
        trip.route?.origin && trip.route?.destination
          ? `${trip.route.origin} → ${trip.route.destination}`
          : '—',
        String(trip.departure_date ?? '').slice(0, 10),
        trip.departure_time,
        trip.bus?.code,
        trip.driver?.name,
        trip.status,
        ...((canEdit || canCancel) ? [{ html: `<div class="table-actions">${canEdit && trip.status === 'scheduled' ? `<button class="button button--icon" data-edit-trip="${esc(trip.id)}" type="button" aria-label="Edit trip">${icon('edit')}</button>` : ''}${canCancel && trip.status === 'scheduled' ? `<button class="button button--icon" data-cancel-trip="${esc(trip.id)}" type="button" aria-label="Cancel trip">${icon('archive')}</button>` : ''}</div>` }] : []),
      ]);
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header"><div><div class="eyebrow">Service planning</div><h2>Trips</h2><p class="module-subtitle">Publish scheduled departures for passenger booking.</p></div>${canCreate ? `<button class="button button--primary" id="addTrip" type="button">Add trip</button>` : ''}</div>
        ${form}
      </section>
      ${table('Scheduled and completed trips', ['Route', 'Date', 'Departure', 'Bus', 'Driver', 'Status', ...((canEdit || canCancel) ? ['Actions'] : [])], rows, { id: 'admin-trips' })}`;
  }

  if (state.module === 'bookings') {
    return table(
      'Bookings',
      ['Reference', 'Passenger', 'Status', 'Total', 'Actions'],
      (dashboard.bookings ?? []).map((booking) => [
        booking.reference,
        booking.passenger_name,
        booking.status,
        booking.total_amount,
        ['draft', 'pending_payment'].includes(booking.status) ? { html: `<button class="button button--ghost" data-cancel-booking="${esc(booking.id)}" type="button">Cancel unpaid</button>` } : '—',
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
    const form = state.routeFormOpen ? `<form id="routeForm" class="premium-form-grid fleet-form"><input type="hidden" name="id" value="${esc(state.routeEditingId ?? '')}" /><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.routeEditingId ? 'Update route' : 'Create a route'}</strong><span>Define the service corridor, ordered stops and commercial fares.</span></div></div><label><span>Origin terminal</span><input name="origin" required maxlength="150" placeholder="Starting terminal" /></label><label><span>Destination terminal</span><input name="destination" required maxlength="150" placeholder="Destination terminal" /></label><label><span>Distance (km)</span><input name="distance_km" type="number" min="0" required placeholder="0" /></label>${routeEditorFields()}<label><span>Published</span><select name="active"><option value="1">Active</option><option value="0">Inactive</option></select></label><div class="form-actions"><button type="submit" class="button button--primary button--with-icon">${icon('save')}${state.routeEditingId ? 'Update route' : 'Save route'}</button> <button type="button" class="button button--ghost button--with-icon" id="cancelRoute">${icon('close')}Cancel</button></div><div id="routeMessage" aria-live="polite"></div></form>` : '';
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
      ['Trip', 'Title', 'Severity', 'Status', 'Update status'],
      state.incidents.map((incident) => [
        incident.trip?.id,
        incident.title,
        incident.severity,
        { html: `<select data-incident-status="${esc(incident.id)}">${['open', 'in_progress', 'resolved', 'dismissed'].map((status) => `<option value="${status}" ${incident.status === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}</select>` },
        { html: `<button class="button button--ghost" data-save-incident="${esc(incident.id)}" type="button">Save</button>` },
      ]),
    );
  }

  if (state.module === 'schedules') {
    const canManage = state.permissions.includes('schedules.manage');
    const schedule = state.scheduleForm ?? {};
    const form = state.scheduleFormOpen && canManage ? `
      <form id="scheduleForm" class="premium-form-grid fleet-form">
        <div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.scheduleEditingId ? 'Update driver schedule' : 'Create driver schedule'}</strong><span>Prevent overlapping assignments for each driver.</span></div></div>
        <label><span>Driver</span><select name="driver_id" required><option value="">Select driver</option>${(state.dashboard?.drivers ?? []).map((driver) => `<option value="${esc(driver.id)}" ${String(schedule.driver_id) === String(driver.id) ? 'selected' : ''}>${esc(driver.name)}</option>`).join('')}</select></label>
        <label><span>Vehicle</span><select name="bus_id"><option value="">No vehicle assigned</option>${(state.dashboard?.buses ?? []).map((bus) => `<option value="${esc(bus.id)}" ${String(schedule.bus_id ?? '') === String(bus.id) ? 'selected' : ''}>${esc(bus.code)} · ${esc(bus.plate)}</option>`).join('')}</select></label>
        <label><span>Trip</span><select name="trip_id"><option value="">No trip linked</option>${(state.dashboard?.trips ?? []).map((trip) => `<option value="${esc(trip.id)}" ${String(schedule.trip_id ?? '') === String(trip.id) ? 'selected' : ''}>${esc(trip.route?.origin ?? '')} → ${esc(trip.route?.destination ?? '')} · ${esc(String(trip.departure_date ?? '').slice(0, 10))}</option>`).join('')}</select></label>
        <label><span>Work date</span><input name="work_date" type="date" required value="${esc(schedule.work_date ?? '')}" /></label>
        <label><span>Starts at</span><input name="starts_at" type="time" required value="${esc(schedule.starts_at ?? '')}" /></label>
        <label><span>Ends at</span><input name="ends_at" type="time" required value="${esc(schedule.ends_at ?? '')}" /></label>
        <label><span>Status</span><select name="status"><option value="scheduled" ${schedule.status === 'scheduled' ? 'selected' : ''}>Scheduled</option><option value="active" ${schedule.status === 'active' ? 'selected' : ''}>Active</option><option value="changed" ${schedule.status === 'changed' ? 'selected' : ''}>Changed</option><option value="cancelled" ${schedule.status === 'cancelled' ? 'selected' : ''}>Cancelled</option></select></label>
        <label class="form-span-2"><span>Notes</span><textarea name="notes" maxlength="2000">${esc(schedule.notes ?? '')}</textarea></label>
        <div class="form-actions"><button class="button button--primary" type="submit">${state.scheduleEditingId ? 'Update schedule' : 'Save schedule'}</button><button class="button button--ghost" id="cancelSchedule" type="button">Cancel</button></div>
        <div id="scheduleMessage" aria-live="polite"></div>
      </form>` : '';
    const rows = state.schedules.map((schedule) => [
        String(schedule.work_date ?? '').slice(0, 10),
        schedule.driver?.name,
        schedule.bus?.code,
        schedule.starts_at,
        schedule.ends_at,
        schedule.status,
        ...(canManage ? [{ html: `<button class="button button--icon" data-edit-schedule="${esc(schedule.id)}" type="button" aria-label="Edit schedule">${icon('edit')}</button>` }] : []),
      ]);
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header"><div><div class="eyebrow">Operations planning</div><h2>Driver schedules</h2><p class="module-subtitle">Assign drivers, vehicles and trips without overlapping work.</p></div>${canManage ? `<button class="button button--primary" id="addSchedule" type="button">Add schedule</button>` : ''}</div>
        ${form}
      </section>
      ${table('Schedule records', ['Date', 'Driver', 'Vehicle', 'Start', 'End', 'Status', ...(canManage ? ['Actions'] : [])], rows, { id: 'driver-schedules' })}`;
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

  if (state.module === 'users') {
    const user = state.userForm ?? { name: '', email: '', phone: '', role: 'passenger', active: true, role_ids: [], permission_grants: {} };
    const canManageRoles = state.permissions.includes('roles.manage');
    const canAssignPermissions = state.permissions.includes('permissions.assign');
    const roleOptions = [...state.roles];
    if (user.role && !roleOptions.some((role) => role.name === user.role)) roleOptions.unshift({ name: user.role, label: `${user.role} (legacy)` });
    const userForm = state.userFormOpen ? `<form id="userForm" class="premium-form-grid fleet-form"><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.userEditingId ? 'Update user access' : 'Create user'}</strong><span>Roles and direct grants are checked again by Laravel.</span></div></div><label><span>Name</span><input name="name" required maxlength="150" value="${esc(user.name)}" /></label><label><span>Email</span><input name="email" type="email" required maxlength="190" value="${esc(user.email)}" /></label><label><span>Phone</span><input name="phone" maxlength="40" value="${esc(user.phone ?? '')}" /></label><label><span>Legacy access role</span><select name="role" ${canManageRoles ? '' : 'disabled'}>${roleOptions.map((role) => `<option value="${esc(role.name)}" ${user.role === role.name ? 'selected' : ''}>${esc(role.label ?? role.name)}</option>`).join('')}</select></label><label><span>Password ${state.userEditingId ? '(leave blank to keep)' : ''}</span><input name="password" type="password" ${state.userEditingId ? '' : 'required'} minlength="8" /></label><label><span>Status</span><select name="active"><option value="1" ${user.active !== false ? 'selected' : ''}>Active</option><option value="0" ${user.active === false ? 'selected' : ''}>Disabled</option></select></label><fieldset class="access-checks"><legend>Roles ${canManageRoles ? '' : '(requires roles.manage)'}</legend>${state.roles.map((role) => `<label><input type="checkbox" data-user-role="${esc(role.id)}" ${user.role_ids?.map(Number).includes(Number(role.id)) ? 'checked' : ''} ${canManageRoles ? '' : 'disabled'} /> ${esc(role.label ?? role.name)}</label>`).join('')}</fieldset><fieldset class="access-checks"><legend>Direct permissions ${canAssignPermissions ? '' : '(requires permissions.assign)'}</legend>${state.permissionCatalog.map((permission) => `<label><input type="checkbox" data-user-permission="${esc(permission.key)}" ${user.permission_grants?.[permission.key] ? 'checked' : ''} ${canAssignPermissions ? '' : 'disabled'} /> ${esc(permission.label ?? permission.key)}</label>`).join('')}</fieldset><div class="form-actions"><button type="submit" class="button button--primary">${state.userEditingId ? 'Update user' : 'Create user'}</button><button type="button" class="button button--ghost" id="cancelUser">Cancel</button></div><div id="userMessage" aria-live="polite"></div></form>` : '';
    return `<section class="admin-panel admin-panel--pad"><div class="module-view__header"><div><div class="eyebrow">Access control</div><h2>Users</h2></div><button class="button button--primary" id="addUser" type="button">Add user</button></div>${userForm}</section>${table('Users', ['Name', 'Email', 'Roles', 'Effective permissions', 'Status', 'Actions'], state.users.map((item) => [item.name, item.email, (item.roles ?? []).map((role) => role.label ?? role.name).join(', ') || item.role, (item.permissions ?? []).length, item.active ? 'Active' : 'Disabled', { html: `<div class="table-actions"><button class="button button--icon" data-edit-user="${esc(item.id)}" type="button" aria-label="Edit user">${icon('edit')}</button><button class="button button--icon" data-disable-user="${esc(item.id)}" type="button" aria-label="Disable user" ${item.active ? '' : 'disabled'}>${icon('archive')}</button></div>` }]))}`;
  }
  if (state.module === 'roles') {
    const editing = state.roles.find((role) => String(role.id) === String(state.roleEditingId));
    const roleForm = editing ? `<form id="roleForm" class="premium-form-grid fleet-form"><label><span>Role label</span><input name="label" required maxlength="120" value="${esc(editing.label)}" /></label><fieldset class="access-checks"><legend>Permissions</legend>${state.permissionCatalog.map((permission) => `<label><input type="checkbox" data-role-permission="${esc(permission.key)}" ${(editing.permissions ?? []).some((item) => item.key === permission.key) ? 'checked' : ''} /> ${esc(permission.label ?? permission.key)}</label>`).join('')}</fieldset><div class="form-actions"><button class="button button--primary" type="submit">Save role</button><button class="button button--ghost" id="cancelRole" type="button">Cancel</button></div><div id="roleMessage" aria-live="polite"></div></form>` : '';
    return `<section class="admin-panel admin-panel--pad"><div class="module-view__header"><div><div class="eyebrow">Access control</div><h2>Roles</h2></div></div>${roleForm}</section>${table('Roles', ['Name', 'Label', 'System', 'Permissions', 'Actions'], state.roles.map((role) => [role.name, role.label, role.system ? 'Yes' : 'No', (role.permissions ?? []).length, { html: `<button class="button button--icon" data-edit-role="${esc(role.id)}" type="button" aria-label="Edit role" ${role.system && state.user?.role !== 'superadmin' ? 'disabled' : ''}>${icon('edit')}</button>` }]))}`;
  }
  if (state.module === 'permissions') return table('Permissions', ['Key', 'Label', 'Resource'], state.permissionCatalog.map((permission) => [permission.key, permission.label, permission.resource]));

  if (state.module === 'settings') {
    const settings = state.generalSettings ?? {};
    const canUpdate = state.permissions.includes('settings.update');
    return `<section class="admin-panel admin-panel--pad"><div class="eyebrow">System configuration</div><h2>General</h2><p class="module-subtitle">Set the address shown as the sender on passenger booking emails.</p><div class="settings-status ${settings.gmail_api_ready ? 'settings-status--ready' : 'settings-status--pending'}" role="status">${settings.gmail_api_ready ? 'Gmail API is ready to send email.' : 'Gmail authorization is incomplete. A server OAuth refresh token and MAIL_MAILER=gmail_api are required.'}</div><form id="emailSettingsForm" class="premium-form-grid fleet-form"><label><span>Sender email</span><input name="mail_from_address" type="email" autocomplete="email" maxlength="254" required value="${esc(settings.mail_from_address ?? '')}" ${canUpdate ? '' : 'disabled'} /></label><label><span>Sender name</span><input name="mail_from_name" maxlength="120" required value="${esc(settings.mail_from_name ?? 'Encore Transport')}" ${canUpdate ? '' : 'disabled'} /></label>${canUpdate ? '<div class="form-actions"><button class="button button--primary" type="submit">Save email settings</button></div>' : ''}<div id="emailSettingsMessage" aria-live="polite"></div></form></section>`;
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

    if (state.module === 'users') {
      [state.users, state.roles, state.permissionCatalog] = await Promise.all([api.users(), api.roles(), api.permissions()]);
    }
    if (state.module === 'roles') {
      [state.roles, state.permissionCatalog] = await Promise.all([api.roles(), api.permissions()]);
    }
    if (state.module === 'permissions') state.permissionCatalog = await api.permissions();
    if (state.module === 'settings') state.generalSettings = await api.settings();

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

  document.querySelectorAll('[data-save-incident]').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.saveIncident;
    const status = document.querySelector(`[data-incident-status="${CSS.escape(id)}"]`)?.value;
    try {
      await api.updateIncident(id, { status });
      state.incidents = await api.incidents();
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }));

  document.querySelectorAll('[data-cancel-booking]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Cancel this unpaid booking and release its seats?')) return;
    try {
      await api.cancelBooking(button.dataset.cancelBooking);
      state.dashboard = await api.dashboard();
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }));

  document.querySelector('#emailSettingsForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#emailSettingsMessage');
    try {
      state.generalSettings = await api.saveEmailSettings({
        mail_from_address: form.get('mail_from_address'),
        mail_from_name: form.get('mail_from_name'),
      });
      if (message) message.textContent = 'Email sender settings saved.';
      render();
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  });

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

  document.querySelector('#addSchedule')?.addEventListener('click', () => {
    state.scheduleFormOpen = true;
    state.scheduleEditingId = null;
    state.scheduleForm = {
      driver_id: '', bus_id: '', trip_id: '',
      work_date: new Date().toISOString().slice(0, 10),
      starts_at: '08:00', ends_at: '09:00', status: 'scheduled', notes: '',
    };
    render();
  });
  document.querySelector('#cancelSchedule')?.addEventListener('click', () => {
    state.scheduleFormOpen = false;
    state.scheduleEditingId = null;
    state.scheduleForm = null;
    render();
  });
  document.querySelectorAll('[data-edit-schedule]').forEach((button) => button.addEventListener('click', () => {
    const schedule = state.schedules.find((item) => String(item.id) === String(button.dataset.editSchedule));
    if (!schedule) return;
    state.scheduleFormOpen = true;
    state.scheduleEditingId = schedule.id;
    state.scheduleForm = {
      ...schedule,
      work_date: String(schedule.work_date ?? '').slice(0, 10),
      starts_at: String(schedule.starts_at ?? '').slice(0, 5),
      ends_at: String(schedule.ends_at ?? '').slice(0, 5),
    };
    render();
  }));
  document.querySelector('#scheduleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      driver_id: Number(form.get('driver_id')),
      bus_id: form.get('bus_id') ? Number(form.get('bus_id')) : null,
      trip_id: form.get('trip_id') ? Number(form.get('trip_id')) : null,
      work_date: form.get('work_date'),
      starts_at: form.get('starts_at'),
      ends_at: form.get('ends_at'),
      status: form.get('status'),
      notes: form.get('notes') || null,
    };
    try {
      await api.saveSchedule(data, state.scheduleEditingId);
      state.schedules = await api.schedules();
      state.scheduleFormOpen = false;
      state.scheduleEditingId = null;
      state.scheduleForm = null;
      render();
    } catch (error) {
      const message = document.querySelector('#scheduleMessage');
      if (message) message.textContent = error.message;
    }
  });

  document.querySelector('#addTrip')?.addEventListener('click', () => {
    state.tripFormOpen = true;
    state.tripEditingId = null;
    state.tripForm = {
      transport_route_id: '', bus_id: '', driver_id: '',
      departure_date: new Date().toISOString().slice(0, 10),
      departure_time: '08:00', arrival_time: '09:00', price_per_passenger: '',
    };
    render();
  });
  document.querySelector('#cancelTripForm')?.addEventListener('click', () => {
    state.tripFormOpen = false;
    state.tripEditingId = null;
    state.tripForm = null;
    render();
  });
  document.querySelectorAll('[data-edit-trip]').forEach((button) => button.addEventListener('click', () => {
    const trip = (state.dashboard?.trips ?? []).find((item) => String(item.id) === String(button.dataset.editTrip));
    if (!trip) return;
    state.tripFormOpen = true;
    state.tripEditingId = trip.id;
    state.tripForm = {
      transport_route_id: trip.transport_route_id,
      bus_id: trip.bus_id,
      driver_id: trip.driver_id,
      departure_date: String(trip.departure_date ?? '').slice(0, 10),
      departure_time: String(trip.departure_time ?? '').slice(0, 5),
      arrival_time: String(trip.arrival_time ?? '').slice(0, 5),
      price_per_passenger: trip.price_per_passenger ?? '',
    };
    render();
  }));
  document.querySelectorAll('[data-cancel-trip]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Cancel this trip? Held or confirmed bookings must be resolved first.')) return;
    try {
      await api.cancelTrip(button.dataset.cancelTrip);
      state.dashboard = await api.dashboard();
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }));
  document.querySelector('#tripForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      transport_route_id: Number(form.get('transport_route_id')),
      bus_id: Number(form.get('bus_id')),
      driver_id: Number(form.get('driver_id')),
      departure_date: form.get('departure_date'),
      departure_time: form.get('departure_time'),
      arrival_time: form.get('arrival_time'),
      price_per_passenger: Number(form.get('price_per_passenger')),
    };
    try {
      await api.saveTrip(data, state.tripEditingId);
      state.dashboard = await api.dashboard();
      state.tripFormOpen = false;
      state.tripEditingId = null;
      state.tripForm = null;
      render();
    } catch (error) {
      const message = document.querySelector('#tripMessage');
      if (message) message.textContent = error.message;
    }
  });

  document.querySelector('#addUser')?.addEventListener('click', () => {
    state.userFormOpen = true;
    state.userEditingId = null;
    state.userForm = { name: '', email: '', phone: '', role: 'passenger', active: true, role_ids: [], permission_grants: {} };
    render();
  });
  document.querySelector('#cancelUser')?.addEventListener('click', () => {
    state.userFormOpen = false;
    state.userEditingId = null;
    state.userForm = null;
    render();
  });
  document.querySelectorAll('[data-edit-user]').forEach((button) => button.addEventListener('click', () => {
    const user = state.users.find((item) => String(item.id) === String(button.dataset.editUser));
    if (!user) return;
    state.userFormOpen = true;
    state.userEditingId = user.id;
    state.userForm = { ...user, role_ids: (user.roles ?? []).map((role) => role.id), permission_grants: Object.fromEntries((user.direct_permissions ?? []).map((permission) => [permission.key, permission.pivot?.granted !== false])) };
    render();
  }));
  document.querySelectorAll('[data-disable-user]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Disable this user account?')) return;
    try { await api.disableUser(button.dataset.disableUser); state.users = await api.users(); render(); } catch (error) { state.error = error.message; render(); }
  }));
  document.querySelector('#userForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roleIds = [...document.querySelectorAll('[data-user-role]:checked')].map((input) => Number(input.dataset.userRole));
    const grants = Object.fromEntries([...document.querySelectorAll('[data-user-permission]')].map((input) => [input.dataset.userPermission, input.checked]));
    const data = { name: form.get('name'), email: form.get('email'), phone: form.get('phone'), active: form.get('active') === '1' };
    if (state.permissions.includes('roles.manage')) {
      data.role = form.get('role');
      data.role_ids = roleIds;
    }
    if (state.permissions.includes('permissions.assign')) data.permission_grants = grants;
    if (String(form.get('password') ?? '').trim()) data.password = form.get('password');
    try { await api.saveUser(data, state.userEditingId); state.users = await api.users(); state.userFormOpen = false; state.userEditingId = null; state.userForm = null; render(); } catch (error) { const message = document.querySelector('#userMessage'); if (message) message.textContent = error.message; }
  });
  document.querySelectorAll('[data-edit-role]').forEach((button) => button.addEventListener('click', () => { state.roleEditingId = button.dataset.editRole; render(); }));
  document.querySelector('#cancelRole')?.addEventListener('click', () => { state.roleEditingId = null; render(); });
  document.querySelector('#roleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const permissionKeys = [...document.querySelectorAll('[data-role-permission]:checked')].map((input) => input.dataset.rolePermission);
    try { await api.updateRole(state.roleEditingId, { label: form.get('label'), permission_keys: permissionKeys }); state.roles = await api.roles(); state.roleEditingId = null; render(); } catch (error) { const message = document.querySelector('#roleMessage'); if (message) message.textContent = error.message; }
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
    let stops = [];
    let segments = [];
    const message = document.querySelector('#routeMessage');
    try {
      stops = JSON.parse(String(form.get('stops') ?? '[]'));
      segments = JSON.parse(String(form.get('segments') ?? '[]'));
      if (!Array.isArray(stops) || stops.length < 2) throw new Error('Add at least two ordered stops.');
      if (stops.some((stop) => !stop.name)) throw new Error('Every stop needs a name.');
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
      state.routeEditor = null;
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.querySelector('#addRoute')?.addEventListener('click', () => {
    state.routeFormOpen = true;
    state.routeEditingId = null;
    state.routeEditor = routeEditorFrom();
    render();
  });

  document.querySelector('#cancelRoute')?.addEventListener('click', () => {
    state.routeFormOpen = false;
    state.routeEditingId = null;
    state.routeEditor = null;
    render();
  });

  document.querySelectorAll('[data-edit-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const route = state.routes.find((item) => String(item.id) === button.dataset.editRoute);
      if (!route) return;
      state.routeFormOpen = true;
      state.routeEditingId = route.id;
      state.routeEditor = routeEditorFrom(route);
      render();
      const form = document.querySelector('#routeForm');
      form.elements.id.value = route.id;
      form.elements.origin.value = route.origin ?? '';
      form.elements.destination.value = route.destination ?? '';
      form.elements.distance_km.value = route.distance_km ?? 0;
      form.elements.active.value = route.active ? '1' : '0';
      syncRouteEditorPayload();
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

  bindRouteEditor();

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
