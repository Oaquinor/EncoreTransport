import { requestJson } from '../../../packages/shared/api.mjs';

export const dashboard = async () => {
  const payload = await requestJson('/admin/dashboard');
  return payload.data ?? payload;
};

export const saveTrip = async (data, id = null) => {
  const payload = await requestJson(id ? `/admin/trips/${encodeURIComponent(id)}` : '/admin/trips', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
  return payload.data ?? payload;
};

export const cancelTrip = async (id) => {
  const payload = await requestJson(`/admin/trips/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
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

export const cancelBooking = async (id) => {
  const payload = await requestJson(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  return payload.data ?? payload;
};

export const bookingDetails = async (id) => {
  const payload = await requestJson(`/bookings/${encodeURIComponent(id)}`);
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

export const users = async () => (await requestJson('/admin/users')).data ?? [];
export const saveUser = async (data, id = null) => {
  const payload = await requestJson(id ? `/admin/users/${encodeURIComponent(id)}` : '/admin/users', {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(data),
  });
  return payload.data ?? payload;
};
export const disableUser = async (id) => {
  const payload = await requestJson(`/admin/users/${encodeURIComponent(id)}/disable`, { method: 'POST' });
  return payload.data ?? payload;
};
export const roles = async () => (await requestJson('/admin/roles')).data ?? [];
export const updateRole = async (id, data) => {
  const payload = await requestJson(`/admin/roles/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(data),
  });
  return payload.data ?? payload;
};
export const permissions = async () => (await requestJson('/admin/permissions')).data ?? [];

export const settings = async () => (await requestJson('/admin/settings')).data ?? {};
export const saveEmailSettings = async (data) => (await requestJson('/admin/settings/email', {
  method: 'PUT', body: JSON.stringify(data),
})).data ?? {};

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

export const deactivateRoute = async (id) => {
  const payload = await requestJson(`/admin/routes/${encodeURIComponent(id)}/deactivate`, { method: 'POST' });
  return payload.data ?? payload;
};

export const uploadRouteImage = async (id, image) => {
  const form = new FormData(); form.append('image', image);
  const payload = await requestJson(`/admin/routes/${encodeURIComponent(id)}/image`, { method: 'POST', body: form });
  return payload.data ?? payload;
};
export const deleteRouteImage = async (id) => (await requestJson(`/admin/routes/${encodeURIComponent(id)}/image`, { method: 'DELETE' })).data ?? {};
export const websiteContent = async () => (await requestJson('/admin/website-content')).data ?? {};
export const websiteMedia = async () => (await requestJson('/admin/website-content/media')).data ?? [];
export const saveWebsiteDraft = async (data) => (await requestJson('/admin/website-content/draft', { method: 'PUT', body: JSON.stringify(data) })).data ?? {};
export const publishWebsiteContent = async (data) => (await requestJson('/admin/website-content/publish', { method: 'PUT', body: JSON.stringify(data) })).data ?? {};
export const uploadWebsiteMedia = async (section, image) => {
  const form = new FormData();
  form.append('section', section);
  form.append('image', image);
  return (await requestJson('/admin/website-content/media', { method: 'POST', body: form })).data ?? {};
};
export const deleteWebsiteMedia = async (imagePath) => (await requestJson('/admin/website-content/media', {
  method: 'DELETE', body: JSON.stringify({ image_path: imagePath }),
})).data ?? {};

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

export const uploadDriverPhoto = async (id, photo) => {
  const form = new FormData();
  form.append('photo', photo);
  const payload = await requestJson(`/admin/drivers/${encodeURIComponent(id)}/photo`, {
    method: 'POST',
    body: form,
  });
  return payload.data ?? payload;
};

export const deactivateDriver = async (id) => {
  const payload = await requestJson(`/admin/drivers/${encodeURIComponent(id)}/deactivate`, { method: 'POST' });
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
    bookings: '/bookings',
    revenue: '/revenue',
    incidents: '/incidents',
    packages: '/packages',
    schedules: '/schedules',
    'trip-costs': '/trip-costs',
  }[type] ?? '';

  const query = new URLSearchParams(params);
  const payload = await requestJson(`/admin/reports${suffix}?${query}`);

  return payload.data ?? payload;
};
