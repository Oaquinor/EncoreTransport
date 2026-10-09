import {
  fetchRoutes,
  fetchPassengerSearch,
  fetchTripSeats,
  mapJourney,
  health,
} from '../../packages/shared/api.mjs';
import {
  renderJourneyMap,
  destroyRealMap,
} from '../../packages/shared/real-map.mjs';

const destinationGrid = document.querySelector('#destinationGrid');
const bookingForm = document.querySelector('#bookingForm');
const seatPreview = document.querySelector('#seatPreview');
const routeMapCanvas = document.querySelector('#routeMapCanvas');
const modalMapCanvas = document.querySelector('#modalMapCanvas');
const modal = document.querySelector('#routeModal');
const mobileMenuToggle = document.querySelector('#mobileMenuToggle');
const mobileNavigation = document.querySelector('#mobileNavigation');

let featuredTrip = null;
let featuredJourney = null;
let revealObserver = null;

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

function initializeMotion() {
  const elements = [...document.querySelectorAll('[data-reveal]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    document.documentElement.classList.add('motion-disabled');
    return;
  }

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.94) {
      element.classList.add('is-visible');
    }
  }

  document.documentElement.classList.add('motion-ready');

  revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -5% 0px',
  });

  elements
    .filter((element) => !element.classList.contains('is-visible'))
    .forEach((element) => revealObserver.observe(element));
}

function observeDynamicReveal(container) {
  if (!container) return;

  const elements = [...container.querySelectorAll('[data-reveal]')];
  if (!elements.length) return;

  if (!revealObserver || !document.documentElement.classList.contains('motion-ready')) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  elements.forEach((element) => revealObserver.observe(element));
}

function closeMobileMenu({ restoreFocus = false } = {}) {
  if (!mobileMenuToggle || !mobileNavigation) return;

  mobileNavigation.hidden = true;
  mobileMenuToggle.setAttribute('aria-expanded', 'false');
  mobileMenuToggle.setAttribute('aria-label', 'Open navigation');
  document.body.classList.remove('mobile-menu-open');

  if (restoreFocus) {
    mobileMenuToggle.focus();
  }
}

function openMobileMenu() {
  if (!mobileMenuToggle || !mobileNavigation) return;

  mobileNavigation.hidden = false;
  mobileMenuToggle.setAttribute('aria-expanded', 'true');
  mobileMenuToggle.setAttribute('aria-label', 'Close navigation');
  document.body.classList.add('mobile-menu-open');

  requestAnimationFrame(() => {
    mobileNavigation.querySelector('a')?.focus();
  });
}

function initializeMobileNavigation() {
  if (!mobileMenuToggle || !mobileNavigation) return;

  mobileMenuToggle.addEventListener('click', () => {
    const expanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  mobileNavigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMobileMenu());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileMenuToggle.getAttribute('aria-expanded') === 'true') {
      closeMobileMenu({ restoreFocus: true });
    }
  });

  const desktopQuery = window.matchMedia('(min-width: 981px)');
  const syncDesktopState = () => {
    if (desktopQuery.matches) closeMobileMenu();
  };

  desktopQuery.addEventListener?.('change', syncDesktopState);
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

function renderSeatButton(seat) {
  const stateClass = seat.blocked
    ? 'seat--blocked'
    : seat.available
      ? ''
      : 'reserved';

  const accessibleClass = seat.accessible ? 'seat--accessible' : '';

  return `
    <button
      class="seat ${stateClass} ${accessibleClass}"
      disabled
      aria-label="Seat ${esc(seat.seat_number)} ${seat.blocked ? 'blocked' : seat.available ? 'available' : 'occupied'}${seat.accessible ? ', accessible' : ''}">
      ${esc(seat.seat_number)}
    </button>`;
}

