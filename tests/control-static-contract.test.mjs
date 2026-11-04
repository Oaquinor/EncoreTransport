import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'apps/website',
  'apps/admin-dashboard',
  'apps/package-tracking',
  'apps/package-register',
  'apps/driver-pwa',
  'apps/passenger/src',
  'packages/shared',
  'packages/ui/src',
];
const read = (file) => fs.readFileSync(file, 'utf8');

const websiteApp = read('apps/website/app.mjs');
assert.match(websiteApp, /querySelector\('\[data-action-label\]'\)/, 'Website loading states must update the visible label without replacing the icon');
assert.doesNotMatch(websiteApp, /submit\.lastChild\.textContent/, 'Website submit loading state must not mutate the SVG icon');
const websiteShell = read('apps/website/site-shell.mjs');
assert.match(websiteShell, /icon\('user'\)/, 'Website account access must use the shared icon system');
assert.match(websiteShell, /class="button site-menu__button"/, 'Website desktop menu triggers must use the canonical button base class');
assert.match(websiteShell, /class="button site-mobile-menu__button"/, 'Website mobile menu triggers must use the canonical button base class');
assert.match(websiteShell, /class="button mobile-menu-toggle"/, 'Website mobile navigation toggle must use the canonical button base class');
const websiteControlSources = [
  'apps/website/index.html',
  'apps/website/routes/index.html',
  'apps/website/trips/index.html',
  'apps/website/packages/index.html',
  'apps/website/about/index.html',
  'apps/website/help/index.html',
  'apps/website/routes-page.mjs',
  'apps/website/app.mjs',
  'apps/website/site-shell.mjs',
].map(read);
for (const source of websiteControlSources) {
  for (const match of source.matchAll(/class="([^"]*\bbtn(?:-[\w-]+)?\b[^"]*)"/g)) {
    assert.match(match[1], /\bbutton\b/, `Website control ${match[1]} must include canonical button class`);
  }
}
assert.match(websiteShell, /class="button button--ghost button--with-icon public-account-link"/, 'Website account access must use the canonical ghost control classes');
assert.match(websiteShell, /class="button button--primary public-passenger-link"/, 'Website passenger access must use the canonical primary control class');
assert.match(websiteShell, /class="button button--primary button--with-icon public-footer__primary-link"/, 'Website footer primary action must use the canonical primary control classes');
const authShell = read('apps/auth/index.html');
assert.match(authShell, /class="button button--primary button--with-icon premium-auth-submit"/, 'Authentication submit must use the canonical primary control classes');
const adminApp = read('apps/admin-dashboard/app.mjs');
assert.match(adminApp, /class="button admin-sidebar-toggle"/, 'Admin sidebar toggle must participate in the canonical control system');
assert.match(adminApp, /class="button button--icon admin-notification-button"/, 'Admin notification control must use the canonical icon control class');
assert.match(adminApp, /class="button button--ghost admin-user-chip"/, 'Admin user menu trigger must use the canonical ghost control class');
assert.match(adminApp, /class="module-view__header report-module-header"/, 'Admin reports must use the structured analysis header layout');
assert.match(adminApp, /class="report-type-control"/, 'Admin reports must label the report view selector');
const packageRegisterApp = read('apps/package-register/app.mjs');
assert.doesNotMatch(packageRegisterApp, /submitButton\.textContent/, 'Package registration loading state must not replace its icon');
const packageRegisterShell = read('apps/package-register/index.html');
assert.match(packageRegisterShell, /href="\/packages\/shared\/styles\.css"/, 'Package registration must load the shared base styles before local controls');
assert.match(packageRegisterShell, /href="\/packages\/shared\/design-system\.css"/, 'Package registration must load the shared design tokens before local controls');
assert.match(packageRegisterShell, /id="submitButton" class="button button--primary primary-button button--with-icon"/, 'Package registration submit must use the canonical primary control classes');
assert.match(packageRegisterShell, /id="trackingLink" class="button button--ghost secondary-button button--with-icon"/, 'Package tracking link must use the canonical ghost control classes');
assert.match(packageRegisterShell, /id="copyTrackingLink" class="button button--ghost secondary-button button--with-icon"/, 'Package copy action must use the canonical ghost control classes');
const extensions = new Set(['.html', '.mjs', '.js', '.tsx', '.jsx', '.ts']);
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') walk(filePath);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }
}

roots.forEach(walk);

const missingTypes = [];
const unlabeledIconButtons = [];
const iconClassWithoutIcon = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/<button[^>]*>/g)) {
    const tag = match[0];
    const nearby = tag + source.slice(match.index, match.index + 600);
    if (!tag.includes('type=')) missingTypes.push({ file, tag });
    if (tag.includes('button--icon') && !tag.includes('aria-label=') && !tag.includes('title=')) {
      unlabeledIconButtons.push({ file, tag });
    }
    if ((tag.includes('button--with-icon') || tag.includes('btn-with-icon'))
      && !nearby.includes('<svg')
      && !nearby.includes('${icon(')
      && !nearby.includes('<ActionIcon')
      && !nearby.includes('icon(')) {
      iconClassWithoutIcon.push({ file, tag });
    }
  }
}

assert.deepEqual(missingTypes, [], `Buttons without explicit type: ${JSON.stringify(missingTypes)}`);
assert.deepEqual(unlabeledIconButtons, [], `Icon-only buttons without accessible label: ${JSON.stringify(unlabeledIconButtons)}`);
assert.deepEqual(iconClassWithoutIcon, [], `Buttons with an icon class but no icon markup: ${JSON.stringify(iconClassWithoutIcon)}`);

console.log(`control-static-contract.test.mjs: OK — ${files.length} source files checked`);
