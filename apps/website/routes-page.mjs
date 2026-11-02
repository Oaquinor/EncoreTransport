import { fetchRoutes } from '../../../packages/shared/api.mjs';

const locale = new URLSearchParams(window.location.search).get('lang') === 'es' ? 'es' : 'en';
const isSpanish = locale === 'es';
const copy = (english, spanish) => isSpanish ? spanish : english;
const grid = document.querySelector('#routesPageGrid');
const state = document.querySelector('#routesPageState');
const preview = document.querySelector('#routePreview');
const previewState = document.querySelector('#routePreviewState');
const terminalList = document.querySelector('#terminalsList');
const terminalCount = document.querySelector('#terminalCount');
const routeCount = document.querySelector('#routeCount');
const filter = document.querySelector('#routeFilter');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
const routeOrigin = (route) => route.origin ?? route.segments?.[0]?.origin ?? '';
const routeDestination = (route) => route.destination ?? route.segments?.at(-1)?.destination ?? '';
const terminalNames = (routes) => [...new Set(routes.flatMap((route) => [routeOrigin(route), routeDestination(route), ...(route.stops ?? []).map((stop) => stop.name)]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

let publishedRoutes = [];

function renderPreview(routes) {
  if (!preview) return;
  const visible = routes.slice(0, 4);
  if (!visible.length) {
    preview.innerHTML = `<div class="route-preview__empty">${copy('No published routes to display.', 'No hay rutas publicadas para mostrar.')}</div>`;
    if (previewState) previewState.textContent = copy('Waiting for published data', 'Esperando datos publicados');
    return;
  }
  preview.innerHTML = visible.map((route, index) => {
    const origin = routeOrigin(route);
    const destination = routeDestination(route);
    return `<div class="route-preview__lane"><span class="route-preview__index">${String(index + 1).padStart(2, '0')}</span><span class="route-preview__node">${escapeHtml(origin)}</span><i aria-hidden="true"></i><span class="route-preview__node route-preview__node--end">${escapeHtml(destination)}</span></div>`;
  }).join('');
  if (previewState) previewState.textContent = copy('Static view of published routes', 'Vista estática de rutas publicadas');
}

function renderDirectory() {
  const query = filter?.value.trim().toLocaleLowerCase() ?? '';
  const routes = publishedRoutes.filter((route) => `${routeOrigin(route)} ${routeDestination(route)} ${(route.stops ?? []).map((stop) => stop.name).join(' ')}`.toLocaleLowerCase().includes(query));
  if (state) state.textContent = routes.length
    ? copy(`${routes.length} route${routes.length === 1 ? '' : 's'} shown.`, `${routes.length} ruta${routes.length === 1 ? '' : 's'} mostrada${routes.length === 1 ? '' : 's'}.`)
    : copy('No routes match that search.', 'Ninguna ruta coincide con esa búsqueda.');
  if (!grid) return;
  grid.innerHTML = routes.length ? routes.map((route) => {
    const origin = routeOrigin(route);
    const destination = routeDestination(route);
    const segments = (route.segments ?? []).filter((segment) => segment.active !== false);
    const queryParams = new URLSearchParams({ origin, destination, passengers: '1' });
    return `<article class="route-directory-card"><div class="route-directory-card__top"><span class="site-kicker">${copy('Published route', 'Ruta publicada')}</span><span>${route.distance_km ? `${escapeHtml(route.distance_km)} km` : copy('Distance pending', 'Distancia pendiente')}</span></div><h3>${escapeHtml(origin)} <span aria-hidden="true">→</span> ${escapeHtml(destination)}</h3><p>${segments.length ? copy(`${segments.length} segment${segments.length === 1 ? '' : 's'} to review.`, `${segments.length} tramo${segments.length === 1 ? '' : 's'} para consultar.`) : copy('Review departures available for this route.', 'Consulta las salidas disponibles para este recorrido.')}</p><a class="btn btn-secondary" href="/website/trips/?${queryParams}">${copy('Find departures', 'Buscar salidas')} <span aria-hidden="true">→</span></a></article>`;
  }).join('') : `<div class="routes-empty"><strong>${copy('No routes match your search.', 'No hay rutas que coincidan con tu búsqueda.')}</strong><span>${copy('Try another origin or destination.', 'Prueba con otro origen o destino.')}</span></div>`;
}

function renderTerminals(routes) {
  const terminals = terminalNames(routes);
  if (terminalCount) terminalCount.textContent = terminals.length;
  if (!terminalList) return;
  terminalList.innerHTML = terminals.length
    ? terminals.map((terminal) => `<li><strong>${escapeHtml(terminal)}</strong><span>${copy('Published departure or arrival point', 'Punto de salida o llegada publicado')}</span></li>`).join('')
    : `<li><span>${copy('No terminals are available to display.', 'No hay terminales disponibles para mostrar.')}</span></li>`;
}

filter?.addEventListener('input', renderDirectory);

try {
  publishedRoutes = await fetchRoutes();
  if (routeCount) routeCount.textContent = publishedRoutes.length;
  renderPreview(publishedRoutes);
  renderDirectory();
  renderTerminals(publishedRoutes);
} catch {
  if (routeCount) routeCount.textContent = '—';
  if (state) state.textContent = copy('Route information is temporarily unavailable.', 'La información de rutas no está disponible temporalmente.');
  if (preview) preview.innerHTML = `<div class="route-preview__empty">${copy('We could not load the published network.', 'No pudimos cargar la red publicada.')}</div>`;
  if (previewState) previewState.textContent = copy('Update pending', 'Actualización pendiente');
  if (grid) grid.innerHTML = `<div class="routes-empty"><strong>${copy('We could not load routes.', 'No pudimos cargar las rutas.')}</strong><span>${copy('Please try again in a few minutes.', 'Intenta de nuevo en unos minutos.')}</span></div>`;
  renderTerminals([]);
}
