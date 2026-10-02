import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'https://plan.empowermint.co.za';
const OUT_DIR = process.argv[2];
const VIEWPORTS = [{ name: '390x844', width: 390, height: 844 }];
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

  // --- subjects/dates: drive the fresh account through pick -> rank -> dates ---
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/subjects?user_id=eq.${process.env.FRESH_USER_ID}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
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

        // Rank screen: pick a confidence pill, then continue to dates.
        const pills = page.locator('button').filter({ hasText: /^[1-5]$/ });
        const pillCount = await pills.count();
        if (pillCount > 0) await pills.first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(200);
        await Promise.all([
          page.waitForURL('**/subjects/dates', { timeout: 10000 }).catch(() => {}),
          page.getByRole('button', { name: /next: exam dates/i }).click({ timeout: 8000 }),
        ]);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(400);
        console.log('dates landed on', page.url());
        await shoot(page, OUT_DIR, '16-subjects-dates', viewport, theme);
        console.log(`OK ${viewport.name}/${theme}/16-subjects-dates`);
      } catch (err) {
        console.log(`FAIL ${viewport.name}/${theme}/16-subjects-dates: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }

  // --- exam-timer/session ---
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme });
      try {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await page.getByPlaceholder('83 123 4567').fill(formatLocalMobile(process.env.ONBOARDED_MOBILE));
        await page.locator('input[type="password"]').fill(process.env.ONBOARDED_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
        await page.goto(
          `${BASE_URL}/exam-timer/session?subjectId=${process.env.ONBOARDED_SUBJECT_ID}&minutes=60`,
          { waitUntil: 'networkidle' }
        );
        await page.waitForTimeout(400);
        await shoot(page, OUT_DIR, '17-exam-timer-session', viewport, theme);
        console.log(`OK ${viewport.name}/${theme}/17-exam-timer-session`);
      } catch (err) {
        console.log(`FAIL ${viewport.name}/${theme}/17-exam-timer-session: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }

  await browser.close();
}

main();
