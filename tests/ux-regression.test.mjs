import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');

const websiteHtml = read('apps/website/index.html');
const websiteApp = read('apps/website/app.mjs');
const websiteFixes = read('apps/website/mandate-fixes.css');
const websiteEnhancements = read('apps/website/enhancements.mjs');
const adminApp = read('apps/admin-dashboard/app.mjs');
const seatController = read('backend/laravel/app/Http/Controllers/Api/V1/SeatController.php');

assert.match(websiteHtml, /Staff access/);
assert.doesNotMatch(websiteHtml, />Sign in\s*</);
assert.doesNotMatch(websiteHtml, /Open Operations/);
assert.match(websiteHtml, /id="mobileMenuToggle"/);
assert.match(websiteHtml, /id="mobileNavigation"/);

assert.match(websiteApp, /prefers-reduced-motion/);
assert.match(websiteApp, /IntersectionObserver/);
assert.match(websiteApp, /motion-ready/);
assert.match(websiteApp, /aria-expanded/);
assert.match(websiteFixes, /\[data-reveal\]\s*\{\s*opacity:\s*1/);
assert.match(websiteFixes, /html\.motion-ready \[data-reveal\]/);

assert.doesNotMatch(
  websiteEnhancements,
  /card\.style\.transform/,
  'Pointer effects must not overwrite reveal transforms.',
);

assert.match(adminApp, /state\.loading = false;\s*state\.accessDenied = true;/);
assert.match(adminApp, /Operations is restricted to administrative accounts/);

assert.match(seatController, /COALESCE\(`row_number`, 9999\) ASC/);
assert.match(seatController, /COALESCE\(`position_index`, 9999\) ASC/);

console.log('ux-regression.test.mjs: OK');
