import { appConfig } from './app-config.mjs';
import { formatCurrency } from './domain.mjs';
import { createBookingQuote, getAvailableSeats, reserveSeats, searchTrips } from './business-rules.mjs';
import { mockBuses, mockDashboardMetrics, mockDrivers, mockIncidents, mockInventory, mockPassengers, mockRoutes, mockTrips } from './mock-data.mjs';

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
  try {
    const payload = await requestJson('/routes');
    const routes = Array.isArray(payload.data) ? payload.data : [];
    return { routes };
  } catch {
    return {
      routes: mockRoutes.map((route) => ({
        ...route,
        nextTrip: mockTrips.find((trip) => trip.routeId === route.id) ?? null
      }))
    };
  }
}

export async function fetchPassengerSearch(filters) {
  try {
    const payload = await requestJson(`/trips/search?origin=${encodeURIComponent(filters.origin ?? '')}&destination=${encodeURIComponent(filters.destination ?? '')}&date=${encodeURIComponent(filters.date ?? '')}&passengers=${encodeURIComponent(filters.passengers ?? 1)}`);
    const trips = (payload.data ?? payload.trips ?? []).map((trip) => ({
      ...trip,
      availableSeats: trip.availableSeats ?? trip.seats_available ?? 0,
      priceLabel: trip.priceLabel ?? formatCurrency(trip.price_per_passenger ?? trip.price ?? 0)
    }));

    return { filters, trips, total: trips.length };
  } catch {
    const trips = searchTrips(mockTrips, filters).map((trip) => ({
      ...trip,
      availableSeats: getAvailableSeats(trip).length,
      priceLabel: formatCurrency(createBookingQuote(trip, filters.passengers).total)
    }));
    return { filters, trips, total: trips.length };
  }
}

export async function fetchTripDetails(tripId) {
  try {
    const payload = await requestJson(`/trips/${encodeURIComponent(tripId)}`);
    return { trip: payload.data ?? payload.trip ?? null };
  } catch {
    const trip = mockTrips.find((entry) => entry.id === tripId) ?? mockTrips[0];
    const vehicle = mockBuses.find((entry) => entry.id === trip.busId) ?? mockBuses[0];
    const driver = mockDrivers.find((entry) => entry.id === trip.driverId) ?? mockDrivers[0];
    return {
      trip: {
        ...trip,
        vehicle,
        driver,
        availableSeats: getAvailableSeats(trip),
        priceLabel: formatCurrency(createBookingQuote(trip, 1).total)
      }
    };
  }
}

export async function reserveTripSeats(tripId, seatIds, passengerCount) {
  try {
    const payload = await requestJson('/bookings', {
      method: 'POST',
      body: JSON.stringify({ trip_id: tripId, seat_numbers: seatIds, passenger_count: passengerCount })
    });

    return payload;
  } catch {
    const trip = mockTrips.find((entry) => entry.id === tripId) ?? mockTrips[0];
    const quote = createBookingQuote(trip, passengerCount);
    return {
      reservation: reserveSeats(trip, seatIds),
      booking: {
        id: `BK-${trip.id}-4281`,
        status: 'pending_payment',
        tripId,
        seatIds,
        passengerCount,
        total: quote.total,
        totalLabel: quote.totalLabel,
        createdAt: new Date().toISOString()
      }
    };
  }
}

export async function fetchPassengerJourney() {
  try {
    const payload = await requestJson('/bookings');
    return payload.data ?? payload;
  } catch {
    return { trips: mockTrips, passengers: mockPassengers };
  }
}

export async function fetchDriverContext() {
  try {
    const payload = await requestJson('/driver/me');
    return payload.data ?? payload;
  } catch {
    return {
      driver: mockDrivers[0],
      currentTrip: mockTrips[0],
      passengers: mockPassengers,
      tripState: 'active'
    };
  }
}

export async function fetchAdminDashboard() {
  try {
    const payload = await requestJson('/admin/dashboard');
    return payload.data ?? payload;
  } catch {
    return {
      metrics: mockDashboardMetrics,
      trips: mockTrips,
      buses: mockBuses,
      drivers: mockDrivers,
      passengers: mockPassengers,
      inventory: mockInventory,
      incidents: mockIncidents
    };
  }
}
