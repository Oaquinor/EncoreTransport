import { createRequire } from 'node:module';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const normalizedRoot = fileURLToPath(new URL('..', import.meta.url));
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

function runNpm(args, cwd = normalizedRoot) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath
    ? process.execPath
    : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const commandArgs = npmExecPath
    ? [npmExecPath, ...args]
    : args;

  return spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
}

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
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'encore-rollup-'));
  const temporaryPackagePath = join(
    temporaryDirectory,
    'node_modules',
    ...packageName.split('/'),
  );
  const targetPackagePath = join(
    normalizedRoot,
    'node_modules',
    ...packageName.split('/'),
  );

  try {
    const result = runNpm([
      'install',
      '--include=optional',
      '--workspaces=false',
      '--no-save',
      '--package-lock=false',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      `${packageName}@${rollupVersion}`,
    ], temporaryDirectory);

    if (result.error || result.status !== 0) {
      console.error(`Unable to install ${packageName}. ${result.error?.message ?? ''}`.trim());
      process.exit(result.status ?? 1);
    }

    await cp(temporaryPackagePath, targetPackagePath, { recursive: true });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }

  try {
    require.resolve(packageName, { paths: [normalizedRoot] });
  } catch {
    console.error(`The Rollup binary ${packageName} is still unavailable after installation.`);
    process.exit(1);
  }
}
