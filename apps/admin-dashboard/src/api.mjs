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

export const routes = async () => {
  const payload = await requestJson('/admin/routes');
  return payload.data ?? [];
};

export const saveRoute = async (data, id = null) => {
  const path = id
    ? `/admin/routes/${encodeURIComponent(id)}`
    : '/admin/routes';
  const payload = await requestJson(path, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
  return payload.data ?? payload;
};

export const drivers = async () => {
  const payload = await requestJson('/admin/drivers');
  return payload.data ?? [];
};

export const saveDriver = async (data, id = null) => {
  const payload = await requestJson(id ? `/admin/drivers/${encodeURIComponent(id)}` : '/admin/drivers', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
  return payload.data ?? payload;
};

export const vehicles = async () => {
  const payload = await requestJson('/admin/vehicles');
  return payload.data ?? [];
};

export const saveVehicle = async (data, id = null) => {
  const payload = await requestJson(id ? `/admin/vehicles/${encodeURIComponent(id)}` : '/admin/vehicles', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
  return payload.data ?? payload;
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
