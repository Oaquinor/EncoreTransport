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
  mapJourney,
  requestJson,
} from '../../packages/shared/api.mjs';
import { badge, progressBar, statCard } from '../../packages/shared/ui.mjs';
import { renderJourneyMap, destroyRealMap } from '../../packages/shared/real-map.mjs';

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

function render() {
  appRoot.innerHTML = `
    <div class="driver-screen">
      <div class="driver-shell">
        ${state.screen === 'loading'
          ? '<section class="driver-card"><h2>Loading operational data…</h2></section>'
          : renderDashboard()}
      </div>
    </div>`;

  wire();
  void hydrateRouteMap();
}

function renderDashboard() {
  const trip = state.currentTrip;
  const status = trip?.status ?? 'no_trip';

  return `
    <section class="driver-dashboard motion-enter">
      <header class="driver-card driver-header">
        <div class="driver-brand">
          <img class="driver-badge" src="/logo.svg" alt="" aria-hidden="true">
          <div>
            <strong>encore</strong>
            <small>transport · driver</small>
          </div>
        </div>
        <div>
          <span class="badge badge--primary">${esc(status.replaceAll('_', ' ').toUpperCase())}</span>
          <button class="button button--ghost" id="logout">Logout</button>
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
            <button id="refresh" class="button button--primary">Refresh</button>
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
                  class="button button--ghost"
                  data-board="${passenger.id}"
                  ${passenger.boarded_at ? 'disabled' : ''}>
                  ${passenger.boarded_at ? 'Boarded' : 'Mark boarded'}
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
      <button class="button button--ghost" id="saveVehicleStatus">Save vehicle status</button>
    </section>

    <section class="driver-card">
      <h3>Package</h3>
      <div class="driver-grid">
        <label><span class="muted-copy">Recipient</span><input class="field" id="pkgRecipient"></label>
        <label><span class="muted-copy">Phone</span><input class="field" id="pkgPhone"></label>
        <label><span class="muted-copy">Email</span><input class="field" id="pkgEmail" type="email"></label>
        <label><span class="muted-copy">Description</span><textarea class="field" id="pkgDescription"></textarea></label>
      </div>
      <button class="button button--ghost" id="createPackage">Register package</button>
      <div id="packageResult"></div>
    </section>

    <section class="driver-card incident-box">
      <h3>Operational actions</h3>
      <input class="field" id="incidentTitle" placeholder="Incident title">
      <textarea class="field" id="incidentNotes" placeholder="Describe the incident"></textarea>

      <div class="driver-actions">
        <button class="button button--ghost" id="sendGps">Send current GPS</button>
        <button class="button button--ghost" id="reportIncident">Report incident</button>
        <button
          class="button button--primary"
          id="tripAction"
          ${!['scheduled', 'boarding', 'in_progress'].includes(status) ? 'disabled' : ''}>
          ${status === 'in_progress' ? 'Complete trip' : 'Start trip'}
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

  try {
    const [journey, locationPayload] = await Promise.all([
      mapJourney(trip.origin, trip.destination),
      requestJson(`/trips/${trip.id}/location`, { token: false }).catch(() => ({ data: null })),
    ]);

    await renderJourneyMap(container, journey, {
      driverLocation: locationPayload?.data ?? null,
    });
  } catch (error) {
    container.innerHTML = `
      <div class="encore-map-fallback">
        <div>
          <strong>Route map unavailable</strong>
          <span>${esc(error.message)}</span>
        </div>
      </div>`;
  }
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
        fuel_status: 'reported',
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
      if (result) {
        result.innerHTML = `
          <div class="feed-item">
            <strong>${esc(response.package?.reference ?? 'Package registered')}</strong>
            <div>
              Tracking link:
              <a href="${esc(response.tracking_url)}" target="_blank" rel="noopener">
                ${esc(response.tracking_url)}
              </a>
            </div>
          </div>`;
      }
    } catch (error) {
      state.error = error.message;
      render();
    }
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
