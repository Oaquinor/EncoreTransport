import { mockRoutes, mockTrips } from '../../packages/shared/mock-data.mjs';
import { formatCurrency, formatTimeLabel } from '../../packages/shared/domain.mjs';

const destinationGrid = document.querySelector('#destinationGrid');

function destinationCard(route, trip) {
  return `
    <article class="card card--pad destination-card motion-enter">
      <img class="destination-card__image" src="/assets/media/Autobus.png" alt="Autobús de Encore Transport" />
      <div class="destination-card__top">
        <span class="badge badge--neutral">${trip.departureTime} · ${formatTimeLabel(trip.departureTime)}</span>
        <span class="destination-card__pill">${route.durationMinutes} min</span>
      </div>
      <h3>${route.origin} → ${route.destination}</h3>
      <p>${trip.highlights.join(' · ')}</p>
      <div class="destination-card__footer">
        <strong>${formatCurrency(trip.baseFare)}</strong>
        <a class="button button--ghost button--ghost-light" href="/passenger/?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}">Reservar</a>
      </div>
    </article>
  `;
}

destinationGrid.innerHTML = mockRoutes
  .map((route) => destinationCard(route, mockTrips.find((trip) => trip.routeId === route.id) ?? mockTrips[0]))
  .join('');

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