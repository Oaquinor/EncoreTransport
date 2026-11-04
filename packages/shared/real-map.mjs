import { appConfig } from './app-config.mjs';

const leafletVersion = '1.9.4';
const mapTileSize = 512;

const tileLayerOptions = {
  minZoom: 0,
  maxZoom: 20,
  maxNativeZoom: 18,
  tileSize: mapTileSize,
  zoomOffset: -1,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 1,
  detectRetina: false,
  attribution: '&copy; TomTom',
};

function tileLayerUrl() {
  return `${appConfig.apiBaseUrl}/maps/tiles/{z}/{x}/{y}.png?style=street-light&tileSize=${mapTileSize}`;
}

const leafletSources = [
  {
    css: '/vendor/leaflet/leaflet.css',
    js: '/vendor/leaflet/leaflet.js',
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
const liveMapRegistry = new WeakMap();
const liveMapRequests = new WeakMap();

function metricNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function ensureMapMetrics(container, kind = 'map') {
  const store = globalThis.__ENCORE_MAP_METRICS__ ??= {
    version: 1,
    maps: {},
  };
  const key = container.id || container.dataset.mapMetricsId || `map-${Object.keys(store.maps).length + 1}`;
  container.dataset.mapMetricsId = key;
  store.maps[key] ??= {
    id: key,
    kind,
    createdAt: Date.now(),
    tiles: { started: 0, loaded: 0, errors: 0, duplicateUrls: 0, bytes: 0 },
    markers: { created: 0, updated: 0, removed: 0, skipped: 0, outOfOrder: 0 },
    interactions: [],
  };
  store.maps[key].kind = kind;
  return store.maps[key];
}

function recordResourceMetrics(metrics) {
  if (!globalThis.performance?.getEntriesByType) return;
  const entries = performance.getEntriesByType('resource').filter((entry) => /\/maps\/tiles\//.test(entry.name));
  const seen = new Set();
  let bytes = 0;
  for (const entry of entries) {
    if (seen.has(entry.name)) metrics.tiles.duplicateUrls += 1;
    seen.add(entry.name);
    bytes += Number(entry.transferSize || entry.encodedBodySize || 0);
  }
  metrics.tiles.resourceRequests = entries.length;
  metrics.tiles.bytes = bytes;
  metrics.tiles.uniqueUrls = seen.size;
  if (performance.memory) {
    metrics.memory = {
      usedJsHeapBytes: performance.memory.usedJSHeapSize,
      totalJsHeapBytes: performance.memory.totalJSHeapSize,
      limitBytes: performance.memory.jsHeapSizeLimit,
    };
  }
}

function installMapMetrics(map, tileLayer, metrics) {
  const started = new Map();
  const interaction = { startedAt: 0, frames: 0, frameId: null };
  const sampleFrame = () => {
    if (!interaction.startedAt) return;
    interaction.frames += 1;
    interaction.frameId = requestAnimationFrame(sampleFrame);
  };

  tileLayer.on('tileloadstart', (event) => {
    const src = event?.tile?.src || '';
    metrics.tiles.started += 1;
    if (src) {
      if (metrics.tiles.urls?.[src]) metrics.tiles.duplicateUrls += 1;
      metrics.tiles.urls ??= {};
      metrics.tiles.urls[src] = (metrics.tiles.urls[src] || 0) + 1;
      started.set(src, metricNow());
    }
    metrics.tiles.firstRequestMs ??= Math.round((metricNow() - metrics.initializedAt) * 100) / 100;
  });
  tileLayer.on('tileload', (event) => {
    metrics.tiles.loaded += 1;
    const src = event?.tile?.src || '';
    const startedAt = started.get(src);
    if (startedAt != null) {
      metrics.tiles.lastTileMs = Math.round((metricNow() - startedAt) * 100) / 100;
      started.delete(src);
    }
    metrics.tiles.firstImageMs ??= Math.round((metricNow() - metrics.initializedAt) * 100) / 100;
  });
  tileLayer.on('tileerror', () => {
    metrics.tiles.errors += 1;
  });
  tileLayer.on('load', () => {
    metrics.tiles.completeMs = Math.round((metricNow() - metrics.initializedAt) * 100) / 100;
    metrics.tiles.completedAt = Date.now();
    recordResourceMetrics(metrics);
  });
  map.on('movestart zoomstart', () => {
    if (interaction.startedAt) return;
    interaction.startedAt = metricNow();
    interaction.frames = 0;
    interaction.frameId = requestAnimationFrame(sampleFrame);
  });
  map.on('moveend zoomend', () => {
    if (!interaction.startedAt) return;
    if (interaction.frameId != null) cancelAnimationFrame(interaction.frameId);
    const durationMs = metricNow() - interaction.startedAt;
    metrics.interactions.push({
      durationMs: Math.round(durationMs * 100) / 100,
      frames: interaction.frames,
      fps: durationMs > 0 ? Math.round((interaction.frames / durationMs) * 1000 * 100) / 100 : null,
    });
    if (metrics.interactions.length > 30) metrics.interactions.shift();
    interaction.startedAt = 0;
    interaction.frameId = null;
  });
}

function markerIconCached(state, L, kind, label) {
  state.iconCache ??= new Map();
  const key = `${kind}:${label}`;
  if (!state.iconCache.has(key)) state.iconCache.set(key, markerIcon(L, kind, label));
  return state.iconCache.get(key);
}

function ensureSharedStyles() {
  if (document.querySelector('style[data-encore-map-styles]')) return;

  const style = document.createElement('style');
  style.dataset.encoreMapStyles = 'true';
  style.textContent = `
    .encore-real-map{position:relative;min-height:320px;width:100%;height:100%;background:
      radial-gradient(circle at 72% 34%,rgba(64,190,220,.22),transparent 19rem),
      linear-gradient(rgba(68,171,197,.12) 1px,transparent 1px),
      linear-gradient(90deg,rgba(68,171,197,.12) 1px,transparent 1px),
      linear-gradient(145deg,#d9edf3,#f5fafb);background-size:auto,42px 42px,42px 42px,auto}
    .encore-real-map .leaflet-container{width:100%;height:100%;min-height:inherit;font:inherit;background:transparent !important}
    .encore-real-map.leaflet-container{width:100%;height:100%;min-height:inherit;font:inherit;background:
      radial-gradient(circle at 72% 34%,rgba(64,190,220,.22),transparent 19rem),
      linear-gradient(rgba(68,171,197,.12) 1px,transparent 1px),
      linear-gradient(90deg,rgba(68,171,197,.12) 1px,transparent 1px),
      linear-gradient(145deg,#d9edf3,#f5fafb) !important;background-size:auto,42px 42px,42px 42px,auto !important}
    .encore-map-marker{display:grid;place-items:center;width:34px;height:34px;border-radius:50% 50% 50% 0;background:#1e3140;color:#fff;border:3px solid #fff;box-shadow:0 6px 18px rgba(15,34,50,.28);transform:rotate(-45deg)}
    .encore-map-marker span{font-size:13px;font-weight:900;transform:rotate(45deg)}
    .encore-map-marker--destination{background:#1f9d74}
    .encore-map-marker--vehicle{background:#2da9df;border-radius:50%;transform:none}
    .encore-map-marker--vehicle-stale{background:#8397a3;border-radius:50%;transform:none;opacity:.82}
    .encore-map-marker--vehicle span{transform:none}
    .encore-map-fallback{box-sizing:border-box;width:100%;height:100%;min-height:inherit;display:grid;place-items:center;padding:24px;text-align:center;background:linear-gradient(145deg,#dbeef5,#f4f9fb);color:#536c7c}
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
  const startedAt = metricNow();

  leafletPromise = (async () => {
    const failures = [];

    for (const source of leafletSources) {
      try {
        const leaflet = await loadLeafletSource(source);
        globalThis.__ENCORE_MAP_RUNTIME_METRICS__ ??= {};
        globalThis.__ENCORE_MAP_RUNTIME_METRICS__.leafletLoadMs = Math.round((metricNow() - startedAt) * 100) / 100;
        globalThis.__ENCORE_MAP_RUNTIME_METRICS__.source = source.label;
        return leaflet;
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
    let timeoutId = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);
      response = await fetch(
        `${appConfig.apiBaseUrl}/maps/tiles/0/0/0.png?style=street-light`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'image/png,application/json;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      timeoutId = null;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
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
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => {
      if (validCoordinate(point)) {
        return [Number(point.latitude), Number(point.longitude)];
      }

      // TomTom GeoJSON coordinates are [longitude, latitude].
      if (Array.isArray(point) && point.length >= 2) {
        const longitude = Number(point[0]);
        const latitude = Number(point[1]);

        if (
          Number.isFinite(latitude) && Number.isFinite(longitude) &&
          latitude >= -90 && latitude <= 90 &&
          longitude >= -180 && longitude <= 180
        ) {
          return [latitude, longitude];
        }
      }

      return null;
    })
    .filter(Boolean);
}

function routePoints(route) {
  const candidates = [
    route?.points,
    route?.coordinates,
    route?.route_geometry,
    route?.route_geometry?.coordinates,
    route?.geometry?.coordinates,
    ...(Array.isArray(route?.legs) ? route.legs.flatMap((leg) => [
      leg?.points,
      leg?.coordinates,
      leg?.geometry?.coordinates,
    ]) : []),
  ];

  for (const candidate of candidates) {
    const points = normalizePoints(candidate);
    if (points.length >= 2) return points;
  }

  return [];
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

function stopLiveMarkerAnimations(state) {
  for (const frame of state?.vehicleAnimations?.values?.() ?? []) {
    cancelAnimationFrame(frame);
  }
  state?.vehicleAnimations?.clear?.();
}

function animateLiveMarker(state, key, marker, from, to, duration = 0) {
  const existingFrame = state.vehicleAnimations.get(key);
  if (existingFrame != null) cancelAnimationFrame(existingFrame);

  const distance = Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
  if (distance < 0.000001 || duration <= 0) {
    marker.setLatLng(to);
    state.vehicleAnimations.delete(key);
    return;
  }

  const startedAt = performance.now();
  state.metrics.animationsStarted = (state.metrics.animationsStarted || 0) + 1;
  const step = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2;
    marker.setLatLng([
      from[0] + (to[0] - from[0]) * eased,
      from[1] + (to[1] - from[1]) * eased,
    ]);
    if (progress < 1 && state.vehicleMarkers.get(key) === marker) {
      state.vehicleAnimations.set(key, requestAnimationFrame(step));
    } else {
      state.vehicleAnimations.delete(key);
    }
  };

  state.vehicleAnimations.set(key, requestAnimationFrame(step));
}

export function destroyRealMap(container) {
  if (!container) return;

  liveMapRequests.set(container, (liveMapRequests.get(container) ?? 0) + 1);

  const existing = mapRegistry.get(container);

  const liveState = liveMapRegistry.get(container);
  stopLiveMarkerAnimations(liveState);
  liveState?.resizeObserver?.disconnect?.();
  if (liveState?.resizeFrame != null) cancelAnimationFrame(liveState.resizeFrame);
  if (liveState?.metrics) liveState.metrics.destroyedAt = Date.now();

  if (existing) {
    existing.remove();
    mapRegistry.delete(container);
  }

  liveMapRegistry.delete(container);

  container.innerHTML = '';
}

export async function renderJourneyMap(container, journey, options = {}) {
  if (!container) return null;

  ensureSharedStyles();
  destroyRealMap(container);
  container.classList.add('encore-real-map');

  const points = routePoints(journey?.route);
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
  const metrics = ensureMapMetrics(container, 'journey');
  metrics.initializedAt = metricNow();
  metrics.leafletLoadMs = globalThis.__ENCORE_MAP_RUNTIME_METRICS__?.leafletLoadMs ?? null;

  const tileLayer = L.tileLayer(
    tileLayerUrl(),
    tileLayerOptions,
  );
  installMapMetrics(map, tileLayer, metrics);

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
    if ((metrics.tiles.loaded ?? 0) > 0) clearRuntimeStatus(container);
    else runtimeStatus(container, 'Map tiles are still unavailable.', 'The route information is ready; the visual map will appear when the map service responds.');
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

  ensureSharedStyles();
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

export async function renderLocationMap(container, location, options = {}) {
  if (!container || !validCoordinate(location)) return null;

  destroyRealMap(container);
  container.classList.add('encore-real-map');
  const L = await loadLeaflet();
  const center = [Number(location.latitude), Number(location.longitude)];
  const map = L.map(container, {
    zoomControl: options.zoomControl !== false,
    attributionControl: true,
  }).setView(center, options.zoom ?? 15);
  mapRegistry.set(container, map);

  const metrics = ensureMapMetrics(container, 'location');
  metrics.initializedAt = metricNow();
  metrics.leafletLoadMs = globalThis.__ENCORE_MAP_RUNTIME_METRICS__?.leafletLoadMs ?? null;
  const tileLayer = L.tileLayer(tileLayerUrl(), tileLayerOptions).addTo(map);
  installMapMetrics(map, tileLayer, metrics);

  L.marker(center, {
    icon: markerIcon(L, 'origin', 'E'),
    title: location.name || 'Encore Transport office',
  }).addTo(map).bindPopup(location.name || 'Encore Transport office').openPopup();

  requestAnimationFrame(() => map.invalidateSize());
  return map;
}

function escapePopup(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  }[character]));
}

export async function renderLiveNetworkMap(container, network, options = {}) {
  if (!container) return null;

  const requestId = (liveMapRequests.get(container) ?? 0) + 1;
  liveMapRequests.set(container, requestId);
  container.classList.add('encore-real-map');
  let state = liveMapRegistry.get(container);
  const L = state?.map ? window.L : await loadLeaflet();

  // A network refresh can overlap while Leaflet is still loading. Recheck the
  // map registry after the await and discard outdated refreshes.
  if (liveMapRequests.get(container) !== requestId) return null;
  state = liveMapRegistry.get(container);

  if (!state?.map) {
    container.innerHTML = '';
    const metrics = ensureMapMetrics(container, 'live');
    metrics.initializedAt = metricNow();
    metrics.leafletLoadMs = globalThis.__ENCORE_MAP_RUNTIME_METRICS__?.leafletLoadMs ?? null;
    const map = L.map(container, {
      zoomControl: options.zoomControl !== false,
      attributionControl: true,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    }).setView([6.8013, -58.1551], 8);
    const tileLayer = L.tileLayer(tileLayerUrl(), tileLayerOptions).addTo(map);
    installMapMetrics(map, tileLayer, metrics);
    tileLayer.on('tileerror', () => runtimeStatus(
      container,
      'Map tiles unavailable.',
      options.mode === 'static'
        ? 'Published route information remains available while the map service recovers.'
        : 'Live vehicle data will continue updating when the map service recovers.',
    ));
    tileLayer.on('load', () => {
      if ((metrics.tiles.loaded ?? 0) > 0) clearRuntimeStatus(container);
      else runtimeStatus(
        container,
        'Map tiles are still unavailable.',
        options.mode === 'static'
          ? 'Published route information is ready; the visual map will appear when the map service responds.'
          : 'Live vehicle data will continue updating when the map service recovers.',
      );
    });
    state = {
      map,
      vehicleMarkers: new Map(),
      nodeMarkers: new Map(),
      vehiclePositions: new Map(),
      vehicleAnimations: new Map(),
      vehicleSamples: new Map(),
      iconCache: new Map(),
      metrics,
      hasInitialFit: false,
      lastRouteViewKey: null,
      lastSelectedTripId: null,
    };
    if ('ResizeObserver' in window) {
      state.resizeObserver = new ResizeObserver(() => {
        if (state.resizeFrame != null) cancelAnimationFrame(state.resizeFrame);
        state.resizeFrame = requestAnimationFrame(() => {
          state.resizeFrame = null;
          state.map.invalidateSize({ pan: false, debounceMoveend: true });
        });
      });
      state.resizeObserver.observe(container);
    }
    liveMapRegistry.set(container, state);
    mapRegistry.set(container, map);
    requestAnimationFrame(() => map.invalidateSize({ pan: false, debounceMoveend: true }));
  }

  const updateStartedAt = metricNow();
  state.metrics ??= ensureMapMetrics(container, 'live');
  state.metrics.updates = (state.metrics.updates || 0) + 1;

  const routes = Array.isArray(network?.routes) ? network.routes : [];
  const trips = Array.isArray(network?.trips) ? network.trips : [];
  const staticMode = options.mode === 'static';
  const stops = routes.flatMap((route) => Array.isArray(route.stops) ? route.stops : [])
    .filter(validCoordinate);
  const visibleStops = stops;
  const seenNodes = new Set();

  state.routeLines ??= new Map();
  const seenRouteLines = new Set();
  for (const route of routes) {
    const key = String(route.id ?? route.route_id ?? `${route.origin ?? ''}:${route.destination ?? ''}`);
    const candidatePoints = routePoints(route);
    const points = candidatePoints.length >= 2 ? candidatePoints : normalizePoints(route.stops);
    if (points.length < 2) continue;
    seenRouteLines.add(key);
    let line = state.routeLines.get(key);
    if (!line) {
      line = L.polyline(points, {
        color: staticMode ? '#159ac0' : '#6da8b9',
        weight: staticMode ? 5 : 3,
        opacity: staticMode ? .72 : .45,
        dashArray: staticMode ? null : '7 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(state.map);
      const label = `${route.origin ?? ''} → ${route.destination ?? ''}`.trim();
      if (label && line.bindTooltip) line.bindTooltip(label, { sticky: true });
      state.routeLines.set(key, line);
    } else {
      const previousPoints = line.getLatLngs?.() ?? [];
      const nextKey = points.map((point) => point.join(',')).join('|');
      const previousKey = previousPoints.map((point) => `${point.lat},${point.lng}`).join('|');
      if (nextKey !== previousKey) line.setLatLngs(points);
      line.setStyle?.({ color: staticMode ? '#159ac0' : '#6da8b9', weight: staticMode ? 5 : 3, opacity: staticMode ? .72 : .45 });
    }
  }
  for (const [key, line] of state.routeLines) {
    if (!seenRouteLines.has(key)) {
      line.remove();
      state.routeLines.delete(key);
    }
  }

  for (const stop of visibleStops) {
    const key = `${stop.name}:${stop.latitude}:${stop.longitude}`;
    seenNodes.add(key);
    if (state.nodeMarkers.has(key)) continue;
    const marker = L.marker([Number(stop.latitude), Number(stop.longitude)], {
      icon: markerIcon(L, 'destination', '●'),
      title: stop.name,
    }).addTo(state.map).bindTooltip(stop.name, { direction: 'top', offset: [0, -20] });
    state.nodeMarkers.set(key, marker);
  }

  for (const [key, marker] of state.nodeMarkers) {
    if (!seenNodes.has(key)) {
      marker.remove();
      state.nodeMarkers.delete(key);
    }
  }

  const seen = new Set();
  for (const trip of trips) {
    if (!validCoordinate(trip)) continue;
    const key = String(trip.trip_id);
    seen.add(key);
    const gpsState = trip.is_stale ? 'GPS not current' : 'GPS current';
    const popup = `<strong>${escapePopup(trip.bus_code || 'Encore bus')}</strong><br>${escapePopup(trip.origin || '')} → ${escapePopup(trip.destination || '')}<br>Status: ${escapePopup(trip.status || '')}<br>${gpsState}<br>Updated: ${escapePopup(trip.last_location_at || '—')}`;
    const coordinates = [Number(trip.latitude), Number(trip.longitude)];
    const markerKind = trip.is_stale ? 'vehicle-stale' : 'vehicle';
    const sampleAt = Date.parse(trip.last_location_at || '');
    let marker = state.vehicleMarkers.get(key);
    if (!marker) {
      marker = L.marker(coordinates, {
        icon: markerIconCached(state, L, markerKind, '•'),
        title: trip.bus_code || 'Encore bus',
      }).addTo(state.map);
      state.vehicleMarkers.set(key, marker);
      state.vehiclePositions.set(key, coordinates);
      state.vehicleSamples.set(key, { coordinates, sampleAt: Number.isFinite(sampleAt) ? sampleAt : null });
      state.metrics.markers.created += 1;
    } else {
      const previousSample = state.vehicleSamples.get(key);
      if (Number.isFinite(sampleAt) && Number.isFinite(previousSample?.sampleAt) && sampleAt < previousSample.sampleAt) {
        state.metrics.markers.outOfOrder += 1;
      } else {
        const current = marker.getLatLng?.();
        const from = current ? [current.lat, current.lng] : (state.vehiclePositions.get(key) ?? coordinates);
        const gapMs = Number.isFinite(sampleAt) && Number.isFinite(previousSample?.sampleAt)
          ? Math.max(0, sampleAt - previousSample.sampleAt)
          : 0;
        const duration = trip.is_stale || !Number.isFinite(sampleAt) || !Number.isFinite(previousSample?.sampleAt)
          ? 0
          : Math.min(5000, Math.max(350, Math.round(gapMs * 0.8)));
        animateLiveMarker(state, key, marker, from, coordinates, duration);
        state.metrics.markers.updated += 1;
        state.vehicleSamples.set(key, { coordinates, sampleAt: Number.isFinite(sampleAt) ? sampleAt : previousSample?.sampleAt ?? null });
      }
      state.vehiclePositions.set(key, coordinates);
    }
    const iconKey = `${markerKind}:•`;
    if (marker.setIcon && marker.__encoreIconKey !== iconKey) {
      marker.setIcon(markerIconCached(state, L, markerKind, '•'));
      marker.__encoreIconKey = iconKey;
    }
    if (marker.__encorePopup !== popup) {
      marker.setPopupContent?.(popup);
      if (!marker.getPopup()) marker.bindPopup(popup);
      else marker.getPopup().setContent(popup);
      marker.__encorePopup = popup;
    }
  }

  for (const [key, marker] of state.vehicleMarkers) {
    if (!seen.has(key)) {
      marker.remove();
      state.vehicleMarkers.delete(key);
      state.vehiclePositions.delete(key);
      state.vehicleSamples.delete(key);
      state.metrics.markers.removed += 1;
      const frame = state.vehicleAnimations.get(key);
      if (frame != null) cancelAnimationFrame(frame);
      state.vehicleAnimations.delete(key);
    }
  }

  const selectedMarker = options.selectedTripId
    ? state.vehicleMarkers.get(String(options.selectedTripId))
    : null;
  if (selectedMarker && state.lastSelectedTripId !== String(options.selectedTripId)) {
    state.map.setView(selectedMarker.getLatLng(), Math.max(state.map.getZoom(), 10), { animate: false });
    selectedMarker.openPopup();
    state.lastSelectedTripId = String(options.selectedTripId);
  } else if (!options.selectedTripId) {
    state.lastSelectedTripId = null;
  }

  const staticPoints = [
    ...[...state.routeLines.values()].flatMap((line) => line.getLatLngs?.().map((point) => [point.lat, point.lng]) ?? []),
    ...visibleStops.map((point) => [Number(point.latitude), Number(point.longitude)]),
  ];
  const fallbackPoints = trips.filter(validCoordinate).map((point) => [Number(point.latitude), Number(point.longitude)]);
  const points = staticPoints.length ? staticPoints : fallbackPoints;
  const viewKey = points.map((point) => point.join(',')).sort().join('|');
  const shouldFit = points.length && (staticPoints.length
    ? state.lastRouteViewKey !== viewKey
    : !state.hasInitialFit);
  if (shouldFit) {
    state.map.fitBounds(L.latLngBounds(points).pad(0.18), { animate: false, maxZoom: 11 });
    state.lastRouteViewKey = viewKey;
    state.hasInitialFit = true;
  }
  state.metrics.updateMs = Math.round((metricNow() - updateStartedAt) * 100) / 100;
  state.metrics.lastUpdatedAt = Date.now();
  recordResourceMetrics(state.metrics);
  if (points.length) clearRuntimeStatus(container);
  else if (options.emptyTitle || options.emptyDetail) runtimeStatus(container, options.emptyTitle ?? 'No current locations to show', options.emptyDetail ?? 'The map will update when a bus shares a recent, authorized location.');
  else if (staticMode) runtimeStatus(container, 'Published route geometry unavailable', 'The route book will show the network when published coordinates are available.');
  else runtimeStatus(container, 'No current locations to show', 'The map will update when a bus shares a recent, authorized location.');
  return state.map;
}

export function getMapPerformanceSnapshot() {
  const value = globalThis.__ENCORE_MAP_METRICS__ ?? { version: 1, maps: {} };
  return JSON.parse(JSON.stringify(value));
}
