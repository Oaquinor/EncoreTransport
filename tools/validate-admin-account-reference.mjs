import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4173';
const out = 'artifacts/reference-implementation-20261030';
await mkdir(out, { recursive: true });
const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.test', password: 'password' }) }).then((r) => r.json());
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [width, height, name] of [[1440,900,'desktop'],[1024,768,'tablet'],[390,844,'mobile']]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript((token) => sessionStorage.setItem('encore_api_token', token), login.token);
  await page.goto(`${base}/admin/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('.admin-user-chip').click();
  await page.waitForSelector('.profile-module');
  await page.screenshot({ path: `${out}/REF_01_ACCOUNT_ADMIN_${name}_${width}x${height}.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  results.push({ name, width, height, overflow: overflow.width - overflow.viewport });
  if (name === 'desktop') {
    await page.locator('#changeProfilePhotoSecondary').click();
    await page.waitForSelector('#profilePhotoDialog');
    await page.screenshot({ path: `${out}/REF_04_MODAL_CAMBIAR_FOTO_1440x900.png`, fullPage: true });
    await page.locator('#profilePhotoDialogInput').setInputFiles('artifacts/reference-mandate-20261030/01_REFERENCIAS_OBJETIVO/REF_01_CUENTA_ADMIN_DESKTOP.png');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/REF_05_MODAL_RECORTAR_FOTO_1440x900.png`, fullPage: true });
    await page.locator('button[value="cancel"]').first().click();
    await page.locator('#deleteProfile').click();
    await page.waitForSelector('#deleteProfileDialog');
    await page.screenshot({ path: `${out}/REF_06_MODAL_ELIMINAR_CUENTA_1440x900.png`, fullPage: true });
    await page.locator('#deleteConfirmation').fill('DELETE');
    await page.locator('button[value="cancel"]').first().click();
    await page.locator('input[name="name"]').fill('Operations Admin');
    await page.locator('#profileForm button[type="submit"]').click();
    await page.waitForSelector('.profile-dialog--success');
    await page.screenshot({ path: `${out}/REF_07_ESTADO_GUARDADO_1440x900.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ results }, null, 2));
