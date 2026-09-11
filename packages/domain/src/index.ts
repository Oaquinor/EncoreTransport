import type { BookingStatus, DriverStatus, Seat, Trip, TripSearchFilters, TripStatus } from '@encore/types';

export const tripStatuses = Object.freeze({
  scheduled: 'scheduled',
  boarding: 'boarding',
  inProgress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled'
} satisfies Record<string, TripStatus>);

export const driverStatuses = Object.freeze({
  next: 'next',
  active: 'active',
  finished: 'finished'
} satisfies Record<string, DriverStatus>);

export const bookingStatuses = Object.freeze({
  draft: 'draft',
  pendingPayment: 'pending_payment',
  confirmed: 'confirmed',
  cancelled: 'cancelled'
} satisfies Record<string, BookingStatus>);

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${isoDate}T12:00:00`));
}

export function formatTimeLabel(timeValue: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(`2026-01-01T${timeValue}:00`));
}

export function calculateTripPrice(trip: Pick<Trip, 'baseFare' | 'demandMultiplier' | 'serviceFee'>, passengerCount = 1): number {
  const baseValue = Number(trip.baseFare ?? 0);
  const multiplier = Number(trip.demandMultiplier ?? 1);
  const serviceFee = Number(trip.serviceFee ?? 0);
  const safePassengers = Math.max(1, Number(passengerCount) || 1);
  return Math.round(baseValue * safePassengers * multiplier + serviceFee);
}

export function calculateOccupancy(occupiedSeats: number, totalSeats: number): number {
  if (!totalSeats) {
    return 0;
  }

  return Math.round((occupiedSeats / totalSeats) * 100);
}

export function getAvailableSeats(trip: Pick<Trip, 'seatMap'>): Seat[] {
  return trip.seatMap.filter((seat) => !seat.reserved && !seat.blocked);
}

export function searchTrips(trips: Trip[], filters: TripSearchFilters): Trip[] {
  const origin = normalizeText(filters.origin);
  const destination = normalizeText(filters.destination);
  const passengers = Number(filters.passengers ?? 1);

  return trips.filter((trip) => {
    const matchesOrigin = !origin || normalizeText(trip.origin).includes(origin);
    const matchesDestination = !destination || normalizeText(trip.destination).includes(destination);
    const matchesDate = !filters.date || trip.date === filters.date;
    const hasCapacity = trip.seatsAvailable >= passengers;
    return matchesOrigin && matchesDestination && matchesDate && hasCapacity;
  });
}

export function createBookingQuote(trip: Trip, passengerCount = 1) {
  const total = calculateTripPrice(trip, passengerCount);
  return {
    tripId: trip.id,
    passengerCount,
    currency: 'MXN',
    total,
    totalLabel: formatCurrency(total),
    breakdown: {
      baseFare: trip.baseFare,
      demandMultiplier: trip.demandMultiplier,
      serviceFee: trip.serviceFee
    }
  };
}

export function reserveSeats(trip: Trip, seatIds: string[]) {
  const selectedSeats = new Set(seatIds);
  const knownSeats = new Set(trip.seatMap.map((seat) => seat.id));
  const unavailableSeats = [...selectedSeats].filter((seatId) => !knownSeats.has(seatId) || trip.seatMap.some((seat) => seat.id === seatId && (seat.reserved || seat.blocked)));
  const unavailableSeatSet = new Set(unavailableSeats);
  const reservableSeatIds = [...selectedSeats].filter((seatId) => knownSeats.has(seatId) && !unavailableSeatSet.has(seatId));

  return {
    updatedTrip: {
      ...trip,
      seatMap: trip.seatMap.map((seat) => (selectedSeats.has(seat.id) && !unavailableSeatSet.has(seat.id) ? { ...seat, reserved: true } : seat)),
      seatsAvailable: Math.max(0, trip.seatsAvailable - reservableSeatIds.length)
    },
    unavailableSeats
  };
}

const allowedTripTransitions = new Map<TripStatus, TripStatus[]>([
  [tripStatuses.scheduled, [tripStatuses.boarding, tripStatuses.cancelled]],
  [tripStatuses.boarding, [tripStatuses.inProgress, tripStatuses.cancelled]],
  [tripStatuses.inProgress, [tripStatuses.completed, tripStatuses.cancelled]],
  [tripStatuses.completed, []],
  [tripStatuses.cancelled, []]
]);

export function canTransitionTrip(currentStatus: TripStatus, nextStatus: TripStatus): boolean {
  return (allowedTripTransitions.get(currentStatus) ?? []).includes(nextStatus);
}

export function getTripStatusTone(status: TripStatus): 'info' | 'success' | 'warning' | 'neutral' {
  switch (status) {
    case tripStatuses.boarding:
    case tripStatuses.inProgress:
      return 'info';
    case tripStatuses.completed:
      return 'success';
    case tripStatuses.cancelled:
      return 'warning';
    default:
      return 'neutral';
  }
}
