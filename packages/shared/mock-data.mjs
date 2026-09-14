import { bookingStatuses, driverStatuses, tripStatuses } from './domain.mjs';

export const mockRoutes = [
  { id: 'route-sdq-sti', origin: 'Santo Domingo', destination: 'Santiago', durationMinutes: 135 },
  { id: 'route-sdq-puj', origin: 'Santo Domingo', destination: 'Punta Cana', durationMinutes: 165 },
  { id: 'route-sti-pop', origin: 'Santiago', destination: 'Puerto Plata', durationMinutes: 95 },
  { id: 'route-sdq-lrm', origin: 'Santo Domingo', destination: 'La Romana', durationMinutes: 90 }
];

export const mockBuses = [
  {
    id: 'bus-203',
    plate: 'A874512',
    name: 'Bus 203',
    capacity: 40,
    features: ['Wi-Fi', 'USB', 'A/C', 'Reclining seats'],
    status: 'operational'
  },
  {
    id: 'bus-118',
    plate: 'A662104',
    name: 'Bus 118',
    capacity: 36,
    features: ['Wi-Fi', 'A/C', 'Included luggage'],
    status: 'operational'
  },
  {
    id: 'van-045',
    plate: 'V140882',
    name: 'Executive Van 045',
    capacity: 14,
    features: ['A/C', 'Private service', 'USB'],
    status: 'maintenance'
  }
];

export const mockDrivers = [
  { id: 'driver-ricardo-luna', name: 'Ricardo Luna', license: 'DOP-D-5520', status: driverStatuses.active },
  { id: 'driver-laura-medina', name: 'Laura Medina', license: 'DOP-D-8841', status: driverStatuses.next },
  { id: 'driver-manuel-rojas', name: 'Manuel Rojas', license: 'DOP-D-9012', status: driverStatuses.finished }
];

function seatRow(row, letters) {
  return letters.map((letter, index) => {
    const seatNumber = `${row}${letter}`;
    const isReserved = ['3B', '5C', '6B', '9A'].includes(seatNumber);
    const isBlocked = ['10C', '10D'].includes(seatNumber);
    return {
      id: seatNumber,
      label: seatNumber,
      reserved: isReserved,
      blocked: isBlocked,
      window: index === 0 || index === 3,
      aisle: index === 1 || index === 2
    };
  });
}

function createSeatMap(totalRows = 10) {
  return Array.from({ length: totalRows }, (_, index) => seatRow(index + 1, ['A', 'B', 'C', 'D'])).flat();
}

export const mockTrips = [
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
    status: tripStatuses.boarding,
    featured: true,
    serviceClass: 'Premium Shuttle',
    boardingPoint: 'Agora Mall, north entrance',
    dropoffPoint: 'Monumento a los Heroes',
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
    status: tripStatuses.scheduled,
    featured: true,
    serviceClass: 'Coastal Express',
    boardingPoint: 'Blue Mall, valet lobby',
    dropoffPoint: 'Downtown Punta Cana',
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
    status: tripStatuses.scheduled,
    featured: false,
    serviceClass: 'City Connector',
    boardingPoint: 'Plaza Internacional',
    dropoffPoint: 'Puerto Plata Malecon',
    highlights: ['Fast', 'A/C', 'Luggage included'],
    seatMap: createSeatMap(10)
  },
  {
    id: 'EN-004',
    routeId: 'route-sdq-lrm',
    routeName: 'Santo Domingo → La Romana',
    origin: 'Santo Domingo',
    destination: 'La Romana',
    date: '2026-09-14',
    departureTime: '18:10',
    arrivalTime: '19:40',
    durationMinutes: 90,
    baseFare: 580,
    demandMultiplier: 1,
    serviceFee: 30,
    occupancy: 43,
    seatsAvailable: 21,
    busId: 'bus-118',
    driverId: 'driver-laura-medina',
    status: tripStatuses.scheduled,
    featured: false,
    serviceClass: 'Evening Shuttle',
    boardingPoint: 'Sambil, main entrance',
    dropoffPoint: 'Multiplaza La Romana',
    highlights: ['Direct', 'Wi-Fi', 'Evening departure'],
    seatMap: createSeatMap(9)
  }
];

export const mockPassengerJourney = {
  passengerName: 'Maria Torres',
  lastSearch: {
    origin: 'Santo Domingo',
    destination: 'Santiago',
    date: '2026-09-14',
    passengers: 2
  },
  selectedSeats: ['4B', '4C'],
  paymentMethod: 'Card ending in 4281',
  bookingStatus: bookingStatuses.pendingPayment
};

export const mockDashboardMetrics = {
  tripsToday: 32,
  bookings: 214,
  passengers: 526,
  revenue: 184250,
  occupancy: 72,
  incidents: 2,
  availableBuses: 9,
  pendingBookings: 16
};

export const mockInventory = [
  { id: 'inventory-water', name: 'Bottled water', unit: 'units', quantity: 220, minimum: 80, status: 'healthy' },
  { id: 'inventory-tags', name: 'Luggage tags', unit: 'units', quantity: 54, minimum: 60, status: 'low' },
  { id: 'inventory-cables', name: 'Charging cables', unit: 'units', quantity: 28, minimum: 20, status: 'healthy' }
];

export const mockIncidents = [
  { id: 'incident-1', title: 'Heavy traffic on Autopista Duarte', severity: 'medium', tripId: 'EN-001' },
  { id: 'incident-2', title: 'Preventive A/C inspection', severity: 'low', tripId: 'EN-002' }
];

export const mockPassengers = [
  { id: 'passenger-1', name: 'Maria Torres', idNumber: '001-7482110-4', status: 'confirmed' },
  { id: 'passenger-2', name: 'Luis Ibarra', idNumber: '031-8841120-8', status: 'boarding' },
  { id: 'passenger-3', name: 'Andrea Molina', idNumber: '402-9912201-2', status: 'checked_in' },
  { id: 'passenger-4', name: 'Cecilia Ramos', idNumber: '001-5520912-6', status: 'pending_payment' }
];
