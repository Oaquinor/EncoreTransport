import fs from 'node:fs';
import assert from 'node:assert/strict';

const passenger = fs.readFileSync('apps/passenger-mobile/App.tsx', 'utf8');
const driver = fs.readFileSync('apps/driver-mobile/App.tsx', 'utf8');

for (const [source, label] of [[passenger, 'Passenger'], [driver, 'Driver']]) {
  assert.match(source, /Ionicons/, `${label} Mobile must use the shared icon language.`);
  assert.match(source, /borderRadius:\s*(2[246]|30)/, `${label} Mobile must retain the rounded product geometry.`);
  assert.doesNotMatch(source, /<Text>/, `${label} Mobile must not fall back to unreadable default text on dark surfaces.`);
}

assert.match(passenger, /styles\.hero/);
assert.match(passenger, /styles\.searchPanel/);
assert.match(passenger, /styles\.quickStrip/);
assert.match(driver, /styles\.loginHero/);
assert.match(driver, /styles\.opsBanner/);
assert.match(driver, /styles\.opsMetrics/);
assert.match(driver, /expo-network/);
assert.match(driver, /addNetworkStateListener/);
assert.match(driver, /Sin conexión\. El GPS puede quedar en cola/);
assert.match(driver, /encore_driver_custody_outbox/);
assert.match(driver, /Carga guardada para sincronizar cuando vuelva Internet/);
assert.match(driver, /todavía no está confirmada/);
assert.match(driver, /flushCustodyOutbox/);
assert.match(driver, /El backend rechazó la transición de custodia/);

console.log('mobile-visual-contract.test.mjs: OK');
