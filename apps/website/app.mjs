import { fetchAppShell } from '../../packages/shared/api.mjs';
import { formatCurrency, formatTimeLabel } from '../../packages/shared/domain.mjs';

const destinationGrid = document.querySelector('#destinationGrid');
const destinationImages = ['/website/public/yendo-destino-1.jpg', '/website/public/yendo-destino-2.jpg', '/website/public/yendo-destino-3.jpg'];

function destinationCard(route, trip, index) {
  const image = destinationImages[index % destinationImages.length];
  return `
    <article class="card card--pad destination-card motion-enter">
      <img class="destination-card__image" src="${image}" alt="Destino de referencia" />
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
        <span>${trip.remainingSeats ?? 0} seats left</span>
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
}

initialize().catch(() => {
  destinationGrid.innerHTML = '';
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