function renderSeats(seats) {
  if (!seatPreview) return;

  if (!Array.isArray(seats) || seats.length === 0) {
    seatPreview.innerHTML = `
      <div class="seat-preview-empty">
        <strong>No seat layout is configured for this vehicle.</strong>
        <span>The selected trip has no active seats available for preview.</span>
      </div>`;

    setText('#seatState', 'No seat layout is configured for this vehicle.');
    return;
  }

  const structuredSeats = seats.filter((seat) =>
    Number(seat.row_number ?? 0) > 0 &&
    Number(seat.position_index ?? 0) > 0
  );

  if (!structuredSeats.length) {
    seatPreview.innerHTML = `
      <div class="seat-preview-fallback">
        ${[...seats]
          .sort((left, right) => String(left.seat_number).localeCompare(String(right.seat_number), undefined, { numeric: true }))
          .map(renderSeatButton)
          .join('')}
      </div>`;

    setText('#seatState', `${seats.length} seats loaded. Vehicle row positions are not fully configured.`);
    return;
  }

  const rows = new Map();

  for (const seat of structuredSeats) {
    const row = Number(seat.row_number);
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

        cells.push(renderSeatButton(seat));
      }

      return `
        <div class="seat-row" style="--seat-columns:${maxPosition}">
          <em>${row}</em>
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
        data-reveal
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

    observeDynamicReveal(destinationGrid);
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
    const trips = Array.isArray(result.trips) ? result.trips : [];

    setText('#tripCount', result.total ?? trips.length);

    if (!trips.length) {
      featuredTrip = null;
      featuredJourney = null;
      renderFeatured(null);
      renderSeats([]);
      setText('#mapStatus', 'No trip available');
      setText('#mapEta', '—');
      return;
    }

    let selectedTrip = trips[0];
    let selectedSeats = [];

    for (const trip of trips.slice(0, 12)) {
      try {
        const seats = await fetchTripSeats(trip.id);

        if (!selectedSeats.length) {
          selectedTrip = trip;
          selectedSeats = Array.isArray(seats) ? seats : [];
        }

        if (Array.isArray(seats) && seats.length) {
          selectedTrip = trip;
          selectedSeats = seats;
          break;
        }
      } catch {
        // Continue evaluating current server results without fabricating availability.
      }
    }

    featuredTrip = selectedTrip;
    renderFeatured(featuredTrip);
    renderSeats(selectedSeats);

    try {
      featuredJourney = await mapJourney(featuredTrip.origin, featuredTrip.destination);

      setText('#mapStatus', 'Route loaded');
      setText(
        '#mapEta',
        featuredJourney.route?.durationSeconds
          ? `${minutes(featuredJourney.route.durationSeconds)} min`
          : '—',
      );
      setText(
        '#routeDistance',
        featuredJourney.route?.distanceMeters
          ? km(featuredJourney.route.distanceMeters)
          : '—',
      );
      setText(
        '#routeDuration',
        featuredJourney.route?.durationSeconds
          ? `${minutes(featuredJourney.route.durationSeconds)} min`
          : '—',
      );
      setText('#routeTitle', `${featuredTrip.origin} → ${featuredTrip.destination}`);

      const link = document.querySelector('#bookRouteLink');
      if (link) {
        link.href =
          `/passenger/?origin=${encodeURIComponent(featuredTrip.origin)}` +
          `&destination=${encodeURIComponent(featuredTrip.destination)}` +
          `&date=${encodeURIComponent(featuredTrip.date ?? '')}` +
          '&passengers=1';
      }

      await renderJourneyMap(routeMapCanvas, featuredJourney);
    } catch (error) {
      featuredJourney = null;
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
  } catch (error) {
    featuredTrip = null;
    featuredJourney = null;
    setText('#tripCount', '—');
    setText('#mapStatus', 'Unavailable');
    setText('#mapEta', '—');
    renderFeatured(null);
    renderSeats([]);
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

  location.href = `/passenger/?${params.toString()}`;
});

document.querySelector('.swap')?.addEventListener('click', (event) => {
  const form = event.currentTarget.closest('form');
  const origin = form?.querySelector('input[name="origin"]');
  const destination = form?.querySelector('input[name="destination"]');

  if (!origin || !destination) return;

  [origin.value, destination.value] = [destination.value, origin.value];
});

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
  if (event.key === 'Escape' && modal?.classList.contains('is-open')) {
    closeModal();
  }
});

initializeMotion();
initializeMobileNavigation();
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
