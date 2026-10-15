import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('server.mjs','utf8');
const main = fs.readFileSync('apps/passenger/src/main.tsx','utf8');
const seat = fs.readFileSync('apps/passenger/src/seat-map.tsx','utf8');
const css = fs.readFileSync('apps/passenger/src/passenger-final.css','utf8');

assert.match(server, /\['\/login', 'apps\/auth'\]/);
assert.match(server, /\['\/track-package', 'apps\/package-tracking'\]/);
assert.match(server, /export async function startEncoreServer/);
assert.match(main, /import '\.\/passenger-final\.css';/);
assert.match(css, /margin-left:\s*auto/);
assert.match(css, /margin-right:\s*auto/);
assert.match(seat, /et-seat-bus/);
assert.match(css, /\.et-seat-bus/);
assert.match(css, /\.et-seat__back/);
assert.match(css, /\.et-seat--selected/);

console.log('passenger-final-contract.test.mjs: OK');
