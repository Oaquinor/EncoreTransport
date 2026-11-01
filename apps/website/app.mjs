import {
  fetchRoutes,
  fetchPassengerSearch,
  fetchLiveNetwork,
  health,
  requestJson,
} from '../../packages/shared/api.mjs';
import { renderLiveNetworkMap } from '../../packages/shared/real-map.mjs';
import { formatMoney } from '../../packages/shared/formatters.mjs';
import { icon } from '../../packages/shared/icons.mjs';

const destinationGrid = document.querySelector('#destinationGrid');
const bookingForm = document.querySelector('#bookingForm');
const seatPreview = document.querySelector('#seatPreview');
const routeMapCanvas = document.querySelector('#routeMapCanvas');
const mobileMenuToggle = document.querySelector('#mobileMenuToggle');
const mobileNavigation = document.querySelector('#mobileNavigation');
const recentSearches = document.querySelector('#recentSearches');
const RECENT_SEARCHES_KEY = 'encore_recent_searches_v1';

let featuredTrip = null;
let revealObserver = null;
let publishedSegments = [];

function readRecentSearches() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.origin && item?.destination).slice(0, 5) : [];
  } catch { return []; }
}

function renderRecentSearches() {
  if (!recentSearches) return;
  const items = readRecentSearches();
  recentSearches.hidden = !items.length;
  recentSearches.innerHTML = items.length
    ? `<span class="recent-searches__label">Recent searches</span>${items.map((item) => `<button type="button" data-recent-search="${esc(JSON.stringify(item))}">${esc(item.origin)} → ${esc(item.destination)}${item.date ? ` · ${esc(item.date)}` : ''}</button>`).join('')}`
    : '';
}

function rememberSearch(item) {
  const next = [item, ...readRecentSearches().filter((saved) => `${saved.origin}|${saved.destination}|${saved.date ?? ''}` !== `${item.origin}|${item.destination}|${item.date ?? ''}`)].slice(0, 5);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  renderRecentSearches();
}

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

