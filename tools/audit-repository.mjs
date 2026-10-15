import fs from 'node:fs';
import path from 'node:path';

const root =
  process.cwd();

const findings = [];

function exists(relative) {
  return fs.existsSync(
    path.join(root, relative),
  );
}

function read(relative) {
  return fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );
}

function lines(relative) {
  if (!exists(relative)) {
    return null;
  }

  return read(relative)
    .split(/\r?\n/)
    .length;
}

function add(
  severity,
  area,
  message,
) {
  findings.push({
    severity,
    area,
    message,
  });
}

const largeFiles = [
  'apps/passenger/src/passenger-app.tsx',
  'apps/passenger-mobile/App.tsx',
  'apps/driver-mobile/App.tsx',
  'apps/driver-pwa/app.mjs',
  'apps/admin-dashboard/app.mjs',
  'apps/admin-dashboard/src/views.mjs',
];

for (
  const file
  of largeFiles
) {
  const count =
    lines(file);

  if (count == null) {
    add(
      'ERROR',
      'repository',
      `${file} is missing.`,
    );

    continue;
  }

  if (count >= 900) {
    add(
      'HIGH',
      'maintainability',
      `${file} has ${count} lines and must be split by screen/domain.`,
    );
  } else if (count >= 500) {
    add(
      'MEDIUM',
      'maintainability',
      `${file} has ${count} lines and should be refactored before new features are added.`,
    );
  }
}

const htmlEntryPoints = [
  'apps/website/index.html',
  'apps/driver-pwa/index.html',
  'apps/admin-dashboard/index.html',
  'apps/auth/index.html',
  'apps/package-tracking/index.html',
];

for (
  const file
  of htmlEntryPoints
) {
  const source =
    read(file);

  const links =
    (
      source.match(
        /rel="stylesheet"/g,
      ) ?? []
    ).length;

  if (links !== 1) {
    add(
      'HIGH',
      'styles',
      `${file} loads ${links} stylesheets; expected one app.css entrypoint.`,
    );
  }
}

const passengerMain =
  read(
    'apps/passenger/src/main.tsx',
  );

const passengerCssImports =
  (
    passengerMain.match(
      /\.css';/g,
    ) ?? []
  ).length;

if (passengerCssImports !== 1) {
  add(
    'HIGH',
    'styles',
    `Passenger main.tsx imports ${passengerCssImports} CSS files; expected one app.css.`,
  );
}

const stalePassengerCss = [
  'apps/passenger/src/passenger-final.css',
  'apps/passenger/src/passenger-integrated.css',
  'apps/passenger/src/vector-seat-map.css',
  'apps/passenger/src/seat-premium.css',
  'apps/passenger/src/seat-reference.css',
];

for (
  const file
  of stalePassengerCss
) {
  if (exists(file)) {
    add(
      'MEDIUM',
      'legacy',
      `${file} is a historical patch layer and should remain archived/not imported.`,
    );
  }
}

const rootPatchScripts =
  fs.readdirSync(root)
    .filter(
      (name) =>
        /^APLICAR_.*\.ps1$/i.test(
          name,
        ),
    );

if (rootPatchScripts.length > 1) {
  add(
    'MEDIUM',
    'repository',
    `${rootPatchScripts.length} historical APLICAR_*.ps1 scripts are still at repository root.`,
  );
}

const duplicateMigrationPrefix =
  fs.readdirSync(
    path.join(
      root,
      'backend/laravel/database/migrations',
    ),
  )
    .filter(
      (name) =>
        name.startsWith(
          '2026_10_08_000200_',
        ),
    );

if (
  duplicateMigrationPrefix.length > 1
) {
  add(
    'HIGH',
    'database',
    `Multiple migrations share 2026_10_08_000200: ${duplicateMigrationPrefix.join(', ')}. Do not rename blindly after deployment; reconcile migration history deliberately.`,
  );
}

const paymentProvider =
  read(
    'backend/laravel/config/encore.php',
  );

if (
  paymentProvider.includes(
    "'unconfigured'",
  )
) {
  add(
    'BLOCKED',
    'payments',
    'Payment gateway defaults to unconfigured. Production payment flow is not complete without an approved provider and credentials.',
  );
}

if (
  exists(
    'packages/shared/mock-data.mjs',
  )
) {
  add(
    'LOW',
    'legacy',
    'packages/shared/mock-data.mjs still exists. Keep it isolated from production apps or archive it.',
  );
}

const config =
  read(
    'packages/shared/app-config.mjs',
  );

if (
  config.includes(
    'Dominican Republic',
  )
) {
  add(
    'DECISION',
    'product-config',
    'Shared defaults still target Dominican Republic/DOP. Confirm the final operating market before production.',
  );
}

const docs =
  fs.readdirSync(
    path.join(root, 'docs'),
  )
    .filter(
      (name) =>
        /\.md$/i.test(name),
    );

if (docs.length > 25) {
  add(
    'MEDIUM',
    'documentation',
    `${docs.length} markdown documents exist at docs root. Archive historical audits so current architecture/status docs are obvious.`,
  );
}

console.log(
  'EncoreTransport internal audit',
);
console.log(
  '================================',
);

for (
  const finding
  of findings
) {
  console.log(
    `[${finding.severity}] ${finding.area}: ${finding.message}`,
  );
}

const blocking =
  findings.filter(
    (item) =>
      [
        'ERROR',
        'HIGH',
        'BLOCKED',
      ].includes(
        item.severity,
      ),
  );

console.log('');
console.log(
  `Total findings: ${findings.length}`,
);
console.log(
  `High/blocking: ${blocking.length}`,
);

if (
  process.argv.includes(
    '--strict',
  ) &&
  blocking.length
) {
  process.exitCode = 1;
}
