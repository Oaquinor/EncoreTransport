import fs from 'node:fs';

const file = 'package.json';
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.dependencies ??= {};
pkg.dependencies.leaflet ??= '1.9.4';
pkg.scripts ??= {};
pkg.scripts['test:ux-regression'] = 'node tests/ux-regression.test.mjs';
pkg.scripts['test:map-runtime'] = 'node tests/map-runtime-contract.test.mjs';

const existingTest = String(pkg.scripts.test ?? '').trim();
const required = ['npm run test:ux-regression', 'npm run test:map-runtime'];
let merged = existingTest;
for (const cmd of required) {
  if (!merged.includes(cmd)) merged = merged ? `${merged} && ${cmd}` : cmd;
}
pkg.scripts.test = merged;

if (!pkg.scripts['validate:frontend']) {
  pkg.scripts['validate:frontend'] = 'npm run test && npm run typecheck:api-client && npm run typecheck:passenger && npm run build:passenger';
}

fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
