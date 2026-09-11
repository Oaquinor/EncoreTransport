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
            <small>Operación en ruta</small>
          </div>
        </div>
        <span class="badge badge--warning">Operación</span>
      </div>
      <img class="driver-hero-image" src="/assets/media/Autobus.png" alt="Autobús de Encore Transport" />
      <div>
        <h1 class="driver-title">Acceso rápido para salir a ruta.</h1>
        <p class="driver-copy">Interfaz enfocada en el trabajo del conductor: una sola vista, estados claros y acciones grandes.</p>
      </div>
      <form id="driverLoginForm" class="driver-grid">
        <label><span class="muted-copy">Usuario</span><input class="field" name="user" value="ricardo.luna" /></label>
        <label><span class="muted-copy">Código de acceso</span><input class="field" name="code" type="password" value="123456" /></label>
        <button class="button button--primary button--block" type="submit">Entrar al turno</button>
      </form>
    </section>
  `;
}

function renderDashboard() {
  const tripStateLabel = state.tripState === driverStatuses.next ? 'PRÓXIMO' : state.tripState === driverStatuses.active ? 'EN CURSO' : 'FINALIZADO';
  return `
    <section class="driver-dashboard motion-enter">
      <header class="driver-card driver-header">
        <div class="driver-brand">
          <img class="driver-badge" src="/logo.svg" alt="Encore Transport" />
          <div>
            <strong>${state.driver?.name ?? 'Conductor'}</strong>
            <small>${state.driver?.license ?? 'Licencia'}</small>
          </div>
        </div>
        <span class="badge badge--primary">${tripStateLabel}</span>
      </header>

      <section class="driver-card">
        <div class="trip-state">
          <div>
            <div class="badge badge--info">Próximo viaje</div>
            <h2>${state.currentTrip?.origin ?? 'Origen'} → ${state.currentTrip?.destination ?? 'Destino'}</h2>
            <p class="driver-copy">Bus ${state.currentTrip?.busId ?? ''} · Salida ${state.currentTrip?.departureTime ?? ''} · Ruta ${state.currentTrip?.routeName ?? ''}</p>
          </div>
          <span class="badge badge--neutral">${state.currentTrip?.seatsAvailable ?? 0} asientos libres</span>
        </div>
        <img class="driver-hero-image" src="/assets/media/Autobus.png" alt="Autobús de Encore Transport" />
        <div class="trip-state__steps">
          ${['PRÓXIMO', 'EN CURSO', 'FINALIZADO']
            .map((label, index) => `<div class="trip-state__step ${index === getStepIndex() ? 'trip-state__step--active' : ''}">${label}</div>`)
            .join('')}
        </div>
        ${progressBar(getProgressValue())}
      </section>

      <section class="driver-grid driver-grid--2">
        ${statCard('Pasajeros', String(state.passengers.length), 'Lista de abordaje')}
        ${statCard('Estado', tripStateLabel, 'Secuencia operativa')}
      </section>

      <section class="driver-card">
        <h3>Pasajeros</h3>
        <div class="passenger-list">
          ${state.passengers
            .map(
              (passenger) => `
                <div class="passenger-row">
                  <div>
                    <strong>${passenger.name}</strong>
                    <small>${passenger.idNumber}</small>
                  </div>
                  <button class="button button--ghost" data-toggle-passenger="${passenger.id}">${state.boardedPassengers.has(passenger.id) ? 'Abordado' : 'Marcar'}</button>
                </div>
              `
            )
            .join('')}
        </div>
      </section>

      <section class="driver-card incident-box">
        <h3>Incidencias</h3>
        <textarea class="field" id="incidentNotes" placeholder="Describe el incidente si ocurre..."></textarea>
        <div class="driver-actions">
          <button class="button button--ghost" id="boardingAction">Marcar abordaje</button>
          <button class="button button--primary" id="tripAction">${getPrimaryActionLabel()}</button>
        </div>
      </section>

      <section class="driver-card timeline">
        <h3>Bitácora</h3>
        <div class="timeline__item"><span>Check-in de ruta</span><strong>Hace 12 min</strong></div>
        <div class="timeline__item"><span>Bus asignado</span><strong>${state.currentTrip?.busId ?? ''}</strong></div>
        <div class="timeline__item"><span>Estado actual</span><strong>${tripStateLabel}</strong></div>
      </section>

      <div class="bottom-status">${tripStateLabel} · ${state.boardedPassengers.size}/${state.passengers.length} pasajeros confirmados</div>
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
  if (state.tripState === driverStatuses.next) return 'Iniciar viaje';
  if (state.tripState === driverStatuses.active) return 'Finalizar viaje';
  return 'Viaje completado';
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
