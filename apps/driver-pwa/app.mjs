import { fetchDriverContext } from '../../packages/shared/api.mjs';
import { driverStatuses } from '../../packages/shared/domain.mjs';
import { nextDriverState } from '../../packages/shared/business-rules.mjs';
import { badge, progressBar, statCard } from '../../packages/shared/ui.mjs';

const appRoot = document.querySelector('#app');

const state = {
  screen: 'login',
  driver: null,
  currentTrip: null,
  passengers: [],
  tripState: driverStatuses.next,
  incidentNotes: '',
  boardedPassengers: new Set()
};

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.mjs?v=2').catch(() => null);
  }
}

function render() {
  appRoot.innerHTML = `
    <div class="driver-screen">
      <div class="driver-shell">
      ${state.screen === 'login' ? renderLogin() : renderDashboard()}
      </div>
    </div>
  `;
  wireEvents();
}

function renderLogin() {
  return `
    <section class="driver-card driver-login motion-enter">
      <div class="driver-header">
        <div class="driver-brand">
          <img class="driver-badge" src="/logo.svg" alt="Encore Transport" />
          <div>
            <strong>Encore Drive</strong>
            <small>Driver PWA</small>
          </div>
        </div>
        <span class="badge badge--warning">Operations</span>
      </div>
      <img class="driver-hero-image" src="/assets/media/Autobus.png" alt="Encore Transport bus" />
      <div>
        <h1 class="driver-title">Fast access to start your route.</h1>
        <p class="driver-copy">Focused on the driver workflow: one view, clear states, and large touch-friendly actions.</p>
      </div>
      <form id="driverLoginForm" class="driver-grid">
        <label><span class="muted-copy">User</span><input class="field" name="user" value="ricardo.luna" /></label>
        <label><span class="muted-copy">Access code</span><input class="field" name="code" type="password" value="123456" /></label>
        <button class="button button--primary button--block" type="submit">Start shift</button>
      </form>
    </section>
  `;
}

function renderDashboard() {
  const tripStateLabel = state.tripState === driverStatuses.next ? 'UPCOMING' : state.tripState === driverStatuses.active ? 'IN PROGRESS' : 'COMPLETED';
  return `
    <section class="driver-dashboard motion-enter">
      <header class="driver-card driver-header">
        <div class="driver-brand">
          <img class="driver-badge" src="/logo.svg" alt="Encore Transport" />
          <div>
            <strong>${state.driver?.name ?? 'Driver'}</strong>
            <small>${state.driver?.license ?? 'License'}</small>
          </div>
        </div>
        <span class="badge badge--primary">${tripStateLabel}</span>
      </header>

      <section class="driver-card">
        <div class="trip-state">
          <div>
            <div class="badge badge--info">Next trip</div>
            <h2>${state.currentTrip?.origin ?? 'Origin'} → ${state.currentTrip?.destination ?? 'Destination'}</h2>
            <p class="driver-copy">Bus ${state.currentTrip?.busId ?? ''} · Departure ${state.currentTrip?.departureTime ?? ''} · Route ${state.currentTrip?.routeName ?? ''}</p>
          </div>
          <span class="badge badge--neutral">${state.currentTrip?.seatsAvailable ?? 0} seats available</span>
        </div>
        <img class="driver-hero-image" src="/assets/media/Autobus.png" alt="Encore Transport bus" />
        <div class="trip-state__steps">
          ${['UPCOMING', 'IN PROGRESS', 'COMPLETED']
            .map((label, index) => `<div class="trip-state__step ${index === getStepIndex() ? 'trip-state__step--active' : ''}">${label}</div>`)
            .join('')}
        </div>
        ${progressBar(getProgressValue())}
      </section>

      <section class="driver-grid driver-grid--2">
        ${statCard('Passengers', String(state.passengers.length), 'Boarding list')}
        ${statCard('Status', tripStateLabel, 'Operational sequence')}
      </section>

      <section class="driver-card">
        <h3>Passengers</h3>
        <div class="passenger-list">
          ${state.passengers
            .map(
              (passenger) => `
                <div class="passenger-row">
                  <div>
                    <strong>${passenger.name}</strong>
                    <small>${passenger.idNumber}</small>
                  </div>
                  <button class="button button--ghost" data-toggle-passenger="${passenger.id}">${state.boardedPassengers.has(passenger.id) ? 'Boarded' : 'Mark boarded'}</button>
                </div>
              `
            )
            .join('')}
        </div>
      </section>

      <section class="driver-card incident-box">
        <h3>Incidents</h3>
        <textarea class="field" id="incidentNotes" placeholder="Describe the incident if one occurs..."></textarea>
        <div class="driver-actions">
          <button class="button button--ghost" id="boardingAction">Mark boarding</button>
          <button class="button button--primary" id="tripAction">${getPrimaryActionLabel()}</button>
        </div>
      </section>

      <section class="driver-card timeline">
        <h3>Timeline</h3>
        <div class="timeline__item"><span>Route check-in</span><strong>12 min ago</strong></div>
        <div class="timeline__item"><span>Assigned bus</span><strong>${state.currentTrip?.busId ?? ''}</strong></div>
        <div class="timeline__item"><span>Current status</span><strong>${tripStateLabel}</strong></div>
      </section>

      <div class="bottom-status">${tripStateLabel} · ${state.boardedPassengers.size}/${state.passengers.length} passengers confirmed</div>
    </section>
  `;
}

function getStepIndex() {
  if (state.tripState === driverStatuses.next) return 0;
  if (state.tripState === driverStatuses.active) return 1;
  return 2;
}

function getProgressValue() {
  if (state.tripState === driverStatuses.next) return 20;
  if (state.tripState === driverStatuses.active) return 72;
  return 100;
}

function getPrimaryActionLabel() {
  if (state.tripState === driverStatuses.next) return 'Start trip';
  if (state.tripState === driverStatuses.active) return 'Complete trip';
  return 'Trip completed';
}

function wireEvents() {
  document.querySelector('#driverLoginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetchDriverContext();
    state.driver = response.driver;
    state.currentTrip = response.currentTrip;
    state.passengers = response.passengers;
    state.tripState = response.tripState;
    state.screen = 'dashboard';
    render();
  });

  document.querySelectorAll('[data-toggle-passenger]').forEach((button) => {
    button.addEventListener('click', () => {
      const passengerId = button.getAttribute('data-toggle-passenger');
      if (state.boardedPassengers.has(passengerId)) {
        state.boardedPassengers.delete(passengerId);
      } else {
        state.boardedPassengers.add(passengerId);
      }
      render();
    });
  });

  document.querySelector('#incidentNotes')?.addEventListener('input', (event) => {
    state.incidentNotes = event.target.value;
  });

  document.querySelector('#boardingAction')?.addEventListener('click', () => {
    state.tripState = driverStatuses.active;
    render();
  });

  document.querySelector('#tripAction')?.addEventListener('click', () => {
    if (state.tripState === driverStatuses.next) {
      state.tripState = nextDriverState(state.tripState);
    } else if (state.tripState === driverStatuses.active) {
      state.tripState = nextDriverState(state.tripState);
    }
    render();
  });
}

function initialize() {
  registerServiceWorker();
  render();
}

initialize();