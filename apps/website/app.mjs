import {
  fetchRoutes,
  fetchPassengerSearch,
  fetchTripSeats,
  mapJourney,
  health,
} from '../../packages/shared/api.mjs';
import { renderJourneyMap, destroyRealMap } from '../../packages/shared/real-map.mjs';

const destinationGrid = document.querySelector('#destinationGrid');
const bookingForm = document.querySelector('#bookingForm');
const seatPreview = document.querySelector('#seatPreview');
const routeMapCanvas = document.querySelector('#routeMapCanvas');
const modalMapCanvas = document.querySelector('#modalMapCanvas');

let featuredTrip = null;
let featuredJourney = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[character]));
}

function routeCode(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'ET';
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = String(value ?? '');
}

function minutes(seconds) {
  return Math.max(1, Math.round(Number(seconds || 0) / 60));
}

function km(meters) {
  return `${(Number(meters || 0) / 1000).toFixed(1)} km`;
}

function renderFeatured(trip) {
  const card = document.querySelector('#featuredTrip');
  if (!card) return;

  if (!trip) {
    card.innerHTML = '<div class="trip-status"><i></i>No scheduled departures are currently available.</div>';
    return;
  }

  card.innerHTML = `
    <div class="trip-status"><i></i>${esc(String(trip.status ?? 'scheduled').replaceAll('_', ' '))}</div>
    <div class="trip-points">
      <div>
        <small>FROM</small>
        <strong>${esc(trip.origin)}</strong>
        <span>${esc((trip.departureTime ?? '').slice(0, 5))}</span>
      </div>
      <div class="trip-track">
        <i></i><b></b>
        <span>${esc(trip.busCode ?? 'Vehicle assigned')}</span>
        <b></b><i></i>
      </div>
      <div class="align-right">
        <small>TO</small>
        <strong>${esc(trip.destination)}</strong>
        <span>${esc((trip.arrivalTime ?? '').slice(0, 5))}</span>
      </div>
    </div>
    <div class="trip-card-meta">
      <span>${Number(trip.availableSeats ?? 0)} seats</span>
      <span>${Number(trip.durationMinutes ?? 0)} min</span>
      <span>DOP ${Number(trip.baseFare ?? 0).toLocaleString('en-US')}</span>
    </div>`;
}

function renderSeats(seats) {
  if (!seatPreview) return;

  if (!Array.isArray(seats) || seats.length === 0) {
    seatPreview.innerHTML = '<p class="muted-copy">No seat layout is configured for this vehicle.</p>';
    setText('#seatState', 'No seat layout is configured for this vehicle.');
    return;
  }

  const rows = new Map();

  for (const seat of seats) {
    const parsed = Number.parseInt(String(seat.seat_number), 10);
    const row = Number(seat.row_number ?? (Number.isFinite(parsed) ? parsed : 0));
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(seat);
  }

  seatPreview.innerHTML = [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([row, rowSeats]) => {
      const maxPosition = Math.max(
        1,
        ...rowSeats.map((seat) => Number(seat.position_index ?? 0)),
      );
      const byPosition = new Map(
        rowSeats.map((seat) => [Number(seat.position_index ?? 0), seat]),
      );

      const cells = [];
      for (let position = 1; position <= maxPosition; position += 1) {
        const seat = byPosition.get(position);

        if (!seat) {
          cells.push('<span class="aisle" aria-hidden="true"></span>');
          continue;
        }

        const stateClass = seat.blocked
          ? 'seat--blocked'
          : seat.available
            ? ''
            : 'reserved';
        const accessibleClass = seat.accessible ? 'seat--accessible' : '';

        cells.push(`
          <button
            class="seat ${stateClass} ${accessibleClass}"
            disabled
            aria-label="Seat ${esc(seat.seat_number)} ${seat.blocked ? 'blocked' : seat.available ? 'available' : 'occupied'}${seat.accessible ? ', accessible' : ''}">
            ${esc(seat.seat_number)}
          </button>`);
      }

      return `
        <div class="seat-row" style="--seat-columns:${maxPosition}">
          <em>${row || ''}</em>
          ${cells.join('')}
        </div>`;
    })
    .join('');

  const available = seats.filter((seat) => seat.available && !seat.blocked).length;
  const accessible = seats.filter((seat) => seat.accessible).length;

  setText(
    '#seatState',
    `${available} seats available${accessible ? ` · ${accessible} accessible` : ''}.`,
  );
}

