import { bookingStatuses, createBookingQuote, formatCurrency, getAvailableSeats, reserveSeats, searchTrips } from '@encore/domain';
import type { Booking, Driver, Incident, Passenger, Route, Trip, TripSearchFilters, TripSearchResult, Vehicle } from '@encore/types';

const delay = <T>(value: T, timeout = 240): Promise<T> =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(structuredClone(value)), timeout);
  });

function seatRow(row: number, letters: string[]) {
  return letters.map((letter, index) => {
    const seatNumber = `${row}${letter}`;
    return {
      id: seatNumber,
      label: seatNumber,
      reserved: row % 3 === 0 && index === 1,
      blocked: row === 8 && index > 0,
      window: index === 0 || index === 2,
      aisle: index === 1 || index === 3
    };
  });
}

function createSeatMap(totalRows = 10) {
  return Array.from({ length: totalRows }, (_, index) => seatRow(index + 1, ['A', 'B', 'C', 'D'])).flat();
}

const mockRoutes: Route[] = [
  { id: 'route-cdmx-puebla', origin: 'Ciudad de México', destination: 'Puebla', durationMinutes: 135 },
  { id: 'route-gdl-pv', origin: 'Guadalajara', destination: 'Puerto Vallarta', durationMinutes: 285 },
  { id: 'route-mty-slp', origin: 'Monterrey', destination: 'San Luis Potosí', durationMinutes: 255 }
];

const mockVehicles: Vehicle[] = [
  { id: 'bus-aurora-14', plate: 'ET-314-AX', name: 'Aurora 14', capacity: 42, features: ['Wi-Fi', 'USB', 'A/C'], status: 'operational' },
  { id: 'bus-via-21', plate: 'ET-521-BY', name: 'Vía 21', capacity: 46, features: ['Wi-Fi', 'USB', 'Baño'], status: 'operational' }
];

const mockDrivers: Driver[] = [
  { id: 'driver-1', name: 'Sofía Hernández', license: 'D-AL-8841', status: 'next' },
  { id: 'driver-2', name: 'Ricardo Luna', license: 'D-AL-5520', status: 'active' }
];

const mockTrips: Trip[] = [
  {
    id: 'trip-cdmx-puebla-700',
    routeId: 'route-cdmx-puebla',
    routeName: 'Ciudad de México → Puebla',
    origin: 'Ciudad de México',
    destination: 'Puebla',
    date: '2026-09-12',
    departureTime: '07:00',
    arrivalTime: '09:15',
    durationMinutes: 135,
    baseFare: 320,
    demandMultiplier: 1,
    serviceFee: 25,
    occupancy: 68,
    seatsAvailable: 14,
    busId: 'bus-aurora-14',
    driverId: 'driver-1',
    status: 'boarding',
    featured: true,
    highlights: ['Express', 'Wi-Fi', '1 parada'],
    seatMap: createSeatMap(10)
  },
  {
    id: 'trip-gdl-pv-1130',
    routeId: 'route-gdl-pv',
    routeName: 'Guadalajara → Puerto Vallarta',
    origin: 'Guadalajara',
    destination: 'Puerto Vallarta',
    date: '2026-09-12',
    departureTime: '11:30',
    arrivalTime: '16:05',
    durationMinutes: 275,
    baseFare: 520,
    demandMultiplier: 1.08,
    serviceFee: 35,
    occupancy: 54,
    seatsAvailable: 20,
    busId: 'bus-via-21',
    driverId: 'driver-2',
    status: 'scheduled',
    featured: false,
    highlights: ['Panorámico', 'Baño', 'Refrigerios'],
    seatMap: createSeatMap(11)
  }
];

export interface AppShellResponse {
  routes: Route[];
  vehicles: Vehicle[];
}

export interface TripDetailsResponse {
  trip: Trip & {
    vehicle: Vehicle;
    driver: Driver;
    availableSeats: ReturnType<typeof getAvailableSeats>;
    priceLabel: string;
  };
}

export interface PassengerSearchResponse {
  filters: TripSearchFilters;
  trips: TripSearchResult[];
  total: number;
}

export interface ReserveSeatsResponse {
  booking: Booking;
  reservation: ReturnType<typeof reserveSeats>;
}

export interface EncoreApiClient {
  fetchAppShell(): Promise<AppShellResponse>;
  fetchPassengerSearch(filters: TripSearchFilters): Promise<PassengerSearchResponse>;
  fetchTripDetails(tripId: string): Promise<TripDetailsResponse>;
  reserveTripSeats(tripId: string, seatIds: string[], passengerCount: number): Promise<ReserveSeatsResponse>;
}

export function createMockEncoreApiClient(): EncoreApiClient {
  return {
    fetchAppShell() {
      return delay({ routes: mockRoutes, vehicles: mockVehicles });
    },
    fetchPassengerSearch(filters) {
      const trips = searchTrips(mockTrips, filters).map((trip) => ({
        ...trip,
        availableSeats: getAvailableSeats(trip).length,
        priceLabel: formatCurrency(createBookingQuote(trip, filters.passengers).total)
      }));

      return delay({ filters, trips, total: trips.length });
    },
    fetchTripDetails(tripId) {
      const trip = mockTrips.find((entry) => entry.id === tripId) ?? mockTrips[0];
      const vehicle = mockVehicles.find((entry) => entry.id === trip.busId) ?? mockVehicles[0];
      const driver = mockDrivers.find((entry) => entry.id === trip.driverId) ?? mockDrivers[0];
      return delay({
        trip: {
          ...trip,
          vehicle,
          driver,
          availableSeats: getAvailableSeats(trip),
          priceLabel: formatCurrency(createBookingQuote(trip, 1).total)
        }
      });
    },
    reserveTripSeats(tripId, seatIds, passengerCount) {
      const trip = mockTrips.find((entry) => entry.id === tripId) ?? mockTrips[0];
      const reservation = reserveSeats(trip, seatIds);
      const quote = createBookingQuote(trip, passengerCount);
      return delay({
        reservation,
        booking: {
          id: `booking-${tripId}`,
          status: bookingStatuses.pendingPayment,
          tripId,
          seatIds,
          passengerCount,
          total: quote.total,
          totalLabel: quote.totalLabel,
          createdAt: new Date().toISOString()
        }
      });
    }
  };
}

export type { Driver, Incident, Passenger, Route, Trip, Vehicle };
