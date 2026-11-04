import assert from 'node:assert/strict';
import { createCustodyOutbox, isNetworkFailure } from '../apps/driver-mobile/custody-outbox.mjs';

const values = new Map();
const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) };
const outbox = createCustodyOutbox({ storage, now: () => '2026-11-03T20:00:00.000Z' });

assert.equal(isNetworkFailure({ status: 503 }), true);
assert.equal(isNetworkFailure({ status: 422 }), false);
assert.equal(await outbox.enqueue(41), 1);
assert.equal(await outbox.enqueue(41), 1);
assert.equal(await outbox.enqueue(42), 2);
assert.equal((await outbox.read()).length, 2);

const offline = await outbox.flush(async () => { throw { status: 503 }; }, 'token');
assert.equal(offline.remaining, 2);
assert.equal(offline.rejected.length, 0);

const requests = [];
const recovered = await outbox.flush(async (item, token) => {
  requests.push({ item, token });
  if (item.package_id === 42) throw { status: 422 };
  return { data: { id: item.package_id, status: 'in_progress' } };
}, 'real-token');
assert.deepEqual(recovered.synced, [{ id: 41, status: 'in_progress' }]);
assert.deepEqual(recovered.rejected.map((item) => item.package_id), [42]);
assert.equal(requests[0].token, 'real-token');
assert.deepEqual(await outbox.read(), []);

console.log('driver-custody-outbox.test.mjs: OK');
