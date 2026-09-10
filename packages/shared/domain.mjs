export const tripStatuses = Object.freeze({
  scheduled: 'scheduled',
  boarding: 'boarding',
  inProgress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled'
});

export const driverStatuses = Object.freeze({
  next: 'next',
  active: 'active',
  finished: 'finished'
});

export const bookingStatuses = Object.freeze({
  draft: 'draft',
  pendingPayment: 'pending_payment',
  confirmed: 'confirmed',
  cancelled: 'cancelled'
});

export const inventoryMovementTypes = Object.freeze({
  in: 'in',
  out: 'out',
  adjustment: 'adjustment'
});

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatCurrency(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateLabel(isoDate) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${isoDate}T12:00:00`));
}

export function formatTimeLabel(timeValue) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(`2026-01-01T${timeValue}:00`));
}