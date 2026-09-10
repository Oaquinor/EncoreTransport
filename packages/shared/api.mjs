import { calculateOccupancy, createBookingQuote, getAvailableSeats, reserveSeats, searchTrips } from './business-rules.mjs';
import { bookingStatuses, driverStatuses, formatCurrency } from './domain.mjs';
import {
  mockBuses,
  mockDashboardMetrics,
  mockDrivers,
  mockIncidents,
  mockInventory,
  mockPassengers,
  mockPassengerJourney,
  mockRoutes,
  mockTrips
} from './mock-data.mjs';

const delay = (value, timeout = 260) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), timeout));

export async function fetchAppShell() {
  return delay({ routes: mockRoutes, buses: mockBuses });
}

export async function fetchPassengerSearch(filters) {
  const trips = searchTrips(mockTrips, filters).map((trip) => ({
    ...trip,
    availableSeats: getAvailableSeats(trip).length,
    priceLabel: formatCurrency(createBookingQuote(trip, filters.passengers ?? 1).total)
  }));

  return delay({ filters, trips, total: trips.length });
}

export async function fetchTripDetails(tripId) {
  const trip = mockTrips.find((entry) => entry.id === tripId) ?? mockTrips[0];
  const bus = mockBuses.find((entry) => entry.id === trip.busId) ?? mockBuses[0];
  const driver = mockDrivers.find((entry) => entry.id === trip.driverId) ?? mockDrivers[0];
  return delay({
    trip: {
      ...trip,
      occupancyLabel: `${calculateOccupancy(trip.seatMap.filter((seat) => seat.reserved).length, trip.seatMap.length)}%`,
      bus,
      driver,
      availableSeats: getAvailableSeats(trip)
    }
  });
}

export async function reserveTripSeats(tripId, seatIds, passengerCount) {
  const trip = mockTrips.find((entry) => entry.id === tripId) ?? mockTrips[0];
  const reservation = reserveSeats(trip, seatIds);
  const bookingQuote = createBookingQuote(trip, passengerCount);
  const booking = {
    id: `booking-${tripId}`,
    status: bookingStatuses.pendingPayment,
    seatIds,
    passengerCount,
    total: bookingQuote.total,
    totalLabel: bookingQuote.totalLabel,
    createdAt: new Date().toISOString()
  };

  return delay({ booking, reservation });
}

export async function fetchPassengerJourney() {
  return delay(mockPassengerJourney);
}

export async function fetchDriverContext() {
  return delay({
    driver: mockDrivers[1],
    currentTrip: mockTrips[0],
    passengers: mockPassengers,
    tripState: driverStatuses.next
  });
}

export async function fetchAdminDashboard() {
  return delay({
    metrics: mockDashboardMetrics,
    trips: mockTrips,
    buses: mockBuses,
    routes: mockRoutes,
    drivers: mockDrivers,
    passengers: mockPassengers,
    inventory: mockInventory,
    incidents: mockIncidents
  });
}
