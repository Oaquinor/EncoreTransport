import { fetchPassengerSearch, fetchTripDetails, reserveTripSeats } from '../../packages/shared/api.mjs?v=2';
import { getTripStatusTone } from '../../packages/shared/business-rules.mjs?v=2';
import { formatCurrency, formatDateLabel, formatTimeLabel } from '../../packages/shared/domain.mjs?v=2';
import { badge, emptyState, progressBar, skeletonCard, statCard } from '../../packages/shared/ui.mjs?v=2';

const appRoot = document.querySelector('#app');
const initialQuery = new URLSearchParams(window.location.search);
const defaultDate = '2026-09-12';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const state = {
  screen: 'splash',
  loading: false,
  searchResults: [],
  selectedTrip: null,
  selectedSeats: [],
  booking: null,
  search: {
    origin: initialQuery.get('origin') ?? 'Ciudad de México',
    destination: initialQuery.get('destination') ?? 'Puebla',
    date: initialQuery.get('date') ?? defaultDate,
    passengers: Number(initialQuery.get('passengers') ?? 2)
  },
  passenger: {
    name: 'María Torres',
    email: 'maria.torres@mail.com',
    phone: '55 2088 3399',
    documentId: 'MX-748211'
  },
  paymentProgress: 'idle'
};

const screens = ['search', 'results', 'seat', 'passenger', 'summary', 'payment', 'confirmation'];

