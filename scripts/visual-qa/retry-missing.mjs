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

function formatLocalMobile(mobile) {
  const digits = mobile.replace('+27', '');
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

async function shoot(page, outDir, name, viewport, theme) {
  const dir = path.join(outDir, viewport.name, theme);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch();

  // Timer screen
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.getByPlaceholder('83 123 4567').fill(formatLocalMobile(process.env.ONBOARDED_MOBILE));
      await page.locator('input[type="password"]').fill(process.env.ONBOARDED_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      await page.goto(`${BASE_URL}/timer/${process.env.TIMER_PLAN_ID}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await shoot(page, OUT_DIR, '11-focus-timer', viewport, theme);
      console.log(`OK ${viewport.name}/${theme}/11-focus-timer`);
      await ctx.close();
    }
  }

  // Subjects-rank screen
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      // The fresh account accumulates a subject each run - wipe it clean first
      // so every iteration starts from the same empty-onboarding state.
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/subjects?user_id=eq.${process.env.FRESH_USER_ID}`,
        {
          method: 'DELETE',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme });
      try {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await page.getByPlaceholder('83 123 4567').fill(formatLocalMobile(process.env.FRESH_MOBILE));
        await page.locator('input[type="password"]').fill(process.env.FRESH_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('e.g. Mathematics').click();
        await page.getByPlaceholder('e.g. Mathematics').fill('Mathematics');
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Mathematics', exact: true }).first().click({ timeout: 8000 });
        await page.waitForTimeout(300);
        await Promise.all([
          page.waitForURL('**/subjects/rank', { timeout: 10000 }).catch(() => {}),
          page.getByRole('button', { name: /next: rank these/i }).click({ timeout: 8000 }),
        ]);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(400);
        console.log('landed on', page.url());
        await shoot(page, OUT_DIR, '14-subjects-rank', viewport, theme);
        console.log(`OK ${viewport.name}/${theme}/14-subjects-rank`);
      } catch (err) {
        console.log(`FAIL ${viewport.name}/${theme}/14-subjects-rank: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }

  await browser.close();
}

main();
