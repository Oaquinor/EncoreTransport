import fs from 'node:fs';
import assert from 'node:assert/strict';

const seatMap = fs.readFileSync('apps/passenger/src/seat-map.tsx', 'utf8');
const seatController = fs.readFileSync(
  'backend/laravel/app/Http/Controllers/Api/V1/SeatController.php',
  'utf8',
);

for (const field of [
  'position_index',
  'row_number',
  'accessible',
  'blocked',
  'available',
]) {
  assert.equal(
    seatController.includes(field),
    true,
    `Seat API must expose ${field}.`,
  );
}

assert.equal(
  seatMap.includes('--seat-columns'),
  true,
  'Passenger seat map must derive its column count from persisted seat positions.',
);

assert.equal(
  seatMap.includes('seat.blocked'),
  true,
  'Passenger seat map must distinguish blocked seats.',
);

assert.equal(
  seatMap.includes('seat.accessible'),
  true,
  'Passenger seat map must distinguish accessible seats.',
);

console.log('seat-layout-visual-contract.test.mjs: OK');