async function loadRoutes() {
  setText('#routesState', 'Loading current routes…');

  try {
    const routes = await fetchRoutes();

    setText('#routeCount', routes.length);
    setText('#serviceStatus', 'Online');

    if (!routes.length) {
      destinationGrid.innerHTML = `
        <article class="destination-card">
          <div class="destination-body">
            <small>Availability</small>
            <h3>No active routes are currently available.</h3>
          </div>
        </article>`;
      setText('#routesState', 'No active routes are currently available.');
      return;
    }

    destinationGrid.innerHTML = routes.slice(0, 8).map((route) => `
      <a
        class="destination-card"
        href="/passenger/?origin=${encodeURIComponent(route.origin ?? '')}&destination=${encodeURIComponent(route.destination ?? '')}&passengers=1">
        <div class="destination-visual">
          <span class="destination-code">${routeCode(route.destination)}</span>
        </div>
        <div class="destination-body">
          <small>From ${esc(route.origin ?? '')}</small>
          <h3>${esc(route.destination ?? '')}</h3>
          <p>View current departures and seat availability.</p>
          <div class="destination-meta">
            <span>${route.distance_km ? `${Number(route.distance_km).toLocaleString('en-US')} km` : 'Distance pending'}</span>
            <strong>View trips →</strong>
          </div>
        </div>
      </a>`).join('');

    setText('#routesState', `${routes.length} active route${routes.length === 1 ? '' : 's'}.`);
  } catch (error) {
    setText('#routeCount', '—');
    setText('#serviceStatus', 'Unavailable');
    setText('#routesState', 'Unable to load routes.');

    destinationGrid.innerHTML = `
      <article class="destination-card">
        <div class="destination-body">
          <small>Connection issue</small>
          <h3>Routes could not be loaded.</h3>
          <p>${esc(error.message)}</p>
          <button class="btn btn-secondary" id="retryRoutes" type="button">Retry</button>
        </div>
      </article>`;

    document.querySelector('#retryRoutes')?.addEventListener('click', loadRoutes, { once: true });
  }
}

async function loadFeaturedTrip() {
  try {
    const result = await fetchPassengerSearch({ passengers: 1 });
    featuredTrip = result.trips[0] ?? null;
    setText('#tripCount', result.total);
    renderFeatured(featuredTrip);

    if (!featuredTrip) {
      setText('#mapStatus', 'No trip available');
      renderSeats([]);
      return;
    }

    const [seats, journey] = await Promise.all([
      fetchTripSeats(featuredTrip.id),
      mapJourney(featuredTrip.origin, featuredTrip.destination),
    ]);

    renderSeats(seats);
    featuredJourney = journey;

    setText('#mapStatus', 'Route loaded');
    setText('#mapEta', journey.route?.durationSeconds ? `${minutes(journey.route.durationSeconds)} min` : '—');
    setText('#routeDistance', journey.route?.distanceMeters ? km(journey.route.distanceMeters) : '—');
    setText('#routeDuration', journey.route?.durationSeconds ? `${minutes(journey.route.durationSeconds)} min` : '—');
    setText('#routeTitle', `${featuredTrip.origin} → ${featuredTrip.destination}`);

    const link = document.querySelector('#bookRouteLink');
    if (link) {
      link.href = `/passenger/?origin=${encodeURIComponent(featuredTrip.origin)}&destination=${encodeURIComponent(featuredTrip.destination)}&date=${encodeURIComponent(featuredTrip.date ?? '')}&passengers=1`;
    }

    await renderJourneyMap(routeMapCanvas, featuredJourney);
  } catch (error) {
    featuredJourney = null;
    setText('#tripCount', '—');
    setText('#mapStatus', 'Route unavailable');
    setText('#mapEta', '—');

    if (routeMapCanvas) {
      routeMapCanvas.innerHTML = `
        <div class="encore-map-fallback">
          <div>
            <strong>Route map unavailable</strong>
            <span>${esc(error.message)}</span>
          </div>
        </div>`;
    }
  }
}

function setMinimumDate() {
  const input = bookingForm?.querySelector('input[type="date"]');
  if (!input) return;

  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  input.min = localDate;
}

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const form = new FormData(bookingForm);
  const origin = String(form.get('origin') ?? '').trim();
  const destination = String(form.get('destination') ?? '').trim();
  const date = String(form.get('date') ?? '').trim();
  const passengers = Math.max(1, Number(form.get('passengers') ?? 1) || 1);

  if (!origin || !destination) {
    setText('#searchMessage', 'Origin and destination are required.');
    return;
  }

  if (origin.localeCompare(destination, undefined, { sensitivity: 'accent' }) === 0) {
    setText('#searchMessage', 'Origin and destination must be different.');
    return;
  }

  const params = new URLSearchParams({
    origin,
    destination,
    passengers: String(passengers),
  });

  if (date) params.set('date', date);

  location.href = `/passenger/?${params}`;
});

document.querySelector('.swap')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const form = button.closest('form');
  const origin = form?.querySelector('input[name="origin"]');
  const destination = form?.querySelector('input[name="destination"]');

  if (!origin || !destination) return;

  [origin.value, destination.value] = [destination.value, origin.value];
});

const modal = document.querySelector('#routeModal');

async function openModal() {
  modal?.classList.add('is-open');
  modal?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (featuredJourney && modalMapCanvas) {
    await renderJourneyMap(modalMapCanvas, featuredJourney);
  }
}

function closeModal() {
  modal?.classList.remove('is-open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (modalMapCanvas) destroyRealMap(modalMapCanvas);
}

document.querySelectorAll('[data-open-map]').forEach((element) => {
  element.addEventListener('click', openModal);
});

document.querySelectorAll('[data-close-map]').forEach((element) => {
  element.addEventListener('click', closeModal);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }
}, { threshold: 0.12 });

document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));

setMinimumDate();

try {
  await health();
  setText('#serviceStatus', 'Online');
} catch {
  setText('#serviceStatus', 'Unavailable');
}

await Promise.allSettled([
  loadRoutes(),
  loadFeaturedTrip(),
]);
