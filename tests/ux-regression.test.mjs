import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');

const websiteHtml = read('apps/website/index.html');
const websiteApp = read('apps/website/app.mjs');
const websiteFixes = read('apps/website/mandate-fixes.css');
const websiteEnhancements = read('apps/website/enhancements.mjs');
const adminApp = read('apps/admin-dashboard/app.mjs');
const passengerApp = read('apps/passenger/src/passenger-app.tsx');
const accessController = read('backend/laravel/app/Http/Controllers/Api/V1/AdminAccessController.php');
const seatController = read('backend/laravel/app/Http/Controllers/Api/V1/SeatController.php');

assert.match(websiteHtml, /Staff access/);
assert.match(websiteHtml, /href="\/login\/\?return=\/passenger\/"[^>]*>.*Sign in/);
assert.doesNotMatch(websiteHtml, /Open Operations/);
assert.match(websiteHtml, /id="mobileMenuToggle"/);
assert.match(websiteHtml, /id="mobileNavigation"/);
const primaryNav = websiteHtml.match(/<nav class="nav public-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
assert.deepEqual(
  [...primaryNav.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(([, href, label]) => ({ href, label })),
  [
    { href: '#home', label: 'Home' },
    { href: '#book', label: 'Trips' },
    { href: '#package-tracking', label: 'Packages' },
    { href: '/track-package/', label: 'Tracking' },
    { href: '#faq', label: 'Help' },
  ],
  'Website primary navigation must expose only the five commercial destinations.',
);
assert.doesNotMatch(websiteHtml, /public-quick-rail|id="journey-control"|id="platform"/);
assert.doesNotMatch(websiteHtml, />\s*(?:Platform|Journey control|Journey Control)\s*</, 'Internal platform language must not appear in the public website navigation surface.');

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
assert.match(adminApp, /data-profile-photo-input/);
assert.match(adminApp, /data-user-permission=.*<\/select>/);
assert.doesNotMatch(adminApp, /<input type="checkbox" data-user-role/);
assert.match(accessController, /nullable','boolean/);
assert.match(passengerApp, /Create an account/);
assert.match(passengerApp, /Continue as guest/);
assert.match(passengerApp, /\/auth\/register/);

assert.match(seatController, /COALESCE\(`row_number`, 9999\) ASC/);
assert.match(seatController, /COALESCE\(`position_index`, 9999\) ASC/);

console.log('ux-regression.test.mjs: OK');
