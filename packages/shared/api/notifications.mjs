import { requestJson } from './core.mjs';

export async function listNotifications(options = {}) {
  const query = new URLSearchParams();
  if (options.unread) query.set('unread', '1');
  if (options.limit) query.set('limit', String(options.limit));
  const payload = await requestJson(`/notifications${query.toString() ? `?${query}` : ''}`);
  return { items: payload.data ?? [], unread: payload.unread ?? 0 };
}

export async function markNotificationRead(id) {
  const payload = await requestJson(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  return payload.data ?? payload;
}

export async function markAllNotificationsRead() {
  return requestJson('/notifications/read-all', { method: 'POST' });
}
