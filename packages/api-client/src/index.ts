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
      reserved: ['3B', '5C', '6B', '9A'].includes(seatNumber),
      blocked: ['10C', '10D'].includes(seatNumber),
      window: index === 0 || index === 3,
      aisle: index === 1 || index === 2
    };
  });
}

function createSeatMap(totalRows = 10) {
  return Array.from({ length: totalRows }, (_, index) => seatRow(index + 1, ['A', 'B', 'C', 'D'])).flat();
}

const mockRoutes: Route[] = [
  { id: 'route-sdq-sti', origin: 'Santo Domingo', destination: 'Santiago', durationMinutes: 135 },
  { id: 'route-sdq-puj', origin: 'Santo Domingo', destination: 'Punta Cana', durationMinutes: 165 },
  { id: 'route-sti-pop', origin: 'Santiago', destination: 'Puerto Plata', durationMinutes: 95 },
  { id: 'route-sdq-lrm', origin: 'Santo Domingo', destination: 'La Romana', durationMinutes: 90 }
];

const mockVehicles: Vehicle[] = [
  { id: 'bus-203', plate: 'A874512', name: 'Bus 203', capacity: 40, features: ['Wi-Fi', 'USB', 'A/C', 'Reclining seats'], status: 'operational' },
  { id: 'bus-118', plate: 'A662104', name: 'Bus 118', capacity: 36, features: ['Wi-Fi', 'A/C', 'Included luggage'], status: 'operational' },
  { id: 'van-045', plate: 'V140882', name: 'Executive Van 045', capacity: 14, features: ['A/C', 'Private service', 'USB'], status: 'maintenance' }
];

const mockDrivers: Driver[] = [
  { id: 'driver-ricardo-luna', name: 'Ricardo Luna', license: 'DOP-D-5520', status: 'active' },
  { id: 'driver-laura-medina', name: 'Laura Medina', license: 'DOP-D-8841', status: 'next' },
  { id: 'driver-manuel-rojas', name: 'Manuel Rojas', license: 'DOP-D-9012', status: 'finished' }
];

const mockTrips: Trip[] = [
  {
    id: 'EN-001',
    routeId: 'route-sdq-sti',
    routeName: 'Santo Domingo → Santiago',
    origin: 'Santo Domingo',
    destination: 'Santiago',
    date: '2026-09-14',
    departureTime: '08:30',
    arrivalTime: '10:45',
    durationMinutes: 135,
    baseFare: 650,
    demandMultiplier: 1,
    serviceFee: 35,
    occupancy: 55,
    seatsAvailable: 18,
    busId: 'bus-203',
    driverId: 'driver-ricardo-luna',
    status: 'boarding',
    featured: true,
    highlights: ['Direct', 'Wi-Fi', 'A/C', 'Luggage included'],
    seatMap: createSeatMap(10)
  },
  {
    id: 'EN-002',
    routeId: 'route-sdq-puj',
    routeName: 'Santo Domingo → Punta Cana',
    origin: 'Santo Domingo',
    destination: 'Punta Cana',
    date: '2026-09-14',
    departureTime: '11:15',
    arrivalTime: '14:00',
    durationMinutes: 165,
    baseFare: 950,
    demandMultiplier: 1.05,
    serviceFee: 50,
    occupancy: 61,
    seatsAvailable: 14,
    busId: 'bus-118',
    driverId: 'driver-laura-medina',
    status: 'scheduled',
    featured: true,
    highlights: ['Express', 'USB', 'Reclining seats'],
    seatMap: createSeatMap(9)
  },
  {
    id: 'EN-003',
    routeId: 'route-sti-pop',
    routeName: 'Santiago → Puerto Plata',
    origin: 'Santiago',
    destination: 'Puerto Plata',
    date: '2026-09-14',
    departureTime: '16:20',
    arrivalTime: '17:55',
    durationMinutes: 95,
    baseFare: 520,
    demandMultiplier: 1,
    serviceFee: 30,
    occupancy: 70,
    seatsAvailable: 11,
    busId: 'bus-203',
    driverId: 'driver-manuel-rojas',
    status: 'scheduled',
    featured: false,
    highlights: ['Fast', 'A/C', 'Luggage included'],
    seatMap: createSeatMap(10)
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
    boardingPoint: string;
    dropoffPoint: string;
    serviceClass: string;
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
          priceLabel: formatCurrency(createBookingQuote(trip, 1).total),
          boardingPoint: trip.id === 'EN-001' ? 'Agora Mall, north entrance' : 'Main pickup point',
          dropoffPoint: trip.id === 'EN-001' ? 'Monumento a los Heroes' : 'Destination lobby',
          serviceClass: trip.id === 'EN-002' ? 'Coastal Express' : 'Premium Shuttle'
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
          id: `BK-${tripId}-4281`,
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
