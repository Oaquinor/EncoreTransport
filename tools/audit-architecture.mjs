import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  process.cwd();

const TARGETS = [
  'apps/website/app.mjs',
  'apps/passenger/src/passenger-app.tsx',
  'apps/driver-pwa/app.mjs',
  'apps/admin-dashboard/app.mjs',
  'apps/admin-dashboard/src/views.mjs',
  'apps/passenger-mobile/App.tsx',
  'apps/driver-mobile/App.tsx',
  'packages/shared/api.mjs',
];

function lineCount(file) {
  const absolute =
    path.join(ROOT, file);

  if (!fs.existsSync(absolute)) {
    return null;
  }

  return fs
    .readFileSync(
      absolute,
      'utf8',
    )
    .split(/\r?\n/)
    .length;
}

function status(
  count,
) {
  if (count == null) return 'missing';
  if (count > 900) return 'split-now';
  if (count > 500) return 'refactor-next';
  return 'healthy';
}

console.log(
  'Encore architecture audit',
);
console.log(
  '==========================',
);

for (const file of TARGETS) {
  const count =
    lineCount(file);

  console.log(
    `${String(count ?? '-').padStart(5)}  ${status(count).padEnd(13)}  ${file}`,
  );
}

const appDirectories = [
  'apps/website',
  'apps/passenger',
  'apps/driver-pwa',
  'apps/admin-dashboard',
  'apps/auth',
  'apps/package-tracking',
];

console.log(
  '\nStyle entrypoints',
);
console.log(
  '=================',
);

for (
  const directory
  of appDirectories
) {
  const css =
    directory === 'apps/passenger'
      ? 'apps/passenger/src/app.css'
      : `${directory}/app.css`;

  console.log(
    `${fs.existsSync(path.join(ROOT, css)) ? 'OK' : 'MISSING'}  ${css}`,
  );
}

console.log(
  '\nExternal closure blockers',
);
console.log(
  '=========================',
);
console.log(
  '- Payment provider: credentials/provider contract still required.',
);
console.log(
  '- Notifications: external provider selection/credentials still required.',
);
console.log(
  '- Production SEO: final public hostname required for absolute canonicals/sitemap.',
);
console.log(
  '- Mobile: real-device/emulator acceptance is still required.',
);
console.log(
  '- Browser E2E: automated browser coverage is not present in the current test suite.',
);
