import assert from 'node:assert/strict';
import fs from 'node:fs';

const seatMap = fs.readFileSync('apps/passenger/src/seat-map.tsx', 'utf8');
const css = fs.readFileSync('apps/passenger/src/vector-seat-map.css', 'utf8');

assert.match(seatMap, /et-seat-bus__grid/);
assert.match(seatMap, /splitAroundAisle/);
assert.match(seatMap, /row_number/);
assert.match(seatMap, /position_index/);
assert.match(seatMap, /LegendItem/);
assert.match(css, /\.et-seat-bus/);
assert.match(css, /\.et-seat--selected/);
assert.match(css, /\.et-seat--accessible/);

console.log('seat-layout-vector-contract.test.mjs: OK');
