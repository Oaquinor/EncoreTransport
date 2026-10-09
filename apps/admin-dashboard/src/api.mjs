import { requestJson } from '../../../packages/shared/api.mjs';

export const dashboard = async () => {
  const payload = await requestJson('/admin/dashboard');
  return payload.data ?? payload;
};

export const incidents = async () => {
  const payload = await requestJson('/admin/incidents');
  return payload.data ?? [];
};

export const updateIncident = async (id, changes) => {
  const payload = await requestJson(`/admin/incidents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  return payload.data ?? payload;
};

export const schedules = async () => {
  const payload = await requestJson('/admin/driver-schedules');
  return payload.data ?? [];
};

export const saveSchedule = async (data, id = null) => {
  const path = id
    ? `/admin/driver-schedules/${encodeURIComponent(id)}`
    : '/admin/driver-schedules';

  const payload = await requestJson(path, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });

  return payload.data ?? payload;
};

export const packages = async () => {
  const payload = await requestJson('/admin/packages');
  return payload.data ?? [];
};

export const vehicleStatus = async () => {
  const payload = await requestJson('/admin/vehicle-status');
  return payload.data ?? [];
};

export const report = async (type, params = {}) => {
  const suffix = {
    executive: '',
    travel: '/travel',
    vehicles: '/vehicles',
    trips: '/trips',
    'trip-costs': '/trip-costs',
  }[type] ?? '';

  const query = new URLSearchParams(params);
  const payload = await requestJson(`/admin/reports${suffix}?${query}`);

  return payload.data ?? payload;
};
