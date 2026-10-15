import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync('apps/passenger/src/main.tsx', 'utf8');
const seatMap = fs.readFileSync('apps/passenger/src/seat-map.tsx', 'utf8');
const css = fs.readFileSync('apps/passenger/src/passenger-integrated.css', 'utf8');
const server = fs.readFileSync('server.mjs', 'utf8');

assert.match(main, /passenger-integrated\.css/);
assert.match(css, /margin-left:\s*auto/);
assert.match(css, /margin-right:\s*auto/);
assert.match(seatMap, /et-seat-bus__grid/);
assert.match(css, /\.et-seat-bus__grid/);
assert.match(css, /\.et-seat__back/);
assert.match(css, /\.et-seat--selected/);
assert.match(server, /\/login/);
assert.match(server, /apps\/auth/);
assert.match(server, /\/track-package/);
assert.match(server, /apps\/package-tracking/);

console.log('passenger-integration-contract.test.mjs: OK');
