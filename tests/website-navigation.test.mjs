import assert from 'node:assert/strict';
import fs from 'node:fs';

const pages = [
  ['home', 'apps/website/index.html', '/website/'],
  ['routes', 'apps/website/routes/index.html', '/website/routes/'],
  ['trips', 'apps/website/trips/index.html', '/website/trips/'],
  ['packages', 'apps/website/packages/index.html', '/website/packages/'],
  ['services', 'apps/website/services/index.html', '/website/services/'],
  ['live', 'apps/website/live/index.html', '/website/live/'],
  ['about', 'apps/website/about/index.html', '/website/about/'],
  ['contact', 'apps/website/contact/index.html', '/website/contact/'],
  ['help', 'apps/website/help/index.html', '/website/help/'],
];

const shell = fs.readFileSync('apps/website/site-shell.mjs', 'utf8');
const navigation = fs.readFileSync('apps/website/site-navigation.mjs', 'utf8');
const app = fs.readFileSync('apps/website/app.mjs', 'utf8');

assert.match(shell, /desktopMenu\(labels\.nav\.trips/);
assert.match(shell, /desktopMenu\(labels\.nav\.packages/);
assert.match(shell, /desktopMenu\(labels\.nav\.tracking/);
assert.match(shell, /desktopMenu\(labels\.nav\.company/);
assert.match(shell, /data-locale-switcher/);
assert.match(shell, /encore_site_locale_v1/);
assert.match(shell, /hreflang/);
assert.match(navigation, /pointerenter/);
assert.match(navigation, /event\.key !== 'Escape'/);
assert.match(navigation, /focusout/);
assert.match(app, /new URLSearchParams\(window\.location\.search\)/);
assert.match(app, /location\.href = `\/passenger\/\?\$\{params\.toString\(\)\}`/);

const titles = new Set();
for (const [name, file, canonical] of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title, `${name} must have a title`);
  assert.equal(titles.has(title), false, `${name} must not duplicate another page title`);
  titles.add(title);
  assert.match(html, /<html lang="en">/);
  assert.match(html, new RegExp(`rel="canonical" href="${canonical.replaceAll('/', '\\/')}"`));
  assert.match(html, /data-site-header/);
  assert.match(html, /data-site-mobile-navigation/);
  assert.match(html, /data-site-footer/);
  assert.doesNotMatch(html, /Platform|Journey Control|Open Operations/);
}

console.log('website-navigation.test.mjs: OK');
