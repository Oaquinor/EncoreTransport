import assert from 'node:assert/strict';
import fs from 'node:fs';

const source =
  fs.readFileSync(
    'apps/passenger/src/seat-map.tsx',
    'utf8',
  );

assert.match(
  source,
  /export function SeatMap/,
);

assert.match(
  source,
  /export type SeatDto/,
);

assert.match(
  source,
  /<svg/,
);

assert.match(
  source,
  /VectorSeat/,
);

assert.match(
  source,
  /viewBox=/,
);

assert.match(
  source,
  /FRONT DOOR/,
);

assert.match(
  source,
  /AISLE/,
);

assert.match(
  source,
  /EXIT/,
);

assert.doesNotMatch(
  source,
  /className="et-seat/,
  'The final seat map must not depend on external et-seat CSS classes.',
);

console.log(
  'passenger-seatmap-svg-contract.test.mjs: OK',
);
