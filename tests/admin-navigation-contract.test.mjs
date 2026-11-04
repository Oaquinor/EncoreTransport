import assert from 'node:assert/strict';
import fs from 'node:fs';
import { table } from '../apps/admin-dashboard/src/views.mjs';

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
assert.match(app, /function userDirectoryFilters\(\)/);
assert.doesNotMatch(app, /const customers = state\.users\.filter\(/, 'Customers must not filter a paginated page on the client');
assert.match(app, /const customers = state\.users;/, 'Customers must render the server-filtered page directly');
assert.match(app, /api\.users\(userDirectoryFilters\(\)\)/, 'Customer refreshes must preserve the server-side passenger filter');
assert.match(app, /id: 'admin-users', serverPaginated: true/, 'Users must not expose a second client-side pager');
assert.match(app, /id: 'admin-customers', serverPaginated: true/, 'Customers must use only the server-side search and pager');
assert.match(app, /id: 'admin-tickets', serverPaginated: true/, 'Tickets must use only the server-side search and pager');
assert.match(app, /profile-context-bar/, 'Profile must present the implemented account section without unavailable tabs');
assert.doesNotMatch(app, /Security API not available|Preferences API not available|Device sessions API not available/, 'Profile must not expose disabled unavailable tabs');
assert.doesNotMatch(app, /Connected devices|profile-unavailable|not available from the current API/, 'Profile must not advertise an unavailable device-session surface');
assert.doesNotMatch(app, /return to Passenger when you are ready/, 'CMS fallback copy must remain customer-facing and pass the server copy guard');
assert.match(app, /aria-busy="\$\{state\.userDetailLoading \? 'true' : 'false'\}"/, 'User detail exposes loading state while tabs fetch independently');
assert.match(app, /if \(!userId \|\| state\.userDetailLoading\) return;/, 'User detail tabs cannot request an undefined account');
for (const [name, source] of [['app.mjs', app], ['views.mjs', adminViews]]) {
  const missingTypes = [...source.matchAll(/<button\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => !/\btype\s*=/.test(tag));
  assert.equal(missingTypes.length, 0, `${name} contains buttons without an explicit type`);
}
assert.match(css, /admin-nav-group__short/);
assert.match(css, /admin-sidebar\.is-collapsed \.admin-nav-group__toggle \.admin-nav-group__short/);
assert.match(css, /\.button--icon \{[^}]*min-width: 40px/);
assert.match(css, /\.button--icon:hover:not\(:disabled\)/);
assert.match(css, /\.button--icon:focus-visible/);
assert.match(css, /\.button--icon\[aria-label\]::after/);
assert.match(css, /\.table-actions \{[^}]*gap: 10px/);
assert.match(css, /\.admin-controls \.button--icon,\s*\.admin-controls \.admin-notification-button \{ flex: 0 0 40px; width: 40px/);
assert.match(css, /\.admin-table th:last-child,\s*\.admin-table td:last-child \{ position: sticky/);
for (const iconName of ['dashboard', 'ticket', 'report', 'settings', 'view', 'save', 'package', 'bus']) {
  assert.match(icons, new RegExp(`^  ${iconName}:`, 'm'), `missing shared icon: ${iconName}`);
}
assert.match(adminViews, /from '\.\.\/\.\.\/\.\.\/packages\/shared\/icons\.mjs'/, 'Admin views must consume the shared icon system');
const localTable = table('Local table', ['Name'], [['Example']]);
const serverTable = table('Server table', ['Name'], [['Example']], { serverPaginated: true });
assert.match(localTable, /data-table-search/);
assert.match(localTable, /data-table-footer/);
assert.doesNotMatch(serverTable, /data-table-search|data-table-size|data-table-footer/, 'Server-side tables must not expose client-side table controls');

console.log('admin-navigation-contract.test.mjs: OK');
