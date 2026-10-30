import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:4173';
const outDir = process.env.CAPTURE_OUT_DIR ?? 'artifacts/screenshot-bundle-20261030';
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const heights = { 320: 568, 375: 812, 390: 844, 430: 932, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
const surfaces = [
  ['website', '/website/'],
  ['passenger', '/passenger/'],
  ['driver', '/driver/'],
  ['admin', '/admin/'],
  ['login', '/login/'],
  ['tracking', '/track-package/'],
  ['package-register', '/package-register/'],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password: 'password' }),
  });
  if (!response.ok) throw new Error(`Login failed for ${email}: ${response.status}`);
  const payload = await response.json();
  if (!payload.token) throw new Error(`No token for ${email}`);
  return payload.token;
}

const tokens = {
  admin: await login('admin@example.test'),
  driver: await login('driver@example.test'),
};

const manifest = {
  generatedAt: new Date().toISOString(),
  base,
  resolutions: widths.map((width) => `${width}x${heights[width]}`),
  captures: [],
  failures: [],
  notes: [
    'Capturas generadas con Chromium/Playwright contra el servidor local real.',
    'Las capturas autenticadas usan cuentas demo locales; no se incluyen tokens en archivos.',
    'Passenger cuenta y Admin configuración se capturan como estados adicionales en 1440px y 390px.',
    'Las aplicaciones nativas Passenger Mobile y Driver Mobile no exponen una URL web en este servidor; se documentan como pendientes de captura nativa.',
  ],
};

async function capture(page, filename, surface, width, state) {
  const path = `${outDir}/${filename}`;
  await page.screenshot({ path, fullPage: true, timeout: 60000 });
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path));
  if (stat.size < 10_000) throw new Error(`Visual capture is suspiciously small (${stat.size} bytes): ${filename}`);
  manifest.captures.push({ file: filename, surface, width, height: heights[width], state });
}

async function waitForVisualReady(page, surface) {
  // Allow the app's real API requests and deferred map/image work to settle,
  // without waiting forever on polling connections.
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = [...document.images].filter((image) => image.offsetWidth > 0 && image.offsetHeight > 0);
    await Promise.all(images.map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); })));
    document.documentElement.style.scrollBehavior = 'auto';
  });
  const readySelector = surface === 'admin' ? '.admin-main' : surface === 'driver' ? '.driver-dashboard, main' : 'main, body';
  await page.locator(readySelector).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => {
    const bodyText = document.body?.innerText?.trim() ?? '';
    const loading = [...document.querySelectorAll('[aria-busy="true"], .admin-loading-state, .passenger-boot-screen')]
      .some((element) => element.offsetWidth > 0 && element.offsetHeight > 0);
    return bodyText.length > 120 && !loading;
  }, null, { timeout: 15000 }).catch(() => {});
  // Give deferred API-rendered cards/maps a final paint frame.
  await page.waitForTimeout(1500);
  const visual = await page.evaluate(() => ({
    textLength: document.body?.innerText?.trim().length ?? 0,
    brokenImages: [...document.images].filter((image) => image.offsetWidth > 0 && image.offsetHeight > 0 && !image.complete).length,
    visibleMain: Boolean(document.querySelector('main, .admin-main, .driver-dashboard')),
  }));
  if (visual.textLength < 120 || !visual.visibleMain) throw new Error(`Visual readiness check failed: ${JSON.stringify(visual)}`);
  return visual;
}

for (const [surface, pathname] of surfaces) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: heights[width] }, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    if (surface === 'driver') await page.addInitScript((token) => sessionStorage.setItem('encore_api_token', token), tokens.driver);
    if (surface === 'admin') await page.addInitScript((token) => sessionStorage.setItem('encore_api_token', token), tokens.admin);
    if (surface === 'passenger') await page.addInitScript((token) => sessionStorage.setItem('encore_api_token', token), tokens.admin);
    try {
      const response = await page.goto(`${base}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status() ?? 'none'}`);
      const visual = await waitForVisualReady(page, surface);
      await capture(page, `${surface}-initial-${width}x${heights[width]}.png`, surface, width, surface === 'passenger' ? 'authenticated-initial' : 'initial');
      manifest.captures.at(-1).visualReadiness = visual;
      if (pageErrors.length) manifest.failures.push({ surface, width, state: 'initial', error: pageErrors.join('; ') });
      if (surface === 'passenger' && width === 1440) {
        await page.goto(`${base}/passenger/?screen=account&tab=profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForVisualReady(page, surface);
        await capture(page, 'passenger-account-profile-1440x900.png', surface, width, 'account-profile');
        const settings = page.locator('[data-account-settings], dialog').first();
        if (await settings.count()) {
          await capture(page, 'passenger-account-settings-1440x900.png', surface, width, 'account-settings');
        }
      }
      if (surface === 'passenger' && width === 390) {
        await page.goto(`${base}/passenger/?screen=account&tab=profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForVisualReady(page, surface);
        await capture(page, 'passenger-account-profile-390x844.png', surface, width, 'account-profile-mobile');
      }
      if (surface === 'admin' && width === 1440) {
        const settingsButton = page.locator('#openSettings');
        if (await settingsButton.count()) {
          await settingsButton.click();
          await page.waitForTimeout(500);
          await capture(page, 'admin-settings-1440x900.png', surface, width, 'settings-module');
        }
      }
      if (surface === 'admin' && width === 390) {
        const menuButton = page.locator('[data-admin-menu-toggle], #adminMenuToggle, button[aria-label*="menu" i]').first();
        if (await menuButton.count()) {
          await menuButton.click().catch(() => {});
          await page.waitForTimeout(300);
          await capture(page, 'admin-menu-open-390x844.png', surface, width, 'menu-open');
        }
      }
    } catch (error) {
      const filename = `${surface}-ERROR-${width}x${heights[width]}.txt`;
      await writeFile(`${outDir}/${filename}`, `${error.stack ?? error.message}\n`);
      manifest.failures.push({ surface, width, state: 'initial', error: error.message, file: filename });
    } finally {
      await page.close();
    }
  }
}

await browser.close();
await writeFile(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));
const readme = `# EncoreTransport — paquete de capturas visuales\n\nGenerado: ${manifest.generatedAt}\nServidor: ${base}\n\nCapturas: ${manifest.captures.length}\nFallos registrados: ${manifest.failures.length}\n\nResoluciones: ${manifest.resolutions.join(', ')}\n\nCada archivo indica módulo, estado y resolución. Consulta manifest.json para el inventario completo.\n\nPendiente explícito: las apps nativas Passenger Mobile y Driver Mobile requieren emulador/dispositivo Expo y no exponen rutas web en el servidor 4173.\n`;
await writeFile(`${outDir}/README.md`, readme);
console.log(JSON.stringify({ captures: manifest.captures.length, failures: manifest.failures.length, outDir }, null, 2));
