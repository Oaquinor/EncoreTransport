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
    origin: initialQuery.get('origin') ?? '',
    destination: initialQuery.get('destination') ?? '',
    date: initialQuery.get('date') ?? defaultDate,
    passengers: Number(initialQuery.get('passengers') ?? 2)
  },
  passenger: {
    name: '',
    email: '',
    phone: '',
    documentId: ''
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

        <nav class="bottom-nav" aria-label="Quick navigation">
          ${bottomNavItem('Search', state.screen === 'search')}
          ${bottomNavItem('Trip', state.screen === 'results' || state.screen === 'seat')}
          ${bottomNavItem('Booking', state.screen === 'passenger' || state.screen === 'summary')}
          ${bottomNavItem('Status', state.screen === 'payment' || state.screen === 'confirmation')}
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
        <strong>Booking progress</strong>
        <span class="badge badge--primary">${percentage}%</span>
      </div>
      ${progressBar(percentage)}
      <div class="stepper__items">
        ${['Start', 'Results', 'Seat', 'Details', 'Summary', 'Payment', 'Success']
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
            <div class="badge badge--info splash-badge">Installable · Mobile first</div>
            <h1 class="splash-title">Find your trip in seconds.</h1>
            <p class="splash-copy">Book with a smooth, clear experience designed for fast, intuitive use.</p>
          </div>
          <img class="splash-hero-image" src="/assets/media/logo.jpeg" alt="Encore Transport in motion" />
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
      <div class="search-chip">Quick visual search</div>
      <h2>Where are you going?</h2>
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
        <button class="button button--primary button--block" type="submit">Search trips</button>
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
    return emptyState('No trips matched those filters.', 'Try a different route, date, or passenger count.', 'Search again');
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
                <small>${trip.availableSeats} seats available</small>
              </div>
              <div class="trip-card__footer">
                <div>${trip.highlights.map((item) => badge(item, 'neutral')).join(' ')}</div>
                <div class="trip-card__actions">
                  <button class="button button--ghost" data-detail-trip="${trip.id}">View trip</button>
                  <button class="button button--primary" data-select-trip="${trip.id}">Select</button>
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
    return emptyState('Select a trip first.', 'Go back to results to choose a departure.', 'Back');
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
          <div class="badge badge--info">Select a seat</div>
          <h2>${state.selectedTrip.origin} → ${state.selectedTrip.destination}</h2>
        </div>
        <strong>${state.selectedSeats.length}/${state.search.passengers}</strong>
      </div>
      <p class="seat-note">Tap the available seats. Occupied or blocked seats are disabled.</p>
      <div class="seat-map">
        <div class="seat-rows">${rows.join('')}</div>
      </div>
      <div class="seat-actions">
        <button class="button button--ghost" id="backToResults">Back</button>
        <button class="button button--primary" id="continueToPassenger" ${state.selectedSeats.length !== state.search.passengers ? 'disabled' : ''}>Continue</button>
      </div>
    </section>
  `;
}

function renderPassengerForm() {
  return `
    <section class="passenger-card card card--pad motion-enter">
      <div class="payment-header">
        <div>
          <div class="badge badge--neutral">Passenger details</div>
          <h2>Complete your information</h2>
        </div>
        <span class="badge badge--success">Secure</span>
      </div>
      <form class="form-grid" id="passengerForm">
        <label><span class="muted-copy">Nombre</span><input class="field" name="name" value="${escapeHtml(state.passenger.name)}" /></label>
        <label><span class="muted-copy">Correo</span><input class="field" type="email" name="email" value="${escapeHtml(state.passenger.email)}" /></label>
        <label><span class="muted-copy">Teléfono</span><input class="field" name="phone" value="${escapeHtml(state.passenger.phone)}" /></label>
        <label><span class="muted-copy">Documento</span><input class="field" name="documentId" value="${escapeHtml(state.passenger.documentId)}" /></label>
        <div class="payment-actions">
          <button class="button button--ghost" type="button" id="backToSeats">Back</button>
          <button class="button button--primary" type="submit">Review summary</button>
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
          <div class="badge badge--primary">Summary</div>
          <h2>Review before payment</h2>
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
        <button class="button button--ghost" id="backToPassenger">Edit details</button>
        <button class="button button--primary" id="startPayment">Process payment</button>
      </div>
    </section>
  `;
}

function renderPayment() {
  const processingState = state.paymentProgress === 'processing' ? 'Processing' : state.paymentProgress === 'confirming' ? 'Confirming' : 'Preparing';
  return `
    <section class="passenger-card card card--pad payment-flow motion-enter">
      <div class="payment-screen">
        <div class="loading-pulse"></div>
        <div class="text-center">
          <div class="badge badge--warning">${processingState}</div>
          <h2>Secure payment</h2>
          <p class="muted-copy">Validating seats, confirming availability, and preparing your receipt.</p>
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
