import fs from 'node:fs';
import assert from 'node:assert/strict';

const seatMap =
  fs.readFileSync(
    'apps/passenger/src/seat-map.tsx',
    'utf8',
  );

const seatController =
  fs.readFileSync(
    'backend/laravel/app/Http/Controllers/Api/V1/SeatController.php',
    'utf8',
  );

for (
  const field
  of [
    'position_index',
    'row_number',
    'accessible',
    'blocked',
    'available',
  ]
) {
  assert.equal(
    seatController.includes(field),
    true,
    `Seat API must expose ${field}.`,
  );

  assert.equal(
    seatMap.includes(field),
    true,
    `Passenger seat map must consume ${field}.`,
  );
}

assert.match(
  seatMap,
  /<svg/,
  'Passenger seat map must render as SVG.',
);

assert.match(
  seatMap,
  /viewBox=/,
  'Passenger seat map must use a scalable viewBox.',
);

assert.match(
  seatMap,
  /splitAroundAisle/,
  'Passenger seat map must derive the aisle from persisted seat positions.',
);

assert.match(
  seatMap,
  /FRONT DOOR/,
);

assert.match(
  seatMap,
  /AISLE/,
);

assert.match(
  seatMap,
  /EXIT/,
);

assert.doesNotMatch(
  seatMap,
  /className="et-seat/,
  'Seat rendering must not depend on an external CSS class contract.',
);

console.log(
  'seat-layout-visual-contract.test.mjs: OK',
);
