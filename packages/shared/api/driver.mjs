import {
  requestJson,
} from './core.mjs';

export async function fetchDriverProfile() {
  const payload =
    await requestJson('/driver/me');

  return payload.data ?? payload;
}

export async function fetchDriverTrip() {
  const payload =
    await requestJson(
      '/driver/trips/current',
    );

  return payload.data ?? null;
}

export async function fetchDriverPassengers(
  tripId,
) {
  const payload =
    await requestJson(
      `/driver/trips/${tripId}/passengers`,
    );

  return payload.data ?? [];
}

export async function startDriverTrip(
  tripId,
) {
  const payload =
    await requestJson(
      `/driver/trips/${tripId}/start`,
      { method: 'POST' },
    );

  return payload.data ?? payload;
}

export async function completeDriverTrip(
  tripId,
) {
  const payload =
    await requestJson(
      `/driver/trips/${tripId}/complete`,
      { method: 'POST' },
    );

  return payload.data ?? payload;
}

export async function boardPassenger(
  tripId,
  passengerId,
) {
  const payload =
    await requestJson(
      `/driver/trips/${tripId}/passengers/${passengerId}/board`,
      { method: 'POST' },
    );

  return payload.data ?? payload;
}

export async function sendDriverLocation(
  payload,
) {
  const response =
    await requestJson(
      '/driver/locations',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

  return response.data ?? response;
}

export async function createIncident(
  payload,
) {
  const response =
    await requestJson(
      '/driver/incidents',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

  return response.data ?? response;
}

export async function fetchDriverSchedule() {
  const payload =
    await requestJson(
      '/driver/schedule',
    );

  return payload.data ?? [];
}

export async function updateVehicleStatus(
  payload,
) {
  const response =
    await requestJson(
      '/driver/vehicle-status',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

  return response.data ?? response;
}

export async function createPackage(
  payload,
) {
  const response =
    await requestJson(
      '/driver/packages',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

  return response.data ?? response;
}

export async function updatePackageStatus(
  id,
  status,
  notes = '',
  { recipientVerified = false, deliveryPhoto = null } = {},
) {
  const body = new FormData();
  body.set('status', status);
  body.set('notes', notes);
  if (recipientVerified) body.set('recipient_verified', '1');
  if (deliveryPhoto) body.set('delivery_photo', deliveryPhoto);

  const payload =
    await requestJson(
      `/driver/packages/${id}/status`,
      {
        method: 'POST',
        body,
      },
    );

  return payload.data ?? payload;
}

export async function scanPackageQr(qrToken) {
  const payload = await requestJson('/driver/packages/scan', { method: 'POST', body: JSON.stringify({ qr_token: qrToken }) });
  return payload.data ?? payload;
}

export async function createPackageManifest(payload) {
  const response = await requestJson('/driver/manifests', { method: 'POST', body: JSON.stringify(payload) });
  return response.data ?? response;
}

export async function fetchPackageManifest(id) {
  const response = await requestJson(`/driver/manifests/${id}`);
  return response.data ?? response;
}

export async function scanPackageManifest(id, qrToken) {
  const response = await requestJson(`/driver/manifests/${id}/scan`, { method: 'POST', body: JSON.stringify({ qr_token: qrToken }) });
  return response.data ?? response;
}

export async function reconcilePackageManifest(id) {
  const response = await requestJson(`/driver/manifests/${id}/reconcile`, { method: 'POST' });
  return response.data ?? response;
}

export async function recordPackageDiscrepancy(id, type, notes) {
  const response = await requestJson(`/driver/packages/${id}/discrepancy`, { method: 'POST', body: JSON.stringify({ type, notes }) });
  return response.data ?? response;
}

export async function requestPackageTransfer(id, toDriverId, notes = '') {
  const response = await requestJson(`/driver/packages/${id}/transfer`, { method: 'POST', body: JSON.stringify({ to_driver_id: Number(toDriverId), notes }) });
  return response.data ?? response;
}

export async function acceptPackageTransfer(id) {
  const response = await requestJson(`/driver/package-transfers/${id}/accept`, { method: 'POST' });
  return response.data ?? response;
}
