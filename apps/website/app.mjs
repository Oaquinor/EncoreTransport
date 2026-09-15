import { fetchAppShell } from '../../packages/shared/api.mjs';
import { formatCurrency, formatTimeLabel } from '../../packages/shared/domain.mjs';

const destinationGrid = document.querySelector('#destinationGrid');
const destinationImages = ['/website/public/yendo-destino-1.jpg', '/website/public/yendo-destino-2.jpg', '/website/public/yendo-destino-3.jpg'];

function destinationCard(route, trip, index) {
  const image = destinationImages[index % destinationImages.length];
  return `
    <article class="card card--pad destination-card motion-enter">
      <img class="destination-card__image" src="${image}" alt="Route destination" />
      <div class="destination-card__overlay">
        <span>${route.origin}</span>
        <strong>${route.destination}</strong>
      </div>
      <div class="destination-card__top">
        <span class="badge badge--neutral">${trip.departureTime} · ${formatTimeLabel(trip.departureTime)}</span>
        <span class="destination-card__pill">${route.durationMinutes} min</span>
      </div>
      <h3>${route.origin} → ${route.destination}</h3>
      <p>${trip.highlights.join(' · ')}</p>
      <div class="destination-card__meta">
        <span>${trip.seatsAvailable ?? trip.remainingSeats ?? 0} seats left</span>
        <span>${trip.serviceClass ?? 'Express'}</span>
      </div>
      <div class="destination-card__divider"></div>
      <div class="destination-card__footer">
        <strong>${formatCurrency(trip.baseFare)}</strong>
        <a class="button button--ghost button--ghost-light" href="/passenger/?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}">Book</a>
      </div>
    </article>
  `;
}

async function initialize() {
  const response = await fetchAppShell();
  destinationGrid.innerHTML = (response.routes ?? [])
    .map((route, index) => destinationCard(route, route.nextTrip ?? { departureTime: '—', highlights: [], baseFare: 0 }, index))
    .join('');
  initializeMotion();
}

initialize().catch(() => {
  destinationGrid.innerHTML = '';
  initializeMotion();
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function initializeMotion() {
  const animatedElements = document.querySelectorAll('.hero-panel, .booking-widget, .product-pill, .impact-band, .section-grid, .trust-band, .destination-card, .service-card, .solution-stage article, .testimonial-card, .story-card, .contact-card');
  animatedElements.forEach((element) => element.classList.add('reveal-on-scroll'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  animatedElements.forEach((element) => observer.observe(element));
  animateCounters();
}

function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  const formatter = new Intl.NumberFormat('en-US');

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        const target = Number(element.getAttribute('data-count') ?? 0);
        const startedAt = performance.now();
        const duration = 1100;

        function frame(now) {
          const progress = Math.min(1, (now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = formatter.format(Math.round(target * eased));
          if (progress < 1) {
            requestAnimationFrame(frame);
          }
        }

        requestAnimationFrame(frame);
        counterObserver.unobserve(element);
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

const pickupMap = document.querySelector('#pickupMap');
const modalMapCanvas = document.querySelector('#modalMapCanvas');
const pickupCoordinates = document.querySelector('#pickupCoordinates');
const pickupName = document.querySelector('#pickupName');
const pickupArea = document.querySelector('#pickupArea');
const usePickupLocation = document.querySelector('#usePickupLocation');
const pickupLocations = [
  { name: 'Agora Mall', area: 'Santo Domingo', lat: 18.4822, lng: -69.9369 },
  { name: 'Blue Mall', area: 'Piantini', lat: 18.4765, lng: -69.9398 },
  { name: 'Sambil', area: 'Santo Domingo', lat: 18.4888, lng: -69.9115 },
  { name: 'Galeria 360', area: 'Santo Domingo', lat: 18.4869, lng: -69.9427 },
  { name: 'Agora Mall North Entrance', area: 'Santo Domingo', lat: 18.4831, lng: -69.9362 }
];
let selectedPickup = { ...pickupLocations[0] };
let mapOffset = { x: 0, y: 0 };
let dragStart = null;

function formatCoordinate(value) {
  return value.toFixed(5);
}

function nearestPickup(lat, lng) {
  return pickupLocations
    .map((location) => ({
      location,
      distance: Math.hypot((location.lat - lat) * 100, (location.lng - lng) * 100)
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.location ?? pickupLocations[0];
}

function renderPickupMap() {
  if (!modalMapCanvas || !pickupCoordinates) return;
  modalMapCanvas.style.setProperty('--map-x', `${mapOffset.x}px`);
  modalMapCanvas.style.setProperty('--map-y', `${mapOffset.y}px`);

  const lat = 18.4822 - mapOffset.y * 0.00008;
  const lng = -69.9369 + mapOffset.x * 0.00008;
  const nearest = nearestPickup(lat, lng);
  selectedPickup = { ...nearest, lat, lng };
  pickupCoordinates.textContent = `${formatCoordinate(lat)}, ${formatCoordinate(lng)} · ${nearest.name}`;
}

function closePickupMap() {
  pickupMap?.classList.remove('is-open');
  pickupMap?.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('[data-open-map]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    pickupMap?.classList.add('is-open');
    pickupMap?.setAttribute('aria-hidden', 'false');
    renderPickupMap();
  });
});

document.querySelectorAll('[data-close-map]').forEach((trigger) => {
  trigger.addEventListener('click', closePickupMap);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePickupMap();
  }
});

modalMapCanvas?.addEventListener('pointerdown', (event) => {
  modalMapCanvas.setPointerCapture(event.pointerId);
  dragStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    mapX: mapOffset.x,
    mapY: mapOffset.y
  };
  modalMapCanvas.classList.add('is-dragging');
});

modalMapCanvas?.addEventListener('pointermove', (event) => {
  if (!dragStart || dragStart.pointerId !== event.pointerId) return;
  mapOffset = {
    x: Math.max(-180, Math.min(180, dragStart.mapX + event.clientX - dragStart.x)),
    y: Math.max(-130, Math.min(130, dragStart.mapY + event.clientY - dragStart.y))
  };
  renderPickupMap();
});

modalMapCanvas?.addEventListener('pointerup', (event) => {
  if (dragStart?.pointerId === event.pointerId) {
    dragStart = null;
    modalMapCanvas.classList.remove('is-dragging');
  }
});

modalMapCanvas?.addEventListener('pointercancel', () => {
  dragStart = null;
  modalMapCanvas.classList.remove('is-dragging');
});

usePickupLocation?.addEventListener('click', () => {
  if (pickupName) pickupName.textContent = selectedPickup.name;
  if (pickupArea) pickupArea.textContent = `${selectedPickup.area} · ${formatCoordinate(selectedPickup.lat)}, ${formatCoordinate(selectedPickup.lng)}`;
  closePickupMap();
});
