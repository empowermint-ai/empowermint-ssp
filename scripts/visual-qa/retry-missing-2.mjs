import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'https://plan.empowermint.co.za';
const OUT_DIR = process.argv[2];
const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 900 },
];
const THEMES = ['light', 'dark'];

async function shoot(page, outDir, name, viewport, theme) {
  const dir = path.join(outDir, viewport.name, theme);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch();
  let mobileCounter = 0;

  // --- register/step2: fresh registration, step 1 only (mobile + password), no persisted account ---
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      mobileCounter += 1;
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme });
      try {
        await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
        // 9-digit SA mobile shape 8X XXX XXXX, unique per iteration via the last 4 digits.
        const localMobile = `83999${String(9000 + mobileCounter)}`;
        const formatted = `${localMobile.slice(0, 2)} ${localMobile.slice(2, 5)} ${localMobile.slice(5)}`;
        await page.getByPlaceholder('e.g. thabo_m').fill(`qatester${viewport.name}${theme}`.slice(0, 20));
        await page.getByPlaceholder('83 123 4567').click();
        await page.getByPlaceholder('83 123 4567').fill(formatted);
        await page.getByPlaceholder('Min 6 characters').fill('TestPass123!');
        await Promise.all([
          page.waitForURL('**/register/step2', { timeout: 10000 }).catch(() => {}),
          page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 8000 }),
        ]);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(400);
        console.log('register step2 landed on', page.url());
        await shoot(page, OUT_DIR, '15-register-step2', viewport, theme);
        console.log(`OK ${viewport.name}/${theme}/15-register-step2`);
      } catch (err) {
        console.log(`FAIL ${viewport.name}/${theme}/15-register-step2: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }

  await browser.close();
}

main();
