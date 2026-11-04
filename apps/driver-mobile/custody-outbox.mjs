export const MAX_CUSTODY_OUTBOX_ITEMS = 12;

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const packageId = Number(item.package_id);
  if (!Number.isInteger(packageId) || packageId <= 0) return null;
  if (item.status !== 'in_progress' || typeof item.queued_at !== 'string') return null;
  return { package_id: packageId, status: 'in_progress', queued_at: item.queued_at };
}

export function isNetworkFailure(error) {
  const status = typeof error === 'object' && error !== null ? Number(error.status) : NaN;
  return status === 0 || status === 408 || status === 502 || status === 503;
}

export function createCustodyOutbox({ storage, key = 'encore_driver_custody_outbox', maxItems = MAX_CUSTODY_OUTBOX_ITEMS, now = () => new Date().toISOString() }) {
  const bounded = (items) => items.slice(-maxItems);
  const read = async () => {
    try {
      const stored = await storage.getItem(key);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? bounded(parsed.map(normalizeItem).filter(Boolean)) : [];
    } catch {
      return [];
    }
  };
  const write = async (items) => storage.setItem(key, JSON.stringify(bounded(items)));
  const enqueue = async (packageId, status = 'in_progress') => {
    if (status !== 'in_progress') throw new Error('Only in_progress can be queued offline.');
    const current = await read();
    const next = current.filter((item) => item.package_id !== Number(packageId)).concat({ package_id: Number(packageId), status, queued_at: now() });
    await write(next);
    return next.length;
  };
  const flush = async (request, activeToken) => {
    const pending = await read();
    const synced = [];
    const rejected = [];
    while (pending.length) {
      const item = pending[0];
      try {
        const payload = await request(item, activeToken);
        synced.push(payload?.data ?? payload);
        pending.shift();
      } catch (error) {
        if (isNetworkFailure(error)) break;
        rejected.push(item);
        pending.shift();
      }
    }
    await write(pending);
    return { remaining: pending.length, synced, rejected };
  };
  return { read, write, enqueue, flush };
}
