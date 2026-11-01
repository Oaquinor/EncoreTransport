import { fetchRoutes } from '../../../packages/shared/api.mjs';

const grid = document.querySelector('#routesPageGrid');
const state = document.querySelector('#routesPageState');
const terminalList = document.querySelector('#terminalsList');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));

try {
  const routes = await fetchRoutes();
  state.textContent = routes.length ? `${routes.length} ruta${routes.length === 1 ? '' : 's'} publicada${routes.length === 1 ? '' : 's'}.` : 'No hay rutas publicadas en este momento.';
  const terminals = new Set();
  routes.forEach((route) => {
    if (route.origin) terminals.add(route.origin);
    if (route.destination) terminals.add(route.destination);
    (route.segments ?? []).forEach((segment) => { if (segment.origin) terminals.add(segment.origin); if (segment.destination) terminals.add(segment.destination); });
  });
  terminalList.innerHTML = [...terminals].sort().map((terminal) => `<li><strong>${escapeHtml(terminal)}</strong><span> Punto disponible en los recorridos publicados.</span></li>`).join('') || '<li>No hay terminales disponibles para mostrar.</li>';
  grid.innerHTML = routes.map((route) => {
    const origin = route.origin ?? route.segments?.[0]?.origin ?? '';
    const destination = route.destination ?? route.segments?.at(-1)?.destination ?? '';
    const segments = (route.segments ?? []).filter((segment) => segment.active !== false);
    const query = new URLSearchParams({ origin, destination, passengers: '1' });
    return `<article class="site-card"><span class="site-kicker">Ruta ${escapeHtml(String(route.id ?? ''))}</span><h3>${escapeHtml(origin)} → ${escapeHtml(destination)}</h3><p>${segments.length ? `${segments.length} segmento${segments.length === 1 ? '' : 's'} publicado${segments.length === 1 ? '' : 's'}.` : 'Recorrido publicado para consulta.'}</p><div class="site-meta"><span>${route.distance_km ? `${escapeHtml(route.distance_km)} km` : 'Distancia pendiente'}</span><span>${escapeHtml(String(route.status ?? 'active'))}</span></div><a href="/website/trips/?${query}">Buscar salidas de esta ruta →</a></article>`;
  }).join('') || '<div class="site-empty">No hay recorridos publicados para mostrar.</div>';
} catch {
  state.textContent = 'No pudimos cargar las rutas en este momento.';
  grid.innerHTML = '<div class="site-empty">El servicio de rutas no respondió. Vuelve a intentarlo en unos minutos.</div>';
  terminalList.innerHTML = '<li>Los terminales no están disponibles mientras el servicio está fuera de línea.</li>';
}
