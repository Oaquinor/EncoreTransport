import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const laravelRoot = resolve(repositoryRoot, 'backend', 'laravel');
const artisan = resolve(laravelRoot, 'artisan');
const seeder = 'Database\\Seeders\\Demo\\EncoreTransportDemoSeeder';

if (!existsSync(artisan)) {
  throw new Error(`Laravel artisan was not found at ${artisan}`);
}

const candidates = [
  process.env.PHP_BINARY,
  'php',
  ...(process.platform === 'win32'
    ? ['C:\\laragon\\bin\\php\\php-8.3.30-Win32-vs16-x64\\php.exe']
    : ['/opt/lampp/bin/php', '/usr/local/bin/php']),
].filter(Boolean);

for (const php of [...new Set(candidates)]) {
  const result = spawnSync(php, ['artisan', 'db:seed', `--class=${seeder}`, '--no-interaction'], {
    cwd: laravelRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });

  if (result.error?.code === 'ENOENT') continue;
  if (result.error) throw result.error;
  if (result.status === 0) {
    console.log(`Visual demo data prepared with ${php}.`);
    process.exit(0);
  }
  process.exit(result.status ?? 1);
}

throw new Error('PHP was not found. Set PHP_BINARY or install PHP (Laragon is supported on Windows).');
