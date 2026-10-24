import fs from 'node:fs';
import assert from 'node:assert/strict';

const packageJson = JSON.parse(
  fs.readFileSync(
    'apps/driver-mobile/package.json',
    'utf8',
  ),
);

const appJson = JSON.parse(
  fs.readFileSync(
    'apps/driver-mobile/app.json',
    'utf8',
  ),
);

const app = fs.readFileSync(
  'apps/driver-mobile/App.tsx',
  'utf8',
);

assert.equal(
  packageJson.dependencies?.['expo-location'],
  '57.0.21',
  'Driver Mobile must use the Expo SDK 57 compatible expo-location package.',
);

assert.equal(
  app.includes("import * as Location from 'expo-location';"),
  true,
);

assert.equal(
  app.includes('requestForegroundPermissionsAsync'),
  true,
);

assert.equal(
  app.includes('getCurrentPositionAsync'),
  true,
);

assert.equal(
  app.includes('watchPositionAsync'),
  true,
);

assert.equal(
  app.includes("'/driver/locations'"),
  true,
);

assert.match(
  app,
  /rawRequest\(\s*`\/trips\/\$\{activeTrip\.id\}\/location`,\s*\{\},\s*activeToken/,
  'Driver Mobile must authenticate its private trip-location request.',
);

assert.equal(
  app.includes("['boarding', 'in_progress']"),
  true,
  'GPS sending must remain restricted to operational trip states.',
);

assert.equal(
  app.includes('latitude: 18.') ||
  app.includes('longitude: -69.'),
  false,
  'Driver Mobile must not contain a hard-coded fake current GPS position.',
);

const locationPlugin = appJson.expo.plugins.find(
  (plugin) =>
    Array.isArray(plugin) &&
    plugin[0] === 'expo-location',
);

assert.ok(
  locationPlugin,
  'Driver Mobile must configure the expo-location plugin.',
);

console.log('native-gps-contract.test.mjs: OK');
