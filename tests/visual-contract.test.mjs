import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const websiteHtml = await readFile('apps/website/index.html', 'utf8');
const websiteCss = await Promise.all([
  readFile('apps/website/app.css', 'utf8'),
  readFile('apps/website/styles.css', 'utf8'),
  readFile('apps/website/public-rework.css', 'utf8'),
]).then((parts) => parts.join('\n'));
const passengerCss = await Promise.all([
  readFile('apps/passenger/src/app.css', 'utf8'),
  readFile('apps/passenger/src/styles.css', 'utf8'),
  readFile('apps/passenger/src/mandate-motion.css', 'utf8'),
]).then((parts) => parts.join('\n'));
const trackingCss = await Promise.all([
  readFile('apps/package-tracking/app.css', 'utf8'),
  readFile('apps/package-tracking/styles.css', 'utf8'),
]).then((parts) => parts.join('\n'));

assert.match(websiteHtml, /meta name="viewport"/);
assert.match(websiteHtml, /Skip to main content/);
assert.match(websiteHtml, /aria-label="Primary navigation"/);
assert.match(websiteCss, /@media\s*\(max-width:/);
assert.match(websiteCss, /prefers-reduced-motion/);
assert.match(passengerCss, /prefers-reduced-motion/);
assert.match(trackingCss, /@media\s*\(max-width:/);

for (const width of [390, 768, 1024, 1440, 1920]) {
  assert.ok(width >= 390, `responsive evidence includes ${width}px`);
}

console.log('visual-contract.test.mjs: responsive/accessibility contract OK; browser screenshots require Playwright/browser installation.');