function routeImageMarkup(value, fallback = 'ET') {
  const image = publicAssetUrl(value);
  if (!image || (!image.startsWith('/') && !/^https:\/\//i.test(image))) return '';
  return `<img src="${esc(image)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="destination-code" aria-hidden="true" hidden>${esc(fallback)}</span>`;
}

function publicAssetUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim();
  if (/^(storage\/)?(avatars|profiles|users|drivers|website-media|routes)\//i.test(candidate)) {
    return `/storage/${candidate.replace(/^\/?storage\//i, '')}`;
  }
  try {
    const parsed = new URL(candidate, location.origin);
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return candidate.startsWith('/') ? candidate : '';
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = String(value ?? '');
}

function populateSegmentSelectors(routes) {
  const segments = routes.flatMap((route) => (Array.isArray(route.segments) ? route.segments : [])
    .filter((segment) => segment.active !== false)
    .map((segment) => ({
      origin: String(segment.origin ?? '').trim(),
      destination: String(segment.destination ?? '').trim(),
      routeId: route.id,
    }))
    .filter((segment) => segment.origin && segment.destination));
  publishedSegments = [...new Map(segments.map((segment) => [
    `${segment.origin}::${segment.destination}`,
    segment,
  ])).values()];

  const originSelect = bookingForm?.querySelector('[name="origin"]');
  const destinationSelect = bookingForm?.querySelector('[name="destination"]');
  if (!originSelect || !destinationSelect) return;

  const origins = [...new Set(publishedSegments.map((segment) => segment.origin))].sort();
  const renderOptions = (values, label) => [
    `<option value="">${label}</option>`,
    ...values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`),
  ].join('');
  originSelect.innerHTML = renderOptions(origins, 'Elige el punto de salida');
  const destinations = [...new Set(publishedSegments.map((segment) => segment.destination))].sort();
  destinationSelect.innerHTML = renderOptions(destinations, 'Elige el destino');
  originSelect.disabled = origins.length === 0;
  destinationSelect.disabled = destinations.length === 0;

  const query = new URLSearchParams(window.location.search);
  const requestedOrigin = query.get('origin') ?? '';
  const requestedDestination = query.get('destination') ?? '';
  if (requestedOrigin && origins.includes(requestedOrigin)) {
    originSelect.value = requestedOrigin;
    filterDestinationSelector(requestedOrigin);
    if (requestedDestination) destinationSelect.value = requestedDestination;
  }
  const date = bookingForm?.querySelector('[name="date"]');
  const passengers = bookingForm?.querySelector('[name="passengers"]');
  if (date && query.get('date')) date.value = query.get('date');
  if (passengers && query.get('passengers')) passengers.value = query.get('passengers');
}

function filterDestinationSelector(origin) {
  const destinationSelect = bookingForm?.querySelector('[name="destination"]');
  if (!destinationSelect) return;
  const destinations = [...new Set(publishedSegments
    .filter((segment) => !origin || segment.origin === origin)
    .map((segment) => segment.destination))].sort();
  const selected = destinationSelect.value;
  destinationSelect.innerHTML = [
    '<option value="">Elige el destino</option>',
    ...destinations.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`),
  ].join('');
  if (destinations.includes(selected)) destinationSelect.value = selected;
  destinationSelect.disabled = destinations.length === 0;
}

function renderMapFallback(message = 'El mapa de la ruta no está disponible por el momento. Intenta de nuevo.') {
  if (!routeMapCanvas) return;
  routeMapCanvas.innerHTML = `
    <div class="encore-map-fallback">
      <div>
        <strong>Vista de ruta no disponible</strong>
        <span>${esc(message)}</span>
      </div>
    </div>`;
}

function initializeBusinessFooter() {
  setText('#copyrightYear', new Date().getFullYear());
  const config = globalThis.__ENCORE_CONFIG__ ?? {};

  let visibleSocials = 0;
  document.querySelectorAll('[data-social]').forEach((link) => {
    const network = link.dataset.social;
    const url = config.socialLinks?.[network];
    if (typeof url === 'string' && /^https:\/\//.test(url)) {
      link.href = url;
      link.removeAttribute('aria-disabled');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      visibleSocials += 1;
    } else {
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('title', 'Official account coming soon');
    }
  });
  const socialBlock = document.querySelector('.public-footer__social-block, .public-footer__community');
  if (socialBlock) socialBlock.classList.toggle('is-configured', visibleSocials > 0);
  document.querySelector('.public-footer__details')?.classList.toggle('has-socials', visibleSocials > 0);
}

async function applyPublishedWebsiteContent() {
  try {
    const payload = await requestJson('/website-content');
    const data = payload.data ?? {};
    if (!data || !Object.keys(data).length) return;
    const selectors = {
      hero: { section: '#home', title: '.public-hero__copy h1, .hero-copy h1', description: '.public-hero__copy > p, .hero-copy > p' },
      tracking: { section: '#package-tracking', title: '#parcelTitle', subtitle: '.parcel-feature__copy p', button: '#package-tracking > a' },
      routes: { section: '#destinations', title: '#routesTitle', subtitle: '#destinations .public-section-head > div > p' },
      faq: { section: '#faq', title: '#faqTitle', subtitle: '.public-faq-copy > p' },
      about: { section: '#about', title: '#aboutTitle', subtitle: '#about .public-section-copy > p' },
      contact: { section: '#contact', title: '#contactTitle', subtitle: '#contact .public-section-copy > p', button: '#contact .public-contact-card a' },
      final_cta: { section: '.public-final-cta', title: '.public-final-cta h2', subtitle: '.public-final-cta p', button: '.public-final-cta a' },
    };
    const legacyCopy = {
      tracking: { title: 'Tu encomienda, fácil de seguir.', description: 'Escribe tu referencia para consultar la última actualización de tu envío.', button_label: 'Rastrear mi paquete' },
      contact: { title: '¿Necesitas ayuda para planificar?', description: 'Encuentra la opción correcta para reservar, rastrear un envío o resolver una duda.', button_label: 'Visitar ayuda' },
      final_cta: { title: 'Encuentra tu próximo viaje.', description: 'Busca una salida disponible y continúa cuando encuentres la opción que te conviene.', button_label: 'Buscar viajes', button_url: '/passenger/' },
    };
    for (const [key, values] of Object.entries(data.sections ?? {})) {
      const target = selectors[key];
      if (!target) continue;
      const section = document.querySelector(target.section);
      if (!section) continue;
      if (values.enabled === false) { section.hidden = true; continue; }
      section.hidden = false;
      for (const [field, selector] of [['title',target.title],['description',target.description],['subtitle',target.subtitle]]) {
        if (values[field] && selector && values[field] !== legacyCopy[key]?.[field]) setText(selector, values[field]);
      }
      if (values.button_label && target.button && values.button_label !== legacyCopy[key]?.button_label) setText(`${target.button}`, values.button_label);
      if (values.button_url && target.button && values.button_url !== legacyCopy[key]?.button_url) {
        const link = document.querySelector(target.button);
        if (link && ((values.button_url.startsWith('/') && !values.button_url.startsWith('//')) || values.button_url.startsWith('#') || /^https:\/\//i.test(values.button_url))) link.href = values.button_url;
      }
      if (values.image_url) {
        const imageTarget = key === 'hero' ? document.querySelector('.public-hero__visual, .hero-visual') : section;
        const imageUrl = publicAssetUrl(values.image_url);
        if (imageTarget && imageUrl) {
          imageTarget.style.setProperty('--cms-section-image', `url(${JSON.stringify(imageUrl)})`);
          imageTarget.classList.add('cms-section-image');
        }
      }
    }
    const orderedCmsSections = Object.entries(data.sections ?? {})
      .filter(([key]) => selectors[key])
      .sort((a, b) => Number(a[1].order ?? 0) - Number(b[1].order ?? 0))
      .map(([key]) => document.querySelector(selectors[key].section)).filter(Boolean);
    if (orderedCmsSections.length > 1) {
      const parent = orderedCmsSections[0].parentElement;
      const positions = orderedCmsSections.map((node) => [...parent.children].indexOf(node)).sort((a, b) => a - b);
      positions.forEach((position, index) => {
        const anchor = parent.children[position];
        if (anchor && anchor !== orderedCmsSections[index]) parent.insertBefore(orderedCmsSections[index], anchor);
      });
    }
    if (Array.isArray(data.faqs)) {
      const list = document.querySelector('.public-faq-list');
      if (list) list.innerHTML = data.faqs.filter((faq) => faq.enabled !== false).map((faq) => `<details data-reveal><summary>${esc(faq.question)}</summary><p>${esc(faq.answer)}</p></details>`).join('');
      observeDynamicReveal(list);
    }
  } catch {}
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
  if (!mobileMenuToggle || !mobileNavigation || document.querySelector('[data-site-navigation]')) return;

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
    card.innerHTML = '<div class="trip-status"><i></i>No hay salidas disponibles en este momento.</div>';
    return;
  }

  card.innerHTML = `
    <div class="trip-status"><i></i>${esc({ scheduled: 'Salida programada', boarding: 'Abordaje', in_progress: 'En recorrido', completed: 'Finalizado' }[trip.status] ?? 'Salida disponible')}</div>
    <div class="trip-points">
      <div>
        <small>FROM</small>
        <strong>${esc(trip.origin)}</strong>
        <span>${esc((trip.departureTime ?? '').slice(0, 5))}</span>
      </div>

      <div class="trip-track">
        <i></i><b></b>
        <span>${esc(trip.busCode ?? 'Vehículo asignado')}</span>
        <b></b><i></i>
      </div>

      <div class="align-right">
        <small>TO</small>
        <strong>${esc(trip.destination)}</strong>
        <span>${esc((trip.arrivalTime ?? '').slice(0, 5))}</span>
      </div>
    </div>

    <div class="trip-card-meta">
      <span>${Number(trip.availableSeats ?? 0)} asientos</span>
      <span>${Number(trip.durationMinutes ?? 0)} min</span>
      <span>${formatMoney(trip.baseFare)}</span>
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
        <strong>Illustrative coach layout</strong>
        <span>This preview is not the assigned vehicle. Choose a departure to see its actual seat plan and live availability.</span>
      </div>`;

    setText('#seatState', 'La disponibilidad se muestra para la salida seleccionada.');
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

    setText('#seatState', `${seats.length} asientos disponibles. La distribución puede variar según el vehículo.`);
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
    `${available} asientos disponibles${accessible ? ` · ${accessible} accesibles` : ''}.`,
  );
}

async function loadRoutes() {
  setText('#routesState', 'Cargando rutas disponibles…');

  try {
    const routes = await fetchRoutes();
    populateSegmentSelectors(routes);

    setText('#routeCount', routes.length);
    setText('#serviceStatus', 'Servicio disponible');

    if (!routes.length) {
      if (destinationGrid) destinationGrid.innerHTML = `
        <article class="destination-card">
          <div class="destination-body">
            <small>Disponibilidad</small>
            <h3>No hay rutas disponibles en este momento.</h3>
          </div>
        </article>`;

      setText('#routesState', 'No hay rutas disponibles en este momento.');
      return;
    }

    if (!destinationGrid) return;
    destinationGrid.innerHTML = routes.slice(0, 8).map((route) => `
      <a
        class="destination-card"
        data-reveal
        href="/passenger/?origin=${encodeURIComponent(route.origin ?? '')}&destination=${encodeURIComponent(route.destination ?? '')}&passengers=1">
        <div class="destination-visual">
          ${routeImageMarkup(route.image_url, routeCode(route.destination)) || `<span class="destination-code" aria-hidden="true">${routeCode(route.destination)}</span>`}
        </div>

        <div class="destination-body">
          <small>Salida desde ${esc(route.origin ?? '')}</small>
          <h3>${esc(route.destination ?? '')}</h3>
          <p>Consulta salidas y asientos disponibles.</p>

          <div class="destination-meta">
            <span>${route.distance_km ? `${Number(route.distance_km).toLocaleString('es-DO')} km` : 'Distancia por confirmar'}</span>
            <strong>Ver salidas →</strong>
          </div>
        </div>
      </a>`).join('');

    observeDynamicReveal(destinationGrid);
    setText('#routesState', `${routes.length} ruta${routes.length === 1 ? '' : 's'} disponible${routes.length === 1 ? '' : 's'}.`);
  } catch (error) {
    setText('#routeCount', '—');
    setText('#serviceStatus', 'Información temporalmente no disponible');
    setText('#routesState', 'No pudimos cargar las rutas.');

    if (destinationGrid) destinationGrid.innerHTML = `
      <article class="destination-card">
        <div class="destination-body">
          <small>Información temporalmente no disponible</small>
          <h3>No pudimos cargar las rutas.</h3>
          <p>Intenta de nuevo en unos minutos.</p>
          <button class="btn btn-secondary btn-with-icon" id="retryRoutes" type="button">${icon('refresh')}Intentar de nuevo</button>
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
      renderFeatured(null);
      renderSeats([]);
      return;
    }

    featuredTrip = trips[0];
    renderFeatured(featuredTrip);
    renderSeats([]);
  } catch (error) {
    featuredTrip = null;
    setText('#tripCount', '—');
    renderFeatured(null);
    renderSeats([]);
  }
}

let liveNetworkTimer = null;
let liveNetworkObserver = null;
let liveNetworkStarted = false;
let liveNetworkFailureCount = 0;
let liveNetworkScheduleGeneration = 0;
const LIVE_NETWORK_BASE_DELAY = 25000;
const LIVE_NETWORK_MAX_DELAY = 120000;
let latestNetwork = null;
let selectedNetworkTripId = null;

function updateNetworkRoutes(network) {
  latestNetwork = network;
  const select = document.querySelector('#networkRouteSelect');
  if (!select) return;
  const previous = select.value;
  const routes = Array.isArray(network.routes) ? network.routes : [];
  select.innerHTML = ['<option value="">All routes</option>', ...routes.map((route) =>
    `<option value="${esc(route.id ?? route.route_id ?? '')}">${esc(route.name ?? `${route.origin ?? ''} → ${route.destination ?? ''}`)}</option>`,
  )].join('');
  if ([...select.options].some((option) => option.value === previous)) select.value = previous;
  renderNetworkSelection();
}

function renderNetworkSelection() {
  if (!latestNetwork || !routeMapCanvas) return;
  const routeId = document.querySelector('#networkRouteSelect')?.value;
  const routes = Array.isArray(latestNetwork.routes) ? latestNetwork.routes : [];
  const trips = Array.isArray(latestNetwork.trips) ? latestNetwork.trips : [];
  const selectedRoute = routes.find((route) => String(route.id ?? route.route_id) === String(routeId));
  const filtered = routeId ? {
    ...latestNetwork,
    routes: selectedRoute ? [selectedRoute] : [],
    trips: trips.filter((trip) => String(trip.route_id ?? trip.route?.id) === String(routeId)),
  } : latestNetwork;
  const tripsForList = Array.isArray(filtered.trips) ? filtered.trips : [];
  const liveTrips = tripsForList.filter((trip) => !trip.is_stale && Number.isFinite(Number(trip.latitude)) && Number.isFinite(Number(trip.longitude)));
  if (!tripsForList.some((trip) => String(trip.trip_id) === String(selectedNetworkTripId))) selectedNetworkTripId = null;
  const list = document.querySelector('#networkBusList');
  if (list) {
    list.innerHTML = tripsForList.length ? tripsForList.map((trip) => {
      const isLive = !trip.is_stale && Number.isFinite(Number(trip.latitude)) && Number.isFinite(Number(trip.longitude));
      const timestamp = trip.last_location_at ? new Date(trip.last_location_at).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin señal registrada';
      const selected = String(trip.trip_id) === String(selectedNetworkTripId);
      return `<article class="public-network-bus${selected ? ' is-selected' : ''}" data-network-bus="${esc(trip.trip_id)}"><div class="public-network-bus__identity"><span class="public-network-bus__icon" aria-hidden="true">${icon('route')}</span><div><strong>${esc(trip.bus_code || 'Autobús Encore')}</strong><span>${esc(trip.origin || '')} → ${esc(trip.destination || '')}</span></div></div><div class="public-network-bus__meta"><span class="public-network-bus__status${isLive ? ' is-live' : ' is-stale'}"><i></i>${isLive ? 'Ubicación reciente' : 'Sin señal reciente'}</span><small>${esc(timestamp)}</small></div><button type="button" class="btn-with-icon" data-network-trip="${esc(trip.trip_id)}" aria-pressed="${selected}" ${isLive ? '' : 'disabled'}>${icon(isLive ? 'route' : 'info')}${selected ? 'Visible en el mapa' : isLive ? 'Ver en el mapa' : 'Ubicación no disponible'}</button></article>`;
    }).join('') : '<div class="public-network-empty"><strong>No hay autobuses compartiendo una ubicación reciente.</strong><span>Vuelve a consultar para ver nuevas actualizaciones.</span></div>';
  }
  void renderLiveNetworkMap(routeMapCanvas, filtered, { selectedTripId: selectedNetworkTripId })
    .catch(() => renderMapFallback('El mapa no está disponible por el momento.'));
}

async function refreshLiveNetwork() {
  try {
    const network = await fetchLiveNetwork();
    updateNetworkRoutes(network);
    const trips = Array.isArray(network.trips) ? network.trips : [];
    const tripCount = trips.filter((trip) => !trip.is_stale && Number.isFinite(Number(trip.latitude)) && Number.isFinite(Number(trip.longitude))).length;
    const staleCount = trips.length - tripCount;
    const routeCount = Array.isArray(network.routes) ? network.routes.length : 0;
    setText('#mapStatus', `${tripCount} ${tripCount === 1 ? 'autobús' : 'autobuses'} en movimiento${staleCount ? ` · ${staleCount} sin señal reciente` : ''}`);
    const latestLocation = trips.map((trip) => trip.last_location_at).filter(Boolean).sort().at(-1);
    setText('#mapEta', latestLocation ? new Date(latestLocation).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : 'Sin señal reciente');
    setText('#routeCount', routeCount || '—');
    liveNetworkFailureCount = 0;
    return true;
  } catch {
    liveNetworkFailureCount = Math.min(liveNetworkFailureCount + 1, 3);
    setText('#mapStatus', 'La vista no está disponible');
    setText('#mapEta', 'Actualización pendiente');
    const list = document.querySelector('#networkBusList');
    if (list) list.innerHTML = `<div class="public-network-empty"><strong>No pudimos actualizar las ubicaciones.</strong><span>La vista se actualizará cuando vuelva la conexión.</span><button type="button" class="btn-with-icon" data-network-retry>${icon('refresh')}Intentar de nuevo</button></div>`;
    if (routeMapCanvas) {
      void renderLiveNetworkMap(routeMapCanvas, { routes: [], trips: [] })
        .catch(() => renderMapFallback('Live vehicle positions are temporarily unavailable.'));
    }
    return false;
  }
}

function scheduleLiveNetworkRefresh(delay = null) {
  if (liveNetworkTimer) window.clearTimeout(liveNetworkTimer);
  liveNetworkTimer = null;
  if (document.visibilityState !== 'visible') return;

  const backoffDelay = Math.min(
    LIVE_NETWORK_MAX_DELAY,
    LIVE_NETWORK_BASE_DELAY * (2 ** liveNetworkFailureCount),
  );
  const wait = delay == null ? backoffDelay : delay;
  const generation = ++liveNetworkScheduleGeneration;
  liveNetworkTimer = window.setTimeout(async () => {
    if (generation !== liveNetworkScheduleGeneration) return;
    await refreshLiveNetwork();
    scheduleLiveNetworkRefresh();
  }, wait);
}

function startLiveNetwork() {
  if (liveNetworkStarted) return;
  liveNetworkStarted = true;
  void refreshLiveNetwork().finally(() => scheduleLiveNetworkRefresh(LIVE_NETWORK_BASE_DELAY));
  const rescheduleForVisibility = () => {
    if (document.visibilityState === 'visible') scheduleLiveNetworkRefresh(0);
    else if (liveNetworkTimer) {
      window.clearTimeout(liveNetworkTimer);
      liveNetworkTimer = null;
      liveNetworkScheduleGeneration += 1;
    }
  };
  document.addEventListener('visibilitychange', rescheduleForVisibility, { passive: true });
  window.addEventListener('online', () => scheduleLiveNetworkRefresh(0), { passive: true });
  window.addEventListener('pagehide', () => {
    if (liveNetworkTimer) window.clearTimeout(liveNetworkTimer);
    liveNetworkTimer = null;
    liveNetworkScheduleGeneration += 1;
    liveNetworkObserver?.disconnect();
  }, { once: true, passive: true });
}

function initializeLiveNetwork() {
  if (!routeMapCanvas) return;
  if ('IntersectionObserver' in window) {
    liveNetworkObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      startLiveNetwork();
    }, { rootMargin: '240px' });
    liveNetworkObserver.observe(routeMapCanvas);
  } else {
    window.setTimeout(startLiveNetwork, 800);
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
  if (!input.value || input.value < localDate) input.value = localDate;
}

async function initializePublicSession() {
  const account = document.querySelector('#publicAccountAction');
  const myTrips = document.querySelector('#publicMyTrips');
  const mobileAccount = document.querySelector('#publicMobileAccount');
  const mobileTrips = document.querySelector('#publicMobileMyTrips');
  const token = sessionStorage.getItem('encore_api_token');
  if (!account || !myTrips) return;
  const setSignedOut = () => {
    myTrips.hidden = true;
    mobileTrips?.setAttribute('hidden', '');
    mobileAccount?.removeAttribute('hidden');
    account.href = '/login/?return=/passenger/';
    account.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg><span>Iniciar sesión</span>';
  };
  if (!token) { setSignedOut(); return; }
  const applyUser = (user) => {
    if (!user) throw new Error('session');
    const name = String(user.name || user.email || 'My account').trim();
    const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const avatar = user.avatar_url ? `<img class="public-account-avatar" src="${esc(publicAssetUrl(user.avatar_url))}" alt="" />` : `<span class="public-account-initials" aria-hidden="true">${esc(initials)}</span>`;
    account.href = '/passenger/?screen=account&tab=profile';
    account.innerHTML = `${avatar}<span>${esc(name)}</span>`;
    myTrips.href = '/passenger/?screen=account&tab=tickets';
    myTrips.hidden = false;
    mobileTrips?.removeAttribute('hidden');
    mobileAccount?.setAttribute('hidden', '');
  };
  try {
    const cached = JSON.parse(sessionStorage.getItem('encore_auth_user') || 'null');
    if (cached) applyUser(cached);
  } catch {}
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error('session');
    const payload = await response.json();
    const user = payload.user ?? payload.data?.user;
    applyUser(user);
    sessionStorage.setItem('encore_auth_user', JSON.stringify(user));
  } catch {
    sessionStorage.removeItem('encore_api_token');
    sessionStorage.removeItem('encore_auth_user');
    setSignedOut();
  }
}

document.querySelector('#networkRouteSelect')?.addEventListener('change', renderNetworkSelection);
document.querySelector('#networkBusList')?.addEventListener('click', (event) => {
  if (event.target.closest('[data-network-retry]')) {
    void refreshLiveNetwork();
    return;
  }
  const button = event.target.closest('[data-network-trip]');
  if (!button || button.disabled) return;
  selectedNetworkTripId = button.dataset.networkTrip;
  renderNetworkSelection();
});

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const form = new FormData(bookingForm);
  const origin = String(form.get('origin') ?? '').trim();
  const destination = String(form.get('destination') ?? '').trim();
  const date = String(form.get('date') ?? '').trim();
  const passengers = Math.max(1, Number(form.get('passengers') ?? 1) || 1);
  const submit = bookingForm.querySelector('button[type="submit"]');

  if (!origin || !destination) {
    setText('#searchMessage', 'Elige origen y destino para continuar.');
    return;
  }

  if (!publishedSegments.some((segment) => segment.origin === origin && segment.destination === destination)) {
    setText('#searchMessage', 'Elige una ruta disponible para continuar.');
    return;
  }

  if (origin.localeCompare(destination, undefined, { sensitivity: 'accent' }) === 0) {
    setText('#searchMessage', 'El origen y el destino deben ser diferentes.');
    return;
  }

  if (submit) {
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.lastChild.textContent = 'Abriendo salidas…';
  }
  rememberSearch({ origin, destination, date, passengers });

  const params = new URLSearchParams({
    origin,
    destination,
    passengers: String(passengers),
  });

  if (date) params.set('date', date);

  location.href = `/passenger/?${params.toString()}`;
});

bookingForm?.querySelector('[name="origin"]')?.addEventListener('change', (event) => {
  filterDestinationSelector(event.target.value);
});

document.querySelector('.swap')?.addEventListener('click', (event) => {
  const form = event.currentTarget.closest('form');
  const origin = form?.querySelector('[name="origin"]');
  const destination = form?.querySelector('[name="destination"]');

  if (!origin || !destination) return;

  [origin.value, destination.value] = [destination.value, origin.value];
  filterDestinationSelector(origin.value);
});

recentSearches?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-recent-search]');
  if (!button || !bookingForm) return;
  try {
    const saved = JSON.parse(button.dataset.recentSearch);
    const origin = bookingForm.querySelector('[name="origin"]');
    const destination = bookingForm.querySelector('[name="destination"]');
    const date = bookingForm.querySelector('[name="date"]');
    const passengers = bookingForm.querySelector('[name="passengers"]');
    if (origin) origin.value = saved.origin;
    filterDestinationSelector(saved.origin);
    if (destination) destination.value = saved.destination;
    if (date && saved.date) date.value = saved.date;
    if (passengers && saved.passengers) passengers.value = saved.passengers;
    setText('#searchMessage', 'Búsqueda recuperada. Revisa los datos y encuentra tu salida.');
  } catch {}
});

initializeMotion();
initializeMobileNavigation();
renderRecentSearches();
setMinimumDate();
initializeBusinessFooter();
void initializePublicSession();
initializeLiveNetwork();
void applyPublishedWebsiteContent();
void health().then(() => setText('#serviceStatus', 'Servicio disponible')).catch(() => setText('#serviceStatus', 'Información temporalmente no disponible'));
void Promise.allSettled([loadRoutes(), loadFeaturedTrip()]);
