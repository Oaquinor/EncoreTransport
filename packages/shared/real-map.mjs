const leafletVersion = '1.9.4';
const leafletCss = `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.css`;
const leafletJs = `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.js`;

let leafletPromise = null;
const mapRegistry = new WeakMap();

function ensureSharedStyles() {
  if (document.querySelector('style[data-encore-map-styles]')) return;

  const style = document.createElement('style');
  style.dataset.encoreMapStyles = 'true';
  style.textContent = `
    .encore-real-map{position:relative;min-height:320px;width:100%;height:100%;background:#dcebf2}
    .encore-real-map .leaflet-container{width:100%;height:100%;min-height:inherit;font:inherit}
    .encore-map-marker{display:grid;place-items:center;width:34px;height:34px;border-radius:50% 50% 50% 0;background:#1e3140;color:#fff;border:3px solid #fff;box-shadow:0 6px 18px rgba(15,34,50,.28);transform:rotate(-45deg)}
    .encore-map-marker span{font-size:13px;font-weight:900;transform:rotate(45deg)}
    .encore-map-marker--destination{background:#1f9d74}
    .encore-map-marker--vehicle{background:#2da9df;border-radius:50%;transform:none}
    .encore-map-marker--vehicle span{transform:none}
    .encore-map-fallback{min-height:260px;display:grid;place-items:center;padding:24px;text-align:center;background:linear-gradient(145deg,#dbeef5,#f4f9fb);color:#536c7c}
    .encore-map-fallback strong{display:block;color:#102130;margin-bottom:6px}
    .encore-map-attribution-note{font-size:11px;color:#667b89}
  `;
  document.head.appendChild(style);
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    ensureSharedStyles();

    if (!document.querySelector(`link[href="${leafletCss}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = leafletCss;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${leafletJs}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load the map renderer.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = leafletJs;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => resolve(window.L), { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load the map renderer.')), { once: true });
    document.head.appendChild(script);
  });

  return leafletPromise;
}

function markerIcon(L, kind, label) {
  return L.divIcon({
    className: '',
    html: `<div class="encore-map-marker encore-map-marker--${kind}"><span>${label}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 31],
  });
}

function validCoordinate(point) {
  return point &&
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude));
}

function normalizePoints(points) {
  return (Array.isArray(points) ? points : [])
    .filter(validCoordinate)
    .map((point) => [Number(point.latitude), Number(point.longitude)]);
}

export function destroyRealMap(container) {
  if (!container) return;
  const existing = mapRegistry.get(container);
  if (existing) {
    existing.remove();
    mapRegistry.delete(container);
  }
  container.innerHTML = '';
}

export async function renderJourneyMap(container, journey, options = {}) {
  if (!container) return null;

  destroyRealMap(container);
  container.classList.add('encore-real-map');

  const points = normalizePoints(journey?.route?.points);
  const origin = journey?.origin;
  const destination = journey?.destination;

  if (!validCoordinate(origin) || !validCoordinate(destination)) {
    container.innerHTML = `
      <div class="encore-map-fallback">
        <div>
          <strong>Route map unavailable</strong>
          <span>Origin or destination coordinates are missing.</span>
        </div>
      </div>`;
    return null;
  }

  let L;
  try {
    L = await loadLeaflet();
  } catch (error) {
    container.innerHTML = `
      <div class="encore-map-fallback">
        <div>
          <strong>Map renderer unavailable</strong>
          <span>${String(error?.message ?? error)}</span>
        </div>
      </div>`;
    throw error;
  }

  const map = L.map(container, {
    zoomControl: options.zoomControl !== false,
    attributionControl: true,
  });

  mapRegistry.set(container, map);

  L.tileLayer('/api/v1/maps/tiles/{z}/{x}/{y}.png?style=street-light', {
    minZoom: 0,
    maxZoom: 22,
    tileSize: 256,
    attribution: '&copy; TomTom',
  }).addTo(map);

  const originLatLng = [Number(origin.latitude), Number(origin.longitude)];
  const destinationLatLng = [Number(destination.latitude), Number(destination.longitude)];

  L.marker(originLatLng, {
    icon: markerIcon(L, 'origin', 'A'),
    title: origin.name || 'Origin',
  }).addTo(map);

  L.marker(destinationLatLng, {
    icon: markerIcon(L, 'destination', 'B'),
    title: destination.name || 'Destination',
  }).addTo(map);

  let routeLayer = null;
  if (points.length >= 2) {
    routeLayer = L.polyline(points, {
      color: '#1f9d74',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
  }

  const driverLocation = options.driverLocation;
  if (validCoordinate(driverLocation)) {
    L.marker(
      [Number(driverLocation.latitude), Number(driverLocation.longitude)],
      {
        icon: markerIcon(L, 'vehicle', '●'),
        title: 'Current vehicle position',
      },
    ).addTo(map);
  }

  const bounds = routeLayer?.getBounds?.();
  if (bounds?.isValid?.()) {
    map.fitBounds(bounds.pad(0.12), { animate: false });
  } else {
    map.fitBounds(L.latLngBounds([originLatLng, destinationLatLng]).pad(0.2), { animate: false });
  }

  requestAnimationFrame(() => map.invalidateSize());

  return map;
}

export async function renderJourneyMapWithLoader(container, loadJourney, options = {}) {
  if (!container) return null;

  container.innerHTML = `
    <div class="encore-map-fallback">
      <div>
        <strong>Loading route map…</strong>
        <span>Preparing current route information.</span>
      </div>
    </div>`;

  try {
    const journey = await loadJourney();
    return await renderJourneyMap(container, journey, options);
  } catch (error) {
    container.innerHTML = `
      <div class="encore-map-fallback">
        <div>
          <strong>Route map unavailable</strong>
          <span>${String(error?.message ?? 'Unable to load map data.')}</span>
        </div>
      </div>`;
    return null;
  }
}
