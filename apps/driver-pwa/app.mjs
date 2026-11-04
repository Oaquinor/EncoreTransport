import {
  logout,
  fetchDriverProfile,
  fetchDriverTrip,
  fetchDriverPassengers,
  startDriverTrip,
  completeDriverTrip,
  boardPassenger,
  sendDriverLocation,
  createIncident,
  getApiToken,
  fetchDriverSchedule,
  updateVehicleStatus,
  createPackage,
  scanPackageQr,
  createPackageManifest,
  fetchPackageManifest,
  scanPackageManifest,
  reconcilePackageManifest,
  recordPackageDiscrepancy,
  requestPackageTransfer,
  acceptPackageTransfer,
  mapJourney,
  requestJson,
} from '../../packages/shared/api.mjs';
import { badge, progressBar, statCard } from '../../packages/shared/ui.mjs';
import { icon } from '../../packages/shared/icons.mjs';
import { renderJourneyMapWithLoader, destroyRealMap } from '../../packages/shared/real-map.mjs';

const appRoot = document.querySelector('#app');

const state = {
  screen: 'loading',
  driver: null,
  currentTrip: null,
  passengers: [],
  schedule: [],
  error: '',
  vehicleStatus: {
    fuel_percent: '',
    engine_status: 'unknown',
    tires_status: 'unknown',
    network_status: 'unknown',
  },
  package: null,
  packageTrackingUrl: '',
  manifest: null,
  packageQrToken: '',
  discrepancyType: 'missing_item',
  discrepancyNotes: '',
  transferDriverId: '',
  transferId: '',
  transfer: null,
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

function initials(value = 'Driver') {
  return String(value).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'DR';
}

function driverPhotoUrl(driver) {
  const path = driver?.photo_path;
  if (!path) return '';
  if (/^https?:\/\//i.test(String(path))) return String(path);
  return String(path).startsWith('/') ? String(path) : `/storage/${String(path).replace(/^storage\//, '')}`;
}

function render() {
  appRoot.innerHTML = `
    <div class="driver-screen">
      <div class="driver-shell">
        ${state.screen === 'loading'
          ? '<section class="driver-card driver-loading-state" role="status" aria-live="polite"><img src="/assets/media/encore-loader.gif" alt="" width="128" height="128" /><strong>Loading operational data…</strong><span>Preparing your route and operational tools.</span><div class="driver-loading-state__progress" aria-hidden="true"><i></i><i></i><i></i></div></section>'
          : renderDashboard()}
      </div>
    </div>`;

  wire();
  void hydrateRouteMap();
}

function renderDashboard() {
  const trip = state.currentTrip;
  const status = trip?.status ?? 'no_trip';
  const driverName = state.driver?.name ?? state.driver?.user?.name ?? 'Driver';
  const photoUrl = driverPhotoUrl(state.driver);

  return `
    <section class="driver-dashboard">
      <header class="driver-card driver-header">
        <div class="driver-brand">
          <div class="driver-avatar" aria-hidden="true">${photoUrl ? `<img src="${esc(photoUrl)}" alt="">` : initials(driverName)}</div>
          <div>
            <strong>${esc(driverName)}</strong>
            <small>Encore Drive · operations</small>
          </div>
        </div>
        <div class="driver-header__actions">
          <span class="badge badge--primary">${esc(status.replaceAll('_', ' ').toUpperCase())}</span>
          <button type="button" class="button button--ghost button--with-icon" id="logout">${icon('logout')}Logout</button>
        </div>
      </header>

      ${state.error
        ? `<section class="driver-card"><strong>Operation error</strong><p>${esc(state.error)}</p></section>`
        : ''}

      ${renderSchedule()}

      ${!trip
        ? `<section class="driver-card">
            <h2>No active or upcoming trip assigned.</h2>
            <p class="driver-copy">Refresh after Operations assigns a trip.</p>
            <button type="button" id="refresh" class="button button--primary button--with-icon">${icon('refresh')}Refresh</button>
          </section>`
        : renderTrip(trip)}
    </section>`;
}

function renderSchedule() {
  return `
    <section class="driver-card">
      <h3>Schedule</h3>
      ${state.schedule.length
        ? `<div class="passenger-list">${state.schedule.map((item) => `
            <div class="passenger-row">
              <div>
                <strong>${esc(String(item.work_date ?? '').slice(0, 10))} · ${esc((item.starts_at ?? '').slice(0, 5))}-${esc((item.ends_at ?? '').slice(0, 5))}</strong>
                <small>${esc(item.trip?.route ? `${item.trip.route.origin} → ${item.trip.route.destination}` : item.notes ?? 'Scheduled')}</small>
              </div>
              <span class="badge badge--neutral">${esc(item.status)}</span>
            </div>`).join('')}</div>`
        : '<p class="driver-copy">No upcoming schedule entries.</p>'}
    </section>`;
}

function renderTrip(trip) {
  const status = trip.status ?? 'scheduled';

  return `
    <section class="driver-card">
      <div class="trip-state">
        <div>
          <div class="badge badge--info">Assigned trip</div>
          <h2>${esc(trip.origin)} → ${esc(trip.destination)}</h2>
          <p class="driver-copy">
            ${esc(trip.busCode ?? `Bus ${trip.busId ?? ''}`)} ·
            Departure ${esc((trip.departureTime ?? '').slice(0, 5))} ·
            Trip ${esc(trip.id)}
          </p>
        </div>
        <span class="badge badge--neutral">${Number(trip.availableSeats ?? 0)} seats available</span>
      </div>

      <div class="driver-map-head">
        <div>
          <strong>Route and current position</strong>
          <small>Position appears only after authorized GPS updates exist.</small>
        </div>
        <span class="badge badge--neutral">TomTom</span>
      </div>
      <div id="driverRouteMap" class="driver-route-map" aria-label="Driver route map"></div>

      ${progressBar(status === 'scheduled' ? 20 : status === 'boarding' ? 40 : status === 'in_progress' ? 72 : 100)}
    </section>

    <section class="driver-quick-grid" aria-label="Trip overview">
      <div><span>${icon('clock')} Departure</span><strong>${esc((trip.departureTime ?? '').slice(0, 5) || '—')}</strong><small>${esc(trip.departureDate ?? 'Today')}</small></div>
      <div><span>${icon('bus')} Vehicle</span><strong>${esc(trip.busCode ?? `Bus ${trip.busId ?? '—'}`)}</strong><small>Assigned for this trip</small></div>
      <div><span>${icon('seat')} Capacity</span><strong>${Number(trip.availableSeats ?? 0)}</strong><small>Seats available</small></div>
    </section>

    <section class="driver-grid driver-grid--2">
      ${statCard('Passengers', String(state.passengers.length), 'Confirmed boarding list')}
      ${statCard('Status', status.replaceAll('_', ' ').toUpperCase(), 'Server state')}
    </section>

    <section class="driver-card">
      <h3>Passengers</h3>
      <div class="passenger-list">
        ${state.passengers.length
          ? state.passengers.map((passenger) => `
              <div class="passenger-row">
                <div>
                  <strong>${esc(passenger.full_name)}</strong>
                  <small>${esc(passenger.booking?.reference ?? '')}</small>
                </div>
                <button
                  type="button"
                  class="button button--ghost button--with-icon"
                  data-board="${passenger.id}"
                  ${passenger.boarded_at ? 'disabled' : ''}>
                  ${icon(passenger.boarded_at ? 'user' : 'seat')}${passenger.boarded_at ? 'Boarded' : 'Mark boarded'}
                </button>
              </div>`).join('')
          : '<p class="driver-copy">No confirmed passengers registered for this trip.</p>'}
      </div>
    </section>

    <section class="driver-card">
      <h3>Vehicle condition</h3>
      <p class="driver-copy">Manual reports are stored separately from sensor or network telemetry.</p>
      <div class="driver-grid driver-grid--2">
        <label>
          <span class="muted-copy">Fuel %</span>
          <input class="field" id="fuelPercent" type="number" min="0" max="100" value="${esc(state.vehicleStatus.fuel_percent)}">
        </label>
        <label>
          <span class="muted-copy">Engine</span>
          <select class="field" id="engineStatus">
            ${statusOptions(['ok', 'warning', 'critical', 'unknown'], state.vehicleStatus.engine_status)}
          </select>
        </label>
        <label>
          <span class="muted-copy">Tires</span>
          <select class="field" id="tiresStatus">
            ${statusOptions(['ok', 'warning', 'critical', 'unknown'], state.vehicleStatus.tires_status)}
          </select>
        </label>
        <label>
          <span class="muted-copy">Network</span>
          <select class="field" id="networkStatus">
            ${statusOptions(['online', 'degraded', 'offline', 'unknown'], state.vehicleStatus.network_status)}
          </select>
        </label>
      </div>
      <button type="button" class="button button--ghost button--with-icon" id="saveVehicleStatus">${icon('refresh')}Save vehicle status</button>
    </section>

    <section class="driver-card">
      <div class="driver-section-heading"><div><h3>Package intake</h3><p class="driver-copy">Register cargo before the vehicle leaves.</p></div><a class="button button--ghost button--with-icon" href="/package-register/">${icon('package')}Full intake</a></div>
      <div class="driver-grid">
        <label><span class="muted-copy">Recipient</span><input class="field" id="pkgRecipient"></label>
        <label><span class="muted-copy">Phone</span><input class="field" id="pkgPhone"></label>
        <label><span class="muted-copy">Email</span><input class="field" id="pkgEmail" type="email"></label>
        <label><span class="muted-copy">Description</span><textarea class="field" id="pkgDescription"></textarea></label>
      </div>
      <button type="button" class="button button--ghost button--with-icon" id="createPackage">${icon('package')}Register package</button>
      <div id="packageResult">${state.packageTrackingUrl ? `<div class="feed-item"><strong>${esc(state.package?.reference ?? 'Package registered')}</strong><div>Tracking link: <a href="${esc(state.packageTrackingUrl)}" target="_blank" rel="noopener">${esc(state.packageTrackingUrl)}</a></div></div>` : ''}</div>
      <div class="driver-custody-tools">
        <h4>Custody controls</h4>
        <label><span class="muted-copy">Package QR token</span><input class="field" id="packageQrToken" value="${esc(state.packageQrToken)}" placeholder="Paste or scan the opaque QR token"></label>
        <div class="driver-actions"><button class="button button--ghost button--with-icon" id="scanPackageQr" type="button">${icon('qr')}Scan / query custody</button><button class="button button--ghost button--with-icon" id="loadPackage" type="button" ${state.package?.id ? '' : 'disabled'}>${icon('package')}Load</button><button class="button button--ghost button--with-icon" id="unloadPackage" type="button" ${state.package?.id ? '' : 'disabled'}>${icon('package')}Unload / deliver</button></div>
        <div class="driver-grid"><label><span class="muted-copy">Discrepancy type</span><input class="field" id="discrepancyType" value="${esc(state.discrepancyType)}"></label><label><span class="muted-copy">Discrepancy notes</span><input class="field" id="discrepancyNotes" value="${esc(state.discrepancyNotes)}"></label></div>
        <button class="button button--ghost button--with-icon" id="recordDiscrepancy" type="button" ${state.package?.id ? '' : 'disabled'}>${icon('report')}Record discrepancy</button>
        <div class="driver-grid"><label><span class="muted-copy">Receiving driver ID</span><input class="field" id="transferDriverId" value="${esc(state.transferDriverId)}"></label><label><span class="muted-copy">Transfer ID to accept</span><input class="field" id="transferId" value="${esc(state.transferId)}"></label></div>
        <div class="driver-actions"><button class="button button--ghost button--with-icon" id="requestPackageTransfer" type="button" ${state.package?.id ? '' : 'disabled'}>${icon('route')}Transfer package</button><button class="button button--ghost button--with-icon" id="acceptPackageTransfer" type="button">${icon('save')}Accept transfer</button></div>
        <div class="driver-actions"><button class="button button--ghost button--with-icon" id="createManifest" type="button" ${state.package?.id ? '' : 'disabled'}>${icon('plus')}Create manifest</button><button class="button button--ghost button--with-icon" id="refreshManifest" type="button" ${state.manifest?.id ? '' : 'disabled'}>${icon('refresh')}Refresh manifest</button><button class="button button--ghost button--with-icon" id="reconcileManifest" type="button" ${state.manifest?.id ? '' : 'disabled'}>${icon('report')}Reconcile manifest</button></div>
        ${state.package ? `<div class="feed-item"><strong>${esc(state.package.reference)} · ${esc(state.package.status)}</strong><small>${esc(state.package.events?.at(-1)?.status ?? 'No custody events')}</small></div>` : ''}
        ${state.manifest ? `<div class="feed-item"><strong>Manifest ${esc(state.manifest.reference)}</strong><small>${Number(state.manifest.scanned_count ?? 0)} / ${Number(state.manifest.expected_count ?? 0)} scanned · ${esc(state.manifest.status)}</small></div>` : ''}
      </div>
    </section>

    <section class="driver-card incident-box">
      <h3>Operational actions</h3>
      <input class="field" id="incidentTitle" placeholder="Incident title">
      <textarea class="field" id="incidentNotes" placeholder="Describe the incident"></textarea>

      <div class="driver-actions">
        <button type="button" class="button button--ghost button--with-icon" id="sendGps">${icon('route')}Send current GPS</button>
        <button type="button" class="button button--ghost button--with-icon" id="reportIncident">${icon('info')}Report incident</button>
        <button
          type="button"
          class="button button--primary button--with-icon"
          id="tripAction"
          ${!['scheduled', 'boarding', 'in_progress'].includes(status) ? 'disabled' : ''}>
          ${icon(status === 'in_progress' ? 'route' : 'arrowRight')}${status === 'in_progress' ? 'Complete trip' : 'Start trip'}
        </button>
      </div>
    </section>`;
}

function statusOptions(values, selected) {
  return values.map((value) =>
    `<option value="${value}" ${selected === value ? 'selected' : ''}>${value[0].toUpperCase()}${value.slice(1)}</option>`
  ).join('');
}

async function hydrateRouteMap() {
  const container = document.querySelector('#driverRouteMap');
  const trip = state.currentTrip;

  if (!container || !trip) return;

  const mapOptions = {};
  await renderJourneyMapWithLoader(container, async () => {
    const [journey, locationPayload] = await Promise.all([
      mapJourney(trip.origin, trip.destination),
      requestJson(`/trips/${trip.id}/location`).catch(() => ({ data: null })),
    ]);
    mapOptions.driverLocation = locationPayload?.data ?? null;
    return journey;
  }, mapOptions);
}

async function load() {
  state.screen = 'loading';
  state.error = '';
  render();

  try {
    state.driver = await fetchDriverProfile();

    const [trip, schedule] = await Promise.all([
      fetchDriverTrip(),
      fetchDriverSchedule(),
    ]);

    state.currentTrip = trip;
    state.schedule = schedule;
    state.passengers = trip
      ? await fetchDriverPassengers(trip.id)
      : [];

    state.screen = 'dashboard';
  } catch (error) {
    state.error = error.message;

    if ([401, 403, 404].includes(error.status)) {
      sessionStorage.removeItem('encore_api_token');
      localStorage.removeItem('encore_api_token');
      location.replace('/login/?return=' + encodeURIComponent('/driver/'));
      return;
    }

    state.screen = 'dashboard';
  }

  render();
}

function wire() {
  document.querySelector('#logout')?.addEventListener('click', async () => {
    await logout();
    location.replace('/login/?return=' + encodeURIComponent('/driver/'));
  });

  document.querySelector('#refresh')?.addEventListener('click', load);

  document.querySelector('#tripAction')?.addEventListener('click', async () => {
    if (!state.currentTrip) return;

    try {
      state.currentTrip =
        state.currentTrip.status === 'in_progress'
          ? await completeDriverTrip(state.currentTrip.id)
          : await startDriverTrip(state.currentTrip.id);

      state.error = '';
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  });

  document.querySelectorAll('[data-board]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await boardPassenger(state.currentTrip.id, button.dataset.board);
        state.passengers = await fetchDriverPassengers(state.currentTrip.id);
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
  });

  document.querySelector('#saveVehicleStatus')?.addEventListener('click', async () => {
    try {
      const fuelValue = document.querySelector('#fuelPercent')?.value;

      await updateVehicleStatus({
        trip_id: state.currentTrip.id,
        fuel_percent: fuelValue === '' ? null : Number(fuelValue),
        engine_status: document.querySelector('#engineStatus')?.value,
        tires_status: document.querySelector('#tiresStatus')?.value,
        network_status: document.querySelector('#networkStatus')?.value,
      });

      state.vehicleStatus = {
        fuel_percent: fuelValue,
        engine_status: document.querySelector('#engineStatus')?.value,
        tires_status: document.querySelector('#tiresStatus')?.value,
        network_status: document.querySelector('#networkStatus')?.value,
      };

      alert('Vehicle status saved.');
    } catch (error) {
      state.error = error.message;
      render();
    }
  });

  document.querySelector('#createPackage')?.addEventListener('click', async () => {
    try {
      const response = await createPackage({
        trip_id: state.currentTrip.id,
        recipient_name: document.querySelector('#pkgRecipient')?.value?.trim(),
        recipient_phone: document.querySelector('#pkgPhone')?.value?.trim() || null,
        recipient_email: document.querySelector('#pkgEmail')?.value?.trim() || null,
        description: document.querySelector('#pkgDescription')?.value?.trim() || null,
      });

      const result = document.querySelector('#packageResult');
      state.package = response.package;
      state.packageTrackingUrl = response.tracking_url ?? '';
      state.packageQrToken = response.qr_payload?.token ?? state.packageQrToken;
      if (result) result.innerHTML = '';
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  });

  document.querySelector('#scanPackageQr')?.addEventListener('click', async () => {
    const token = document.querySelector('#packageQrToken')?.value?.trim();
    if (!token) { state.error = 'An opaque package QR token is required.'; render(); return; }
    try { state.packageQrToken = token; state.package = await scanPackageQr(token); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#loadPackage')?.addEventListener('click', async () => {
    try { state.package = await requestJson(`/driver/packages/${state.package.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'in_progress' }) }).then((payload) => payload.data ?? payload); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#unloadPackage')?.addEventListener('click', async () => {
    state.error = 'Delivery validation requires recipient verification and a private photo. Use Full intake to attach the evidence before closing custody.';
    render();
  });
  document.querySelector('#recordDiscrepancy')?.addEventListener('click', async () => {
    try { state.discrepancyType = document.querySelector('#discrepancyType')?.value?.trim() || 'other'; state.discrepancyNotes = document.querySelector('#discrepancyNotes')?.value?.trim() || ''; if (!state.discrepancyNotes) throw new Error('Discrepancy notes are required.'); await recordPackageDiscrepancy(state.package.id, state.discrepancyType, state.discrepancyNotes); state.package = await scanPackageQr(state.packageQrToken); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#requestPackageTransfer')?.addEventListener('click', async () => {
    try { state.transferDriverId = document.querySelector('#transferDriverId')?.value?.trim() || ''; state.transfer = await requestPackageTransfer(state.package.id, state.transferDriverId); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#acceptPackageTransfer')?.addEventListener('click', async () => {
    try { state.transferId = document.querySelector('#transferId')?.value?.trim() || ''; state.transfer = await acceptPackageTransfer(state.transferId); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#createManifest')?.addEventListener('click', async () => {
    try { state.manifest = await createPackageManifest({ trip_id: state.currentTrip.id, package_ids: [state.package.id] }); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#refreshManifest')?.addEventListener('click', async () => {
    try { state.manifest = await fetchPackageManifest(state.manifest.id); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector('#reconcileManifest')?.addEventListener('click', async () => {
    try { state.manifest = await reconcilePackageManifest(state.manifest.id); state.error = ''; render(); } catch (error) { state.error = error.message; render(); }
  });

  document.querySelector('#reportIncident')?.addEventListener('click', async () => {
    const title = document.querySelector('#incidentTitle')?.value?.trim();
    const description = document.querySelector('#incidentNotes')?.value?.trim();

    if (!title || !description) {
      state.error = 'Incident title and description are required.';
      render();
      return;
    }

    try {
      await createIncident({
        trip_id: state.currentTrip.id,
        title,
        description,
        severity: 'medium',
      });

      alert('Incident registered.');
    } catch (error) {
      state.error = error.message;
      render();
    }
  });

  document.querySelector('#sendGps')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      state.error = 'Geolocation is not supported on this device.';
      render();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await sendDriverLocation({
            trip_id: state.currentTrip.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
            speed_kph: position.coords.speed == null
              ? null
              : position.coords.speed * 3.6,
            recorded_at: new Date().toISOString(),
          });

          await hydrateRouteMap();
          alert('Current position stored.');
        } catch (error) {
          state.error = error.message;
          render();
        }
      },
      (error) => {
        state.error = error.message;
        render();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000,
      },
    );
  });
}

if (getApiToken()) {
  load();
} else {
  location.replace('/login/?return=' + encodeURIComponent('/driver/'));
}

window.addEventListener('beforeunload', () => {
  const mapContainer = document.querySelector('#driverRouteMap');
  if (mapContainer) destroyRealMap(mapContainer);
});
