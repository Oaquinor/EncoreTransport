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
) {
  const payload =
    await requestJson(
      `/driver/packages/${id}/status`,
      {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes,
        }),
      },
    );

  return payload.data ?? payload;
}
