// node scripts/i18n/closeups.mjs <baseUrl> <outDir>
// Close-up screenshots of the new UI only: language control (both states), sheet,
// notice card and toast, in light and dark, at 390x844 (2x pixel density for legibility).
import fs from 'node:fs';
import path from 'node:path';
import { admin, launch, login } from './qa-lib.mjs';

const [base, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const db = admin(env);
const acct = await db.createUser({ mobile: `+278355${String(Math.floor(10000 + Math.random() * 89999))}`.slice(0, 12), username: 'QA Tester', withData: true, email: `i18n-qa-closeups-${Date.now()}@ssp-test.local` });
const browser = await launch();
const shot = async (page, loc, name, scheme, pad = 12) => {
  const box = await loc.boundingBox();
  await page.screenshot({ path: path.join(outDir, `${name}-${scheme}.png`), clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(390, box.width + pad * 2), height: box.height + pad * 2 } });
};
try {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    await ctx.addInitScript(() => { Math.random = () => 0.01; });
    const page = await ctx.newPage();
    // welcome: both states of the segmented control
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const group = page.getByRole('radiogroup').first();
    await shot(page, group, 'control-english-selected', scheme);
    await page.getByRole('radio', { name: 'Afrikaans' }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'af');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `toast-after-change-welcome-${scheme}.png`) });
    await page.waitForTimeout(3600);
    await shot(page, group, 'control-afrikaans-selected', scheme);
    // login: globe + sheet
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await shot(page, page.getByRole('button', { name: 'Language / Taal' }), 'globe-button', scheme, 10);
    await page.getByRole('button', { name: 'Language / Taal' }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(500);
    await shot(page, page.getByRole('dialog'), 'sheet', scheme, 0);
    await page.keyboard.press('Escape');
    // dashboard in English: notice card
    await ctx.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: base }]);
    await login(page, base, acct);
    await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
    const card = page.locator('[aria-label="New language available"]');
    await card.waitFor({ timeout: 8000 });
    await shot(page, card, 'notice-card-english', scheme);
    await page.getByRole('button', { name: 'Switch to Afrikaans' }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'af');
    await page.getByRole('status').filter({ hasText: 'Taal verander' }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    await shot(page, page.getByRole('status').filter({ hasText: 'Taal verander' }), 'toast', scheme, 16);
    await page.screenshot({ path: path.join(outDir, `toast-in-context-${scheme}.png`) });
    await ctx.close();
  }
  console.log('close-ups written to', outDir);
} finally {
  await db.deleteUser(acct.id);
  await browser.close();
}
