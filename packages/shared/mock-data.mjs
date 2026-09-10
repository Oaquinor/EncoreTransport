import { bookingStatuses, driverStatuses, tripStatuses } from './domain.mjs';

export const mockRoutes = [
  { id: 'route-cdmx-puebla', origin: 'Ciudad de México', destination: 'Puebla', durationMinutes: 135 },
  { id: 'route-gdl-pv', origin: 'Guadalajara', destination: 'Puerto Vallarta', durationMinutes: 285 },
  { id: 'route-mty-slp', origin: 'Monterrey', destination: 'San Luis Potosí', durationMinutes: 255 },
  { id: 'route-quer-tol', origin: 'Querétaro', destination: 'Toluca', durationMinutes: 110 }
];

export const mockBuses = [
  {
    id: 'bus-aurora-14',
    plate: 'ET-314-AX',
    name: 'Aurora 14',
    capacity: 42,
    features: ['Wi-Fi', 'USB', 'A/C', 'Reclinables'],
    status: 'operational'
  },
  {
    id: 'bus-via-21',
    plate: 'ET-521-BY',
    name: 'Vía 21',
    capacity: 46,
    features: ['Wi-Fi', 'USB', 'A/C', 'Baño'],
    status: 'operational'
  },
  {
    id: 'bus-senda-09',
    plate: 'ET-109-CZ',
    name: 'Senda 09',
    capacity: 38,
    features: ['Wi-Fi', 'A/C', 'Cargadores'],
    status: 'maintenance'
  }
];

export const mockDrivers = [
  {
    id: 'driver-1',
    name: 'Sofía Hernández',
    license: 'D-AL-8841',
    status: driverStatuses.next
  },
  {
    id: 'driver-2',
    name: 'Ricardo Luna',
    license: 'D-AL-5520',
    status: driverStatuses.active
  },
  {
    id: 'driver-3',
    name: 'Daniela Cruz',
    license: 'D-AL-9012',
    status: driverStatuses.finished
  }
];

function seatRow(row, letters) {
  return letters.map((letter, index) => {
    const seatNumber = `${row}${letter}`;
    const isReserved = row % 3 === 0 && index === 1;
    const isBlocked = row === 8 && index > 0;
    return {
      id: seatNumber,
      label: seatNumber,
      reserved: isReserved,
      blocked: isBlocked,
      window: index === 0 || index === 2,
      aisle: index === 1 || index === 3
    };
  });
}

function createSeatMap(totalRows = 10) {
  return Array.from({ length: totalRows }, (_, index) => seatRow(index + 1, ['A', 'B', 'C', 'D'])).flat();
}

export const mockTrips = [
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
    status: tripStatuses.boarding,
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
    status: tripStatuses.scheduled,
    featured: false,
    highlights: ['Panorámico', 'Baño', 'Refrigerios'],
    seatMap: createSeatMap(11)
  },
  {
    id: 'trip-mty-slp-1645',
    routeId: 'route-mty-slp',
    routeName: 'Monterrey → San Luis Potosí',
    origin: 'Monterrey',
    destination: 'San Luis Potosí',
    date: '2026-09-12',
    departureTime: '16:45',
    arrivalTime: '21:00',
    durationMinutes: 255,
    baseFare: 450,
    demandMultiplier: 1.15,
    serviceFee: 30,
    occupancy: 82,
    seatsAvailable: 8,
    busId: 'bus-aurora-14',
    driverId: 'driver-2',
    status: tripStatuses.boarding,
    featured: true,
    highlights: ['VIP', 'Wi-Fi', 'Carga rápida'],
    seatMap: createSeatMap(10)
  }
];

export const mockPassengerJourney = {
  passengerName: 'María Torres',
  lastSearch: {
    origin: 'Ciudad de México',
    destination: 'Puebla',
    date: '2026-09-12',
    passengers: 2
  },
  selectedSeats: ['4B', '4C'],
  paymentMethod: 'Tarjeta terminada en 4281',
  bookingStatus: bookingStatuses.pendingPayment
};

export const mockDashboardMetrics = {
  tripsToday: 24,
  bookings: 186,
  passengers: 482,
  revenue: 152340,
  occupancy: 78,
  incidents: 3,
  availableBuses: 11,
  pendingBookings: 19
};

export const mockInventory = [
  { id: 'inventory-water', name: 'Agua embotellada', unit: 'piezas', quantity: 180, minimum: 60, status: 'healthy' },
  { id: 'inventory-snacks', name: 'Snacks premium', unit: 'piezas', quantity: 42, minimum: 50, status: 'low' },
  { id: 'inventory-cables', name: 'Cables de carga', unit: 'piezas', quantity: 26, minimum: 20, status: 'healthy' }
];

export const mockIncidents = [
  { id: 'incident-1', title: 'Retraso por tráfico en salida', severity: 'medium', tripId: 'trip-cdmx-puebla-700' },
  { id: 'incident-2', title: 'Asiento con reclinación limitada', severity: 'low', tripId: 'trip-gdl-pv-1130' }
];

export const mockPassengers = [
  { id: 'passenger-1', name: 'María Torres', idNumber: 'MX-748211', status: 'confirmed' },
  { id: 'passenger-2', name: 'Luis Ibarra', idNumber: 'MX-884112', status: 'boarding' },
  { id: 'passenger-3', name: 'Andrea Molina', idNumber: 'MX-991220', status: 'checked_in' }
];