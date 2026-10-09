import { appConfig } from './app-config.mjs';

const leafletVersion = '1.9.4';

const leafletSources = [
  {
    css: '/node_modules/leaflet/dist/leaflet.css',
    js: '/node_modules/leaflet/dist/leaflet.js',
    label: 'local Leaflet package',
  },
  {
    css: `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.css`,
    js: `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.js`,
    label: 'Leaflet CDN fallback',
  },
];

let leafletPromise = null;
let tileProbePromise = null;
let tileProbeTimestamp = 0;
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
    .encore-map-runtime-status{position:absolute;z-index:900;left:12px;right:12px;bottom:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.95);border:1px solid #d7e3e9;color:#536c7c;font-size:12px;box-shadow:0 8px 22px rgba(20,55,75,.14)}
    .encore-map-runtime-status strong{display:block;color:#102130}
  `;
  document.head.appendChild(style);
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[data-encore-leaflet-css="${CSS.escape(href)}"]`);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      }
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.encoreLeafletCss = href;
    link.addEventListener('load', () => {
      link.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    link.addEventListener('error', () => {
      link.remove();
      reject(new Error(`Unable to load Leaflet stylesheet from ${href}.`));
    }, { once: true });
    document.head.appendChild(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existing = document.querySelector(`script[data-encore-leaflet-js="${CSS.escape(src)}"]`);

    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.encoreLeafletJs = src;

    script.addEventListener('load', () => {
      if (!window.L) {
        reject(new Error('Leaflet loaded but did not expose the expected browser API.'));
        return;
      }

      resolve(window.L);
    }, { once: true });

    script.addEventListener('error', () => {
      script.remove();
      reject(new Error(`Unable to load Leaflet from ${src}.`));
    }, { once: true });

    document.head.appendChild(script);
  });
}

async function loadLeafletSource(source) {
  await Promise.all([
    loadStylesheet(source.css),
    loadScript(source.js),
  ]);

  if (!window.L) {
    throw new Error(`${source.label} did not initialize correctly.`);
  }

  return window.L;
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  ensureSharedStyles();

  leafletPromise = (async () => {
    const failures = [];

    for (const source of leafletSources) {
      try {
        return await loadLeafletSource(source);
      } catch (error) {
        failures.push(String(error?.message ?? error));
      }
    }

    leafletPromise = null;

    throw new Error(
      `Unable to load the map renderer. ${failures.join(' ')}`
    );
  })();

  return leafletPromise;
}

async function probeTileProxy({ force = false } = {}) {
  const now = Date.now();

  if (!force && tileProbePromise && now - tileProbeTimestamp < 60000) {
    return tileProbePromise;
  }

  tileProbeTimestamp = now;

  tileProbePromise = (async () => {
    let response;

    try {
      response = await fetch(
        `${appConfig.apiBaseUrl}/maps/tiles/0/0/0.png?style=street-light`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'image/png,application/json;q=0.9,*/*;q=0.8',
          },
        },
      );
    } catch (error) {
      throw new Error(
        `Unable to reach the Encore map tile proxy. ${String(error?.message ?? '')}`.trim()
      );
    }

    if (!response.ok) {
      let payload = null;

      try {
        payload = await response.clone().json();
      } catch {
        payload = null;
      }

      const message =
        payload?.message ??
        `Map tile proxy failed (${response.status}).`;

      const code = payload?.code ? ` [${payload.code}]` : '';

      throw new Error(`${message}${code}`);
    }

    const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();

    if (contentType && !contentType.startsWith('image/')) {
      throw new Error('The Encore map tile proxy returned a non-image response.');
    }

    return true;
  })().catch((error) => {
    tileProbePromise = null;
    throw error;
  });

  return tileProbePromise;
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
    Number.isFinite(Number(point.longitude)) &&
    Number(point.latitude) >= -90 &&
    Number(point.latitude) <= 90 &&
    Number(point.longitude) >= -180 &&
    Number(point.longitude) <= 180;
}

function normalizePoints(points) {
  return (Array.isArray(points) ? points : [])
    .filter(validCoordinate)
    .map((point) => [Number(point.latitude), Number(point.longitude)]);
}

function runtimeStatus(container, title, detail) {
  let box = container.querySelector('.encore-map-runtime-status');

  if (!box) {
    box = document.createElement('div');
    box.className = 'encore-map-runtime-status';
    container.appendChild(box);
  }

  box.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
}

function clearRuntimeStatus(container) {
  container.querySelector('.encore-map-runtime-status')?.remove();
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
          <span>Origin or destination coordinates are missing or invalid.</span>
        </div>
      </div>`;

    return null;
  }

  try {
    await probeTileProxy();
  } catch (error) {
    container.innerHTML = `
      <div class="encore-map-fallback">
        <div>
          <strong>Map tiles unavailable</strong>
          <span>${String(error?.message ?? error)}</span>
        </div>
      </div>`;

    throw error;
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

  const tileLayer = L.tileLayer(
    `${appConfig.apiBaseUrl}/maps/tiles/{z}/{x}/{y}.png?style=street-light`,
    {
      minZoom: 0,
      maxZoom: 22,
      tileSize: 256,
      attribution: '&copy; TomTom',
    }
  );

  let tileFailures = 0;

  tileLayer.on('tileerror', () => {
    tileFailures += 1;

    if (tileFailures === 1) {
      runtimeStatus(
        container,
        'Some map tiles failed to load.',
        'The route data is available, but the map tile service stopped responding. Check the Encore map proxy and TomTom Map Display access.'
      );
    }
  });

  tileLayer.on('load', () => {
    tileFailures = 0;
    clearRuntimeStatus(container);
  });

  tileLayer.addTo(map);

  const originLatLng = [
    Number(origin.latitude),
    Number(origin.longitude),
  ];

  const destinationLatLng = [
    Number(destination.latitude),
    Number(destination.longitude),
  ];

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
      [
        Number(driverLocation.latitude),
        Number(driverLocation.longitude),
      ],
      {
        icon: markerIcon(L, 'vehicle', '●'),
        title: 'Current vehicle position',
      },
    ).addTo(map);
  }

  const bounds = routeLayer?.getBounds?.();

  if (bounds?.isValid?.()) {
    map.fitBounds(bounds.pad(0.12), {
      animate: false,
    });
  } else {
    map.fitBounds(
      L.latLngBounds([
        originLatLng,
        destinationLatLng,
      ]).pad(0.2),
      {
        animate: false,
      }
    );
  }

  requestAnimationFrame(() => {
    map.invalidateSize();
  });

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

export async function verifyMapRuntime({ force = true } = {}) {
  await probeTileProxy({ force });
  await loadLeaflet();

  return {
    tileProxy: true,
    leaflet: true,
  };
}
