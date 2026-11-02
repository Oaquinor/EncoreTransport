import assert from 'node:assert/strict';
import fs from 'node:fs';

const pages = [
  'apps/website/index.html',
  'apps/website/trips/index.html',
  'apps/website/routes/index.html',
  'apps/website/packages/index.html',
  'apps/website/services/index.html',
  'apps/website/live/index.html',
  'apps/website/about/index.html',
  'apps/website/contact/index.html',
  'apps/website/help/index.html',
];

const forbidden = /\b(backend|frontend|endpoint|api|arquitectura|architecture|implementaci[oó]n|par[aá]metros?|contratos?|Passenger\s+(?:Web|Mobile|app|application))\b/i;

for (const path of pages) {
  const html = fs.readFileSync(path, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(html, forbidden, `${path} must use customer-facing language`);
}

const cmsController = fs.readFileSync('backend/laravel/app/Http/Controllers/Api/V1/WebsiteContentController.php', 'utf8');
assert.match(cmsController, /INTERNAL_COPY_PATTERN/);
assert.match(cmsController, /rejectInternalCopy/);

console.log('website-editorial.test.mjs: OK');
