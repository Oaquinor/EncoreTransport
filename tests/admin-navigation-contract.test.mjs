import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = fs.readFileSync('apps/admin-dashboard/src/module-registry.mjs', 'utf8');
const app = fs.readFileSync('apps/admin-dashboard/app.mjs', 'utf8');
const css = fs.readFileSync('apps/admin-dashboard/app.css', 'utf8');
const icons = fs.readFileSync('packages/shared/icons.mjs', 'utf8');
const adminViews = fs.readFileSync('apps/admin-dashboard/src/views.mjs', 'utf8');

for (const group of ['Operations', 'Fleet', 'Clients', 'Paquetería', 'Control', 'System']) {
  assert.match(registry, new RegExp(`group:'${group}'`), `missing admin group: ${group}`);
}
assert.doesNotMatch(registry, /group:'Customer service'|group:'Reports'|group:'Access control'/);
assert.match(app, /data-sidebar-toggle/);
assert.match(app, /data-nav-toggle/);
assert.match(app, /aria-controls="\$\{groupId\}"/);
assert.match(app, /aria-current="page"/);
assert.match(app, /function navGroupId\(group\)/);
assert.match(app, /localStorage\.setItem\('encore_admin_nav_groups_v2'/);
assert.match(css, /admin-nav-group__short/);
assert.match(css, /admin-sidebar\.is-collapsed \.admin-nav-group__toggle \.admin-nav-group__short/);
for (const iconName of ['dashboard', 'ticket', 'report', 'settings', 'view', 'save', 'package', 'bus']) {
  assert.match(icons, new RegExp(`^  ${iconName}:`, 'm'), `missing shared icon: ${iconName}`);
}
for (const iconName of ['ticket', 'package', 'bus']) {
  assert.match(adminViews, new RegExp(`^    ${iconName}:`, 'm'), `missing Admin icon: ${iconName}`);
}

console.log('admin-navigation-contract.test.mjs: OK');
