import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const require = createRequire(import.meta.url);
const repositoryRoot = join(new URL('..', import.meta.url).pathname);
const normalizedRoot = decodeURIComponent(repositoryRoot.replace(/^\/+([A-Za-z]):/, '$1:'));
const nativePackages = {
  win32: {
    x64: '@rollup/rollup-win32-x64-msvc',
    arm64: '@rollup/rollup-win32-arm64-msvc',
    ia32: '@rollup/rollup-win32-ia32-msvc',
  },
  linux: {
    x64: '@rollup/rollup-linux-x64-gnu',
    arm64: '@rollup/rollup-linux-arm64-gnu',
  },
  darwin: {
    x64: '@rollup/rollup-darwin-x64',
    arm64: '@rollup/rollup-darwin-arm64',
  },
};

const packageName = nativePackages[process.platform]?.[process.arch];

if (!packageName) {
  process.exit(0);
}

try {
  require.resolve(packageName, { paths: [normalizedRoot] });
  process.exit(0);
} catch {
  const lockPath = join(normalizedRoot, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const rollupEntry = lock.packages?.['node_modules/rollup'];
  const rollupVersion = rollupEntry?.version;

  if (!rollupVersion) {
    console.error(`Rollup native dependency ${packageName} is missing and its version is not present in package-lock.json.`);
    process.exit(1);
  }

  console.warn(`Installing missing optional Rollup binary ${packageName}@${rollupVersion} for ${process.platform}/${process.arch}…`);
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    [
      'install',
      '--include=optional',
      '--no-save',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    {
      cwd: normalizedRoot,
      stdio: 'inherit',
      shell: false,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  try {
    require.resolve(packageName, { paths: [normalizedRoot] });
  } catch {
    console.error(`npm completed but ${packageName} is still unavailable. Remove only node_modules and run npm install again on this platform.`);
    process.exit(1);
  }
}
