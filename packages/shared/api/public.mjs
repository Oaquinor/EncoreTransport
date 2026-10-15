import {
  requestJson,
} from './core.mjs';

const journeyCache = new Map();
const journeyRequests = new Map();

export function health() {
  return requestJson(
    '/health',
    { token: false },
  );
}

export async function fetchRoutes() {
  const payload =
    await requestJson(
      '/routes',
      { token: false },
    );

  return payload.data ?? [];
}

export async function fetchRoute(id) {
  const payload =
    await requestJson(
      `/routes/${encodeURIComponent(id)}`,
      { token: false },
    );

  return payload.data ?? payload;
}

export async function fetchPassengerSearch(
  filters = {},
) {
  const query =
    new URLSearchParams();

  if (filters.origin) {
    query.set(
      'origin',
      filters.origin,
    );
  }

  if (filters.destination) {
    query.set(
      'destination',
      filters.destination,
    );
  }

  if (filters.date) {
    query.set(
      'date',
      filters.date,
    );
  }

  query.set(
    'passengers',
    String(
      filters.passengers ?? 1,
    ),
  );

  const payload =
    await requestJson(
      `/trips/search?${query}`,
      { token: false },
    );

  const trips =
    payload.data ?? [];

  return {
    filters,
    trips,
    total: trips.length,
  };
}

export async function fetchTripDetails(id) {
  const payload =
    await requestJson(
      `/trips/${encodeURIComponent(id)}`,
      { token: false },
    );

  return payload.data ?? payload;
}

export async function fetchTripSeats(id) {
  const payload =
    await requestJson(
      `/trips/${encodeURIComponent(id)}/seats`,
      { token: false },
    );

  return payload.data ?? [];
}

export async function quoteTrip(
  id,
  passengers,
) {
  const payload =
    await requestJson(
      `/trips/${encodeURIComponent(id)}/quote?passengers=${encodeURIComponent(passengers)}`,
      { token: false },
    );

  return payload.data ?? payload;
}

export async function mapJourney(
  origin,
  destination,
) {
  const cacheKey = `${String(origin).trim().toLowerCase()}::${String(destination).trim().toLowerCase()}`;
  if (journeyCache.has(cacheKey)) return journeyCache.get(cacheKey);
  if (journeyRequests.has(cacheKey)) return journeyRequests.get(cacheKey);

  const query =
    new URLSearchParams({
      origin,
      destination,
    });

  const request = requestJson(
      `/maps/journey?${query}`,
      { token: false },
    ).then((payload) => {
      const result = payload.data ?? payload;
      journeyCache.set(cacheKey, result);
      return result;
    }).finally(() => journeyRequests.delete(cacheKey));

  journeyRequests.set(cacheKey, request);

  return request;
}

export async function publicTrackPackage(
  token,
) {
  const payload =
    await requestJson(
      `/packages/track/${encodeURIComponent(token)}`,
      { token: false },
    );

  return payload.data ?? payload;
}
