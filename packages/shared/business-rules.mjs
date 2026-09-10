import { bookingStatuses, driverStatuses, normalizeText, tripStatuses, formatCurrency } from './domain.mjs';

export function calculateTripPrice(trip, passengerCount = 1) {
  const baseValue = Number(trip.baseFare ?? 0);
  const multiplier = Number(trip.demandMultiplier ?? 1);
  const serviceFee = Number(trip.serviceFee ?? 0);
  const safePassengers = Math.max(1, Number(passengerCount) || 1);
  const rawTotal = baseValue * safePassengers * multiplier + serviceFee;
  return Math.round(rawTotal);
}

export function calculateOccupancy(occupiedSeats, totalSeats) {
  if (!totalSeats) {
    return 0;
  }

  return Math.round((occupiedSeats / totalSeats) * 100);
}

export function getAvailableSeats(trip) {
  return trip.seatMap.filter((seat) => !seat.reserved && !seat.blocked);
}

export function searchTrips(trips, filters) {
  const origin = normalizeText(filters.origin);
  const destination = normalizeText(filters.destination);
  const date = filters.date ?? '';
  const passengers = Number(filters.passengers ?? 1);

  return trips.filter((trip) => {
    const matchesOrigin = !origin || normalizeText(trip.origin).includes(origin);
    const matchesDestination = !destination || normalizeText(trip.destination).includes(destination);
    const matchesDate = !date || trip.date === date;
    const hasCapacity = trip.seatsAvailable >= passengers;
    return matchesOrigin && matchesDestination && matchesDate && hasCapacity;
  });
}

export function createBookingQuote(trip, passengerCount = 1) {
  const price = calculateTripPrice(trip, passengerCount);
  return {
    tripId: trip.id,
    passengerCount,
    currency: 'MXN',
    total: price,
    totalLabel: formatCurrency(price),
    breakdown: {
      baseFare: trip.baseFare,
      demandMultiplier: trip.demandMultiplier,
      serviceFee: trip.serviceFee
    }
  };
}

export function reserveSeats(trip, seatIds) {
  const selectedSeats = new Set(seatIds);
  const updatedTrip = {
    ...trip,
    seatMap: trip.seatMap.map((seat) => (selectedSeats.has(seat.id) ? { ...seat, reserved: true } : seat)),
    seatsAvailable: Math.max(0, trip.seatsAvailable - selectedSeats.size)
  };

  const unavailableSeats = seatIds.filter((seatId) => trip.seatMap.some((seat) => seat.id === seatId && (seat.reserved || seat.blocked)));
  return {
    updatedTrip,
    unavailableSeats
  };
}

const allowedTripTransitions = new Map([
  [tripStatuses.scheduled, [tripStatuses.boarding, tripStatuses.cancelled]],
  [tripStatuses.boarding, [tripStatuses.inProgress, tripStatuses.cancelled]],
  [tripStatuses.inProgress, [tripStatuses.completed, tripStatuses.cancelled]],
  [tripStatuses.completed, []],
  [tripStatuses.cancelled, []]
]);

export function canTransitionTrip(currentStatus, nextStatus) {
  return (allowedTripTransitions.get(currentStatus) ?? []).includes(nextStatus);
}

export function nextDriverState(currentState) {
  if (currentState === driverStatuses.next) {
    return driverStatuses.active;
  }

  if (currentState === driverStatuses.active) {
    return driverStatuses.finished;
  }

  return driverStatuses.finished;
}

export function getTripStatusTone(status) {
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

export function getBookingStateLabel(status) {
  switch (status) {
    case bookingStatuses.confirmed:
      return 'Confirmada';
    case bookingStatuses.pendingPayment:
      return 'Pago pendiente';
    case bookingStatuses.cancelled:
      return 'Cancelada';
    default:
      return 'Borrador';
  }
}
