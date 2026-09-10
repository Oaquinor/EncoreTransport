import { appConfig } from './app-config.mjs';
import { formatCurrency } from './domain.mjs';

async function requestJson(path, options) {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }

  return response.json();
}

export async function fetchAppShell() {
  const payload = await requestJson('/routes');
  const routes = Array.isArray(payload.data) ? payload.data : [];
  return { routes };
}

export async function fetchPassengerSearch(filters) {
  const payload = await requestJson(`/trips/search?origin=${encodeURIComponent(filters.origin ?? '')}&destination=${encodeURIComponent(filters.destination ?? '')}&date=${encodeURIComponent(filters.date ?? '')}&passengers=${encodeURIComponent(filters.passengers ?? 1)}`);
  const trips = (payload.data ?? payload.trips ?? []).map((trip) => ({
    ...trip,
    availableSeats: trip.availableSeats ?? trip.seats_available ?? 0,
    priceLabel: trip.priceLabel ?? formatCurrency(trip.price_per_passenger ?? trip.price ?? 0)
  }));

  return { filters, trips, total: trips.length };
}

export async function fetchTripDetails(tripId) {
  const payload = await requestJson(`/trips/${encodeURIComponent(tripId)}`);
  return { trip: payload.data ?? payload.trip ?? null };
}

export async function reserveTripSeats(tripId, seatIds, passengerCount) {
  const payload = await requestJson('/bookings', {
    method: 'POST',
    body: JSON.stringify({ trip_id: tripId, seat_numbers: seatIds, passenger_count: passengerCount })
  });

  return payload;
}

export async function fetchPassengerJourney() {
  const payload = await requestJson('/bookings');
  return payload.data ?? payload;
}

export async function fetchDriverContext() {
  const payload = await requestJson('/driver/me');
  return payload.data ?? payload;
}

export async function fetchAdminDashboard() {
  const payload = await requestJson('/admin/dashboard');
  return payload.data ?? payload;
}
