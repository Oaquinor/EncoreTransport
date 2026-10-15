import {
  requestJson,
} from './core.mjs';

function queryString(params = {}) {
  return new URLSearchParams(params);
}

export async function fetchAdminDashboard() {
  const payload =
    await requestJson(
      '/admin/dashboard',
    );

  return payload.data ?? payload;
}

export async function fetchAdminReport(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/reports?${query}`,
    );

  return payload.data ?? payload;
}

export async function fetchTravelReport(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/reports/travel?${query}`,
    );

  return payload.data ?? payload;
}

export async function fetchVehicleReport(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/reports/vehicles?${query}`,
    );

  return payload.data ?? payload;
}

export async function fetchTripReport(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/reports/trips?${query}`,
    );

  return payload.data ?? payload;
}

export async function fetchTripCostReport(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/reports/trip-costs?${query}`,
    );

  return payload.data ?? payload;
}

export async function fetchAdminIncidents() {
  const payload =
    await requestJson(
      '/admin/incidents',
    );

  return payload.data ?? [];
}

export async function updateAdminIncident(
  id,
  status,
) {
  const payload =
    await requestJson(
      `/admin/incidents/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
        }),
      },
    );

  return payload.data ?? payload;
}

export async function fetchAdminSchedules(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/driver-schedules?${query}`,
    );

  return payload.data ?? [];
}

export async function saveAdminSchedule(
  payload,
  id = null,
) {
  const path =
    id
      ? `/admin/driver-schedules/${id}`
      : '/admin/driver-schedules';

  const response =
    await requestJson(
      path,
      {
        method: id
          ? 'PUT'
          : 'POST',
        body: JSON.stringify(payload),
      },
    );

  return response.data ?? response;
}

export async function fetchAdminPackages(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/packages?${query}`,
    );

  return payload.data ?? [];
}

export async function fetchVehicleStatuses(
  params = {},
) {
  const query =
    queryString(params);

  const payload =
    await requestJson(
      `/admin/vehicle-status?${query}`,
    );

  return payload.data ?? [];
}
