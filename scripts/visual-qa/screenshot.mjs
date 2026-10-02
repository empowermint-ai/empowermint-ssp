// Visual QA capture script for the brand-refresh project.
// Takes before/after screenshots of every screen at 360x800, 390x844 and 1280 wide,
// in light and dark, for both an onboarded test account and a fresh one (to reach
// the mid-onboarding screens). Not shipped - dev tooling only, see DESIGN.md.
//
// Usage: node scripts/visual-qa/screenshot.mjs <out-dir>
// Reads BASE_URL, ONBOARDED_MOBILE, ONBOARDED_PASSWORD, FRESH_MOBILE, FRESH_PASSWORD from env.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'https://plan.empowermint.co.za';
const OUT_DIR = process.argv[2] || './visual-qa-out';
const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 900 },
];
const THEMES = ['light', 'dark'];

const ONBOARDED_MOBILE = process.env.ONBOARDED_MOBILE;
const ONBOARDED_PASSWORD = process.env.ONBOARDED_PASSWORD;
const FRESH_MOBILE = process.env.FRESH_MOBILE;
const FRESH_PASSWORD = process.env.FRESH_PASSWORD;

function formatLocalMobile(mobile) {
  const digits = mobile.replace('+27', '');
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

async function login(page, mobile, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('83 123 4567').fill(formatLocalMobile(mobile));
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
}

async function shoot(page, outDir, name, viewport, theme) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({ colorScheme: theme });
  await page.waitForTimeout(350);
  const dir = path.join(outDir, viewport.name, theme);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function captureStatic(context, outDir, routes) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const page = await context.newPage();
      for (const { route, name, waitFor } of routes) {
        try {
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
          if (waitFor) await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {});
          await shoot(page, outDir, name, viewport, theme);
          console.log(`OK   ${viewport.name}/${theme}/${name}`);
        } catch (err) {
          console.log(`FAIL ${viewport.name}/${theme}/${name}: ${err.message.split('\n')[0]}`);
        }
      }
      await page.close();
    }
  }
}

async function main() {
  const browser = await chromium.launch();
  await mkdir(OUT_DIR, { recursive: true });

  // --- Unauthenticated screens ---
  const unauthContext = await browser.newContext();
  await captureStatic(unauthContext, OUT_DIR, [
    { route: '/', name: '01-welcome' },
    { route: '/register', name: '02-register-step1' },
    { route: '/login', name: '03-login' },
    { route: '/forgot-password', name: '04-forgot-password' },
  ]);
  await unauthContext.close();

  // --- Onboarded account: everything post-onboarding ---
  if (ONBOARDED_MOBILE && ONBOARDED_PASSWORD) {
    const ctx = await browser.newContext();
    const loginPage = await ctx.newPage();
    await login(loginPage, ONBOARDED_MOBILE, ONBOARDED_PASSWORD);
    await loginPage.close();

    await captureStatic(ctx, OUT_DIR, [
      { route: '/dashboard', name: '05-dashboard-todays-plan' },
      { route: '/calendar', name: '06-calendar' },
      { route: '/subjects/manage', name: '07-manage' },
      { route: '/account', name: '08-account-settings' },
      { route: '/exam-timer/setup', name: '09-exam-timer-setup' },
      { route: '/past-papers', name: '10-past-papers' },
    ]);

    // Timer screen - daily plan id passed explicitly via TIMER_PLAN_ID env var
    // (looked up directly from the DB; the session card has no href to scrape).
    if (process.env.TIMER_PLAN_ID) {
      for (const viewport of VIEWPORTS) {
        for (const theme of THEMES) {
          const page = await ctx.newPage();
          await page.goto(`${BASE_URL}/timer/${process.env.TIMER_PLAN_ID}`, { waitUntil: 'networkidle' });
          await shoot(page, OUT_DIR, '11-focus-timer', viewport, theme);
          console.log(`OK   ${viewport.name}/${theme}/11-focus-timer`);
          await page.close();
        }
      }
    }

    // Exams tab is a bottom-sheet opened from the dashboard, not its own route.
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const page = await ctx.newPage();
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ colorScheme: theme });
        const examsTab = page.getByText('Exams', { exact: true });
        await examsTab.click().catch(() => {});
        await page.waitForTimeout(500);
        await shoot(page, OUT_DIR, '12-exams-sheet', viewport, theme);
        console.log(`OK   ${viewport.name}/${theme}/12-exams-sheet`);
        await page.close();
      }
    }

    await ctx.close();
  }

  // --- Fresh account: mid-onboarding screens, driven through the real flow ---
  if (FRESH_MOBILE && FRESH_PASSWORD) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ colorScheme: theme });
        try {
          await login(page, FRESH_MOBILE, FRESH_PASSWORD);
          await page.waitForTimeout(400);
          await shoot(page, OUT_DIR, '13-subjects-pick', viewport, theme);
          console.log(`OK   ${viewport.name}/${theme}/13-subjects-pick`);

          await page.getByPlaceholder('e.g. Mathematics').fill('Mathematics');
          await page.waitForTimeout(200);
          await page.getByRole('button', { name: 'Mathematics', exact: true }).first().click({ timeout: 5000 });
          await page.waitForTimeout(200);

          const nextBtn = page.getByRole('button', { name: /next: rank these/i });
          await nextBtn.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.waitForTimeout(400);
          if (page.url().includes('/subjects/rank')) {
            await shoot(page, OUT_DIR, '14-subjects-rank', viewport, theme);
            console.log(`OK   ${viewport.name}/${theme}/14-subjects-rank`);
          } else {
            console.log(`FAIL ${viewport.name}/${theme}/14-subjects-rank: landed on ${page.url()}`);
          }
        } catch (err) {
          console.log(`FAIL ${viewport.name}/${theme}/onboarding-flow: ${err.message.split('\n')[0]}`);
        }
        await ctx.close();
      }
    }
  }

  await browser.close();
  console.log('Done.');
}

main();
