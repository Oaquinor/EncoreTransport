import { fetchRoutes, fetchPassengerSearch, fetchTripSeats, fetchMapJourney, health } from '../../packages/shared/api.mjs';

const destinationGrid = document.querySelector('#destinationGrid');
const bookingForm = document.querySelector('#bookingForm') ?? document.querySelector('.booking-card');
const seatPreview = document.querySelector('#seatPreview');
const featuredTrip = document.querySelector('#featuredTrip') ?? document.querySelector('.floating-trip-card');

let activeTrip = null;
let activeJourney = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}

function routeCode(value = '') {
  return String(value).split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 3).toUpperCase() || 'ET';
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value ?? '');
}

function setSearchState(message) {
  setText('#searchMessage', message);
}

function setMinimumDate() {
  const input = bookingForm?.querySelector('input[type="date"]');
  if (!input) return;
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  input.min = local;
}

async function loadHealth() {
  try {
    await health();
    setText('#apiStatus', 'Online');
  } catch {
    setText('#apiStatus', 'Offline');
  }
}

async function loadRoutes() {
  if (!destinationGrid) return [];
  destinationGrid.innerHTML = '<article class="destination-card is-visible"><div class="destination-body"><small>Loading</small><h3>Consulting available routes…</h3></div></article>';

  try {
    const routes = await fetchRoutes();
    setText('#routeCount', routes.length);
    setText('#routesState', routes.length ? 'Available routes loaded from Laravel/MySQL.' : 'No active routes are configured.');

    if (!routes.length) {
      destinationGrid.innerHTML = '<article class="destination-card is-visible"><div class="destination-body"><small>Availability</small><h3>No active routes</h3><p>Operations must configure routes before they can be booked.</p></div></article>';
      return routes;
    }

    destinationGrid.innerHTML = routes.slice(0, 8).map((route) => {
      const origin = escapeHtml(route.origin ?? '');
      const destination = escapeHtml(route.destination ?? '');
      const href = `/passenger/?origin=${encodeURIComponent(route.origin ?? '')}&destination=${encodeURIComponent(route.destination ?? '')}&passengers=1`;
      return `<a class="destination-card is-visible" href="${href}"><div class="destination-visual"><span class="destination-code">${routeCode(route.destination)}</span></div><div class="destination-body"><small>From ${origin}</small><h3>${destination}</h3><p>Route available in Encore Transport</p><div class="destination-meta"><span>${route.distance_km ? `${Number(route.distance_km).toLocaleString('en-US')} km` : 'Schedule online'}</span><strong>View trips →</strong></div></div></a>`;
    }).join('');

    return routes;
  } catch (error) {
    setText('#routeCount', '—');
    setText('#routesState', 'Unable to load routes.');
    destinationGrid.innerHTML = `<article class="destination-card is-visible"><div class="destination-body"><small>Connection error</small><h3>Routes could not be loaded.</h3><p>${escapeHtml(error.message)}</p><button class="btn btn-secondary" id="retryRoutes" type="button">Retry</button></div></article>`;
    document.querySelector('#retryRoutes')?.addEventListener('click', loadRoutes, { once: true });
    return [];
  }
}

function renderFeaturedTrip(trip) {
  if (!featuredTrip || !trip) return;
  featuredTrip.removeAttribute('hidden');
  featuredTrip.innerHTML = `
    <div class="trip-status"><i></i>${escapeHtml(String(trip.status ?? 'scheduled').replaceAll('_', ' '))}</div>
    <div class="trip-points">
      <div><small>FROM</small><strong>${escapeHtml(trip.origin)}</strong><span>${escapeHtml((trip.departureTime ?? '').slice(0, 5))}</span></div>
      <div class="trip-track"><i></i><b></b><span>${escapeHtml(trip.busCode ?? `BUS ${trip.busId ?? ''}`)}</span><b></b><i></i></div>
      <div class="align-right"><small>TO</small><strong>${escapeHtml(trip.destination)}</strong><span>${escapeHtml((trip.arrivalTime ?? '').slice(0, 5))}</span></div>
    </div>
    <div class="trip-card-meta"><span>${Number(trip.availableSeats ?? 0)} seats</span><span>${Number(trip.durationMinutes ?? 0)} min</span><span>${money(trip.baseFare)}</span></div>`;
}

function renderSeatPreview(seats) {
  if (!seatPreview) return;
  if (!Array.isArray(seats) || !seats.length) {
    seatPreview.innerHTML = '<p>No seat map is available for the selected trip.</p>';
    setText('#seatState', 'No seat map is configured for this vehicle.');
    return;
  }

  const rows = new Map();
  for (const seat of seats) {
    const row = Number.parseInt(String(seat.seat_number), 10) || 0;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(seat);
  }

  seatPreview.innerHTML = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([row, rowSeats]) => {
    const sorted = rowSeats.sort((a, b) => String(a.seat_number).localeCompare(String(b.seat_number), undefined, { numeric: true }));
    const left = sorted.slice(0, 2);
    const right = sorted.slice(2, 4);
    const button = (seat) => `<button class="seat ${seat.available ? '' : 'reserved'}" disabled aria-label="Seat ${escapeHtml(seat.seat_number)} ${seat.available ? 'available' : 'unavailable'}">${escapeHtml(seat.seat_number)}</button>`;
    return `<div class="seat-row"><em>${row}</em>${left.map(button).join('')}<span class="aisle"></span>${right.map(button).join('')}</div>`;
  }).join('');

  const available = seats.filter((seat) => seat.available).length;
  setText('#seatState', `${available} seats are currently available on the featured trip.`);
}