function minutesToLabel(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} h ${remainder.toString().padStart(2, '0')} min`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.mjs?v=3').catch(() => null);
  }
}

function render() {
  const currentStepIndex = Math.max(0, screens.indexOf(state.screen));

  appRoot.innerHTML = `
    <div class="passenger-shell">
      <div class="passenger-app motion-enter">
        <header class="passenger-topbar">
          <div class="passenger-topbar__brand">
            <img class="passenger-logo" src="/logo.svg" alt="Encore Transport" />
            <div>
              <strong>Encore Move</strong>
              <small>Reserva de viajes</small>
            </div>
          </div>
          <span class="badge badge--neutral">${formatDateLabel(state.search.date)}</span>
        </header>

        ${renderProgress(currentStepIndex)}
        ${renderScreen()}

        <nav class="bottom-nav" aria-label="Navegación rápida">
          ${bottomNavItem('Buscar', state.screen === 'search')}
          ${bottomNavItem('Viaje', state.screen === 'results' || state.screen === 'seat')}
          ${bottomNavItem('Reserva', state.screen === 'passenger' || state.screen === 'summary')}
          ${bottomNavItem('Estado', state.screen === 'payment' || state.screen === 'confirmation')}
        </nav>
      </div>
    </div>
  `;

  wireEvents();
}

function bottomNavItem(label, active) {
  return `<div class="bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}">${label}</div>`;
}

function renderProgress(currentStepIndex) {
  const percentage = Math.round((currentStepIndex / (screens.length - 1)) * 100);
  return `
    <section class="passenger-card card card--pad stepper">
      <div class="progress-wrap">
        <strong>Progreso de la reserva</strong>
        <span class="badge badge--primary">${percentage}%</span>
      </div>
      ${progressBar(percentage)}
      <div class="stepper__items">
        ${['Inicio', 'Resultados', 'Asiento', 'Datos', 'Resumen', 'Pago', 'Éxito']
          .map((label, index) => `<div class="stepper__item ${index <= currentStepIndex ? 'stepper__item--active' : ''}">${label}</div>`)
          .join('')}
      </div>
    </section>
  `;
}

function renderScreen() {
  switch (state.screen) {
    case 'splash':
      return `
        <section class="passenger-stage passenger-stage--splash motion-enter">
          <div class="splash-orbit"></div>
          <div>
            <div class="badge badge--info splash-badge">Instalable · Mobile first</div>
            <h1 class="splash-title">Encuentra tu viaje en segundos.</h1>
            <p class="splash-copy">Reserva con una experiencia fluida, clara y pensada para tocar y avanzar sin fricción.</p>
          </div>
          <img class="splash-hero-image" src="/assets/media/logo.jpeg" alt="Encore Transport en operación" />
        </section>
      `;
    case 'search':
      return renderSearch();
    case 'results':
      return renderResults();
    case 'seat':
      return renderSeatMap();
    case 'passenger':
      return renderPassengerForm();
    case 'summary':
      return renderSummary();
    case 'payment':
      return renderPayment();
    case 'confirmation':
      return renderConfirmation();
    default:
      return '';
  }
}

function renderSearch() {
  return `
    <section class="passenger-card card card--pad motion-enter">
      <div class="search-chip">Búsqueda rápida y visual</div>
      <h2>Selecciona tu próximo trayecto</h2>
      <form class="search-form" id="searchForm">
        <div class="search-form__grid search-form__grid--2">
          <label>
            <span class="muted-copy">Origen</span>
            <input class="field" name="origin" value="${escapeHtml(state.search.origin)}" />
          </label>
          <label>
            <span class="muted-copy">Destino</span>
            <input class="field" name="destination" value="${escapeHtml(state.search.destination)}" />
          </label>
        </div>
        <div class="search-form__grid search-form__grid--2">
          <label>
            <span class="muted-copy">Fecha</span>
            <input class="field" type="date" name="date" value="${escapeHtml(state.search.date)}" />
          </label>
          <label>
            <span class="muted-copy">Pasajeros</span>
            <input class="field" type="number" min="1" max="8" name="passengers" value="${escapeHtml(state.search.passengers)}" />
          </label>
        </div>
        <button class="button button--primary button--block" type="submit">Buscar viaje</button>
      </form>
    </section>
  `;
}

function renderResults() {
  if (state.loading) {
    return `
      <section class="grid" style="gap: 12px;">
        ${skeletonCard(4)}
        ${skeletonCard(4)}
      </section>
    `;
  }

  if (!state.searchResults.length) {
    return emptyState('No encontramos salidas para esos filtros.', 'Prueba otra ruta, fecha o número de pasajeros.', 'Buscar de nuevo');
  }

  return `
    <section class="grid" style="gap: 12px;">
      ${state.searchResults
        .map(
          (trip) => `
            <article class="passenger-card card card--pad trip-card ${trip.featured ? 'trip-card--featured' : ''}">
              <div class="trip-card__header">
                <div>
                  <div class="badge badge--${getTripBadgeTone(trip.status)}">${trip.status.replace('_', ' ')}</div>
                  <h3>${trip.origin} → ${trip.destination}</h3>
                </div>
                <strong>${trip.priceLabel}</strong>
              </div>
              <div class="trip-card__meta">
                <small>${formatTimeLabel(trip.departureTime)} · ${minutesToLabel(trip.durationMinutes)}</small>
                <small>${trip.availableSeats} asientos disponibles</small>
              </div>
              <div class="trip-card__footer">
                <div>${trip.highlights.map((item) => badge(item, 'neutral')).join(' ')}</div>
                <div class="trip-card__actions">
                  <button class="button button--ghost" data-detail-trip="${trip.id}">Detalles</button>
                  <button class="button button--primary" data-select-trip="${trip.id}">Elegir</button>
                </div>
              </div>
            </article>
          `
        )
        .join('')}
    </section>
  `;
}

function getTripBadgeTone(status) {
  return getTripStatusTone(status);
}

function renderSeatMap() {
  if (!state.selectedTrip) {
    return emptyState('Selecciona un viaje primero.', 'Regresa a resultados para elegir una salida.', 'Volver');
  }

  const rows = [];
  for (let index = 0; index < state.selectedTrip.seatMap.length; index += 4) {
    const slice = state.selectedTrip.seatMap.slice(index, index + 4);
    rows.push(`
      <div class="seat-row">
        <div class="seat-row__label">${Math.floor(index / 4) + 1}</div>
        ${slice
          .map(
            (seat) => `
              <button class="seat ${seat.reserved ? 'seat--reserved' : ''} ${seat.blocked ? 'seat--blocked' : ''} ${state.selectedSeats.includes(seat.id) ? 'seat--selected' : ''}" data-seat="${seat.id}" ${seat.reserved || seat.blocked ? 'disabled' : ''}>
                ${seat.id}
              </button>
            `
          )
          .join('')}
      </div>
    `);
  }

  return `
    <section class="passenger-card card card--pad motion-enter">
      <div class="seat-header">
        <div>
          <div class="badge badge--info">Selecciona asiento</div>
          <h2>${state.selectedTrip.origin} → ${state.selectedTrip.destination}</h2>
        </div>
        <strong>${state.selectedSeats.length}/${state.search.passengers}</strong>
      </div>
      <p class="seat-note">Toca los asientos disponibles. Los ocupados o bloqueados se muestran deshabilitados.</p>
      <div class="seat-map">
        <div class="seat-rows">${rows.join('')}</div>
      </div>
      <div class="seat-actions">
        <button class="button button--ghost" id="backToResults">Volver</button>
        <button class="button button--primary" id="continueToPassenger" ${state.selectedSeats.length !== state.search.passengers ? 'disabled' : ''}>Continuar</button>
      </div>
    </section>
  `;
}

function renderPassengerForm() {
  return `
    <section class="passenger-card card card--pad motion-enter">
      <div class="payment-header">
        <div>
          <div class="badge badge--neutral">Datos del pasajero</div>
          <h2>Completa tu información</h2>
        </div>
        <span class="badge badge--success">Seguro</span>
      </div>
      <form class="form-grid" id="passengerForm">
        <label><span class="muted-copy">Nombre</span><input class="field" name="name" value="${escapeHtml(state.passenger.name)}" /></label>
        <label><span class="muted-copy">Correo</span><input class="field" type="email" name="email" value="${escapeHtml(state.passenger.email)}" /></label>
        <label><span class="muted-copy">Teléfono</span><input class="field" name="phone" value="${escapeHtml(state.passenger.phone)}" /></label>
        <label><span class="muted-copy">Documento</span><input class="field" name="documentId" value="${escapeHtml(state.passenger.documentId)}" /></label>
        <div class="payment-actions">
          <button class="button button--ghost" type="button" id="backToSeats">Volver</button>
          <button class="button button--primary" type="submit">Ver resumen</button>
        </div>
      </form>
    </section>
  `;
}

function renderSummary() {
  if (!state.selectedTrip) {
    return '';
  }

  const total = state.selectedTrip.priceLabel;
  return `
    <section class="passenger-card card card--pad motion-enter">
      <div class="summary-row">
        <div>
          <div class="badge badge--primary">Resumen</div>
          <h2>Revisa antes de pagar</h2>
        </div>
        <strong>${total}</strong>
      </div>
      <div class="summary-list">
        <div class="summary-list__item"><span>Viaje</span><strong>${state.selectedTrip.origin} → ${state.selectedTrip.destination}</strong></div>
        <div class="summary-list__item"><span>Fecha</span><strong>${formatDateLabel(state.search.date)}</strong></div>
        <div class="summary-list__item"><span>Asientos</span><strong>${state.selectedSeats.join(', ')}</strong></div>
        <div class="summary-list__item"><span>Pasajero</span><strong>${escapeHtml(state.passenger.name)}</strong></div>
      </div>
      <div class="confirmation-actions">
        <button class="button button--ghost" id="backToPassenger">Editar datos</button>
        <button class="button button--primary" id="startPayment">Procesar pago</button>
      </div>
    </section>
  `;
}

function renderPayment() {
  const processingState = state.paymentProgress === 'processing' ? 'Procesando' : state.paymentProgress === 'confirming' ? 'Confirmando' : 'Preparando';
  return `
    <section class="passenger-card card card--pad payment-flow motion-enter">
      <div class="payment-screen">
        <div class="loading-pulse"></div>
        <div class="text-center">
          <div class="badge badge--warning">${processingState}</div>
          <h2>Estamos asegurando tu reserva</h2>
          <p class="muted-copy">Validando asientos, confirmando disponibilidad y preparando el comprobante.</p>
        </div>
      </div>
    </section>
  `;
}

function renderConfirmation() {
  const bookingCode = state.booking?.id ?? 'Reserva en proceso';
  const isPendingPayment = state.booking?.status === 'pending_payment';
  const bookingStatus = isPendingPayment ? 'Pago pendiente' : 'Confirmada';
  const statusBadge = isPendingPayment ? 'warning' : 'success';
  const statusTitle = isPendingPayment ? 'Tu reserva está apartada.' : 'Tu viaje está listo.';

  return `
    <section class="passenger-card card card--pad motion-enter">
      <div class="confirmation-hero">
        <div class="confirmation-hero__icon">✓</div>
        <div>
          <div class="badge badge--${statusBadge}">${bookingStatus}</div>
          <h2>${statusTitle}</h2>
          <p class="muted-copy">Recibirás los detalles por correo y podrás revisar el estado desde esta misma app.</p>
        </div>
      </div>
      <div class="summary-list">
        <div class="summary-list__item"><span>Reserva</span><strong>${escapeHtml(bookingCode)}</strong></div>
        <div class="summary-list__item"><span>Pago</span><strong>${state.booking?.totalLabel ?? state.selectedTrip?.priceLabel ?? ''}</strong></div>
        <div class="summary-list__item"><span>Asientos</span><strong>${state.selectedSeats.join(', ')}</strong></div>
        <div class="summary-list__item"><span>Estado</span><strong>${bookingStatus}</strong></div>
      </div>
      <div class="confirmation-actions">
        <button class="button button--ghost" id="newSearch">Nueva búsqueda</button>
        <a class="button button--primary" href="/website/">Volver a Encore</a>
      </div>
    </section>
  `;
}

function wireEvents() {
  const searchForm = document.querySelector('#searchForm');
  searchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(searchForm);
    state.search = {
      origin: String(formData.get('origin') ?? ''),
      destination: String(formData.get('destination') ?? ''),
      date: String(formData.get('date') ?? ''),
      passengers: Number(formData.get('passengers') ?? 1)
    };
    state.loading = true;
    state.screen = 'results';
    render();
    const response = await fetchPassengerSearch(state.search);
    state.searchResults = response.trips;
    state.loading = false;
    render();
  });

  document.querySelectorAll('[data-detail-trip]').forEach((button) => {
    button.addEventListener('click', async () => {
      const tripId = button.getAttribute('data-detail-trip');
      const response = await fetchTripDetails(tripId);
      state.selectedTrip = response.trip;
      state.screen = 'seat';
      state.selectedSeats = [];
      render();
    });
  });

  document.querySelectorAll('[data-select-trip]').forEach((button) => {
    button.addEventListener('click', async () => {
      const tripId = button.getAttribute('data-select-trip');
      const response = await fetchTripDetails(tripId);
      state.selectedTrip = response.trip;
      state.selectedSeats = [];
      state.screen = 'seat';
      render();
    });
  });

  document.querySelectorAll('[data-seat]').forEach((button) => {
    button.addEventListener('click', () => {
      const seatId = button.getAttribute('data-seat');
      const alreadySelected = state.selectedSeats.includes(seatId);
      if (alreadySelected) {
        state.selectedSeats = state.selectedSeats.filter((currentSeat) => currentSeat !== seatId);
      } else if (state.selectedSeats.length < state.search.passengers) {
        state.selectedSeats = [...state.selectedSeats, seatId];
      }
      render();
    });
  });

  document.querySelector('#backToResults')?.addEventListener('click', () => {
    state.screen = 'results';
    render();
  });

  document.querySelector('#continueToPassenger')?.addEventListener('click', () => {
    if (state.selectedSeats.length === state.search.passengers) {
      state.screen = 'passenger';
      render();
    }
  });

  const passengerForm = document.querySelector('#passengerForm');
  passengerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(passengerForm);
    state.passenger = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      documentId: String(formData.get('documentId') ?? '')
    };
    state.screen = 'summary';
    render();
  });

  document.querySelector('#backToSeats')?.addEventListener('click', () => {
    state.screen = 'seat';
    render();
  });

  document.querySelector('#backToPassenger')?.addEventListener('click', () => {
    state.screen = 'passenger';
    render();
  });

  document.querySelector('#startPayment')?.addEventListener('click', async () => {
    state.screen = 'payment';
    state.paymentProgress = 'processing';
    render();
    await new Promise((resolve) => setTimeout(resolve, 900));
    state.paymentProgress = 'confirming';
    render();
    const response = await reserveTripSeats(state.selectedTrip.id, state.selectedSeats, state.search.passengers);
    state.booking = response.booking;
    state.paymentProgress = 'done';
    state.screen = 'confirmation';
    render();
  });

  document.querySelector('#newSearch')?.addEventListener('click', () => {
    state.screen = 'search';
    state.searchResults = [];
    state.selectedTrip = null;
    state.selectedSeats = [];
    state.booking = null;
    render();
  });
}

async function initialize() {
  registerServiceWorker();
  render();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  state.screen = 'search';
  render();
}

initialize();
