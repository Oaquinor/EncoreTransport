import {
  requestJson,
} from './core.mjs';

export async function listBookings() {
  const payload =
    await requestJson('/bookings');

  return payload.data ?? [];
}

export async function createBooking(body) {
  const payload =
    await requestJson(
      '/bookings',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

  return payload.data ?? payload;
}

export async function fetchBooking(id) {
  const payload =
    await requestJson(
      `/bookings/${encodeURIComponent(id)}`,
    );

  return payload.data ?? payload;
}

export async function cancelBooking(id) {
  const payload =
    await requestJson(
      `/bookings/${encodeURIComponent(id)}/cancel`,
      { method: 'POST' },
    );

  return payload.data ?? payload;
}

export async function listBookingPayments(id) {
  const payload =
    await requestJson(
      `/bookings/${encodeURIComponent(id)}/payments`,
    );

  return payload.data ?? [];
}

export function initiatePayment(
  id,
  idempotencyKey,
) {
  return requestJson(
    `/bookings/${encodeURIComponent(id)}/payments`,
    {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key:
          idempotencyKey,
      }),
    },
  );
}

export async function fetchTicket(id) {
  const payload =
    await requestJson(
      `/bookings/${encodeURIComponent(id)}/ticket`,
    );

  return payload.data ?? payload;
}

export async function validateTicket(
  publicId,
  token,
) {
  const payload =
    await requestJson(
      '/tickets/validate',
      {
        method: 'POST',
        body: JSON.stringify({
          public_id: publicId,
          token,
        }),
      },
    );

  return payload.data ?? payload;
}