function svgPath(points) {
  if (!Array.isArray(points) || points.length < 2) return '';
  const lats = points.map((p) => Number(p.latitude));
  const lons = points.map((p) => Number(p.longitude));
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons); const maxLon = Math.max(...lons);
  const latRange = Math.max(0.000001, maxLat - minLat);
  const lonRange = Math.max(0.000001, maxLon - minLon);

  return points.map((point, index) => {
    const x = 70 + ((Number(point.longitude) - minLon) / lonRange) * 860;
    const y = 550 - ((Number(point.latitude) - minLat) / latRange) * 480;
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function renderJourney(journey) {
  activeJourney = journey;
  const route = journey?.route;
  const path = svgPath(route?.points ?? []);
  document.querySelector('#routePath')?.setAttribute('d', path);
  document.querySelector('#modalRoutePath')?.setAttribute('d', path);
  setText('#mapOrigin', activeTrip?.origin ?? journey?.origin?.name ?? 'Origin');
  setText('#mapDestination', activeTrip?.destination ?? journey?.destination?.name ?? 'Destination');
  setText('#mapStatus', path ? 'Route calculated' : 'Route geometry unavailable');
  setText('#mapEta', route?.durationSeconds ? `${Math.round(route.durationSeconds / 60)} min` : '—');
  setText('#routeDistance', route?.distanceMeters ? `${(route.distanceMeters / 1000).toFixed(1)} km` : '—');
  setText('#routeDuration', route?.durationSeconds ? `${Math.round(route.durationSeconds / 60)} min` : '—');
  setText('#routeTitle', activeTrip ? `${activeTrip.origin} → ${activeTrip.destination}` : 'Encore route');

  const link = document.querySelector('#bookRouteLink');
  if (link && activeTrip) {
    link.href = `/passenger/?origin=${encodeURIComponent(activeTrip.origin)}&destination=${encodeURIComponent(activeTrip.destination)}&date=${encodeURIComponent(activeTrip.date ?? '')}&passengers=1`;
  }
}

async function calculateActiveJourney() {
  if (!activeTrip) {
    setText('#mapStatus', 'No trip available');
    return;
  }
  setText('#mapStatus', 'Calculating route…');
  try {
    renderJourney(await fetchMapJourney(activeTrip.origin, activeTrip.destination));
  } catch (error) {
    activeJourney = null;
    document.querySelector('#routePath')?.setAttribute('d', '');
    document.querySelector('#modalRoutePath')?.setAttribute('d', '');
    setText('#mapStatus', 'Route unavailable');
    setText('#mapEta', '—');
    setText('#routeDistance', '—');
    setText('#routeDuration', '—');
    console.error(error);
  }
}

async function loadTripContext() {
  try {
    const result = await fetchPassengerSearch({ passengers: 1 });
    setText('#tripCount', result.total);
    activeTrip = result.trips[0] ?? null;

    if (!activeTrip) {
      featuredTrip?.setAttribute('hidden', '');
      setText('#seatState', 'There are no bookable trips at this time.');
      setText('#mapStatus', 'No trip available');
      return;
    }

    renderFeaturedTrip(activeTrip);
    renderSeatPreview(await fetchTripSeats(activeTrip.id));
    await calculateActiveJourney();
  } catch (error) {
    setText('#tripCount', '—');
    setText('#seatState', `Trip context unavailable: ${error.message}`);
    setText('#mapStatus', 'Unavailable');
  }
}

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(bookingForm);
  const origin = String(form.get('origin') ?? '').trim();
  const destination = String(form.get('destination') ?? '').trim();
  const date = String(form.get('date') ?? '').trim();
  const passengers = Math.max(1, Number(form.get('passengers') ?? 1) || 1);

  if (!origin || !destination) {
    setSearchState('Origin and destination are required.');
    return;
  }

  if (origin.localeCompare(destination, undefined, { sensitivity: 'accent' }) === 0) {
    setSearchState('Origin and destination must be different.');
    return;
  }

  const params = new URLSearchParams({ origin, destination, passengers: String(passengers) });
  if (date) params.set('date', date);
  window.location.href = `/passenger/?${params}`;
});

const swap = document.querySelector('.swap');
swap?.addEventListener('click', () => {
  const inputs = swap.closest('form')?.querySelectorAll('input[name="origin"],input[name="destination"]');
  if (!inputs || inputs.length < 2) return;
  [inputs[0].value, inputs[1].value] = [inputs[1].value, inputs[0].value];
});

const modal = document.querySelector('#routeModal');
const openModal = async () => {
  modal?.classList.add('is-open');
  modal?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (activeTrip && !activeJourney) await calculateActiveJourney();
};
const closeModal = () => {
  modal?.classList.remove('is-open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};
document.querySelectorAll('[data-open-map]').forEach((element) => element.addEventListener('click', openModal));
document.querySelectorAll('[data-close-map]').forEach((element) => element.addEventListener('click', closeModal));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }
}, { threshold: 0.12 });
document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));

setMinimumDate();
await Promise.allSettled([loadHealth(), loadRoutes(), loadTripContext()]);
