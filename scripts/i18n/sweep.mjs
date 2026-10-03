// node scripts/i18n/sweep.mjs <baseUrl> <lang|none> <outDir> [--only=welcome,login] [--no-dark]
// Visits every screen in one language and writes screenshots (360x800 and 390x844,
// light and dark) plus an overflow report. Seeds ONE throwaway account and always
// deletes it. Env is read from .env.local.
import fs from 'node:fs';
import path from 'node:path';
import { admin, captureScreen, launch, login, newContext, VIEWPORTS } from './qa-lib.mjs';

const [base, langArg, outDir, ...flags] = process.argv.slice(2);
const lang = langArg === 'none' ? undefined : langArg;
const only = flags.find((f) => f.startsWith('--only='))?.slice(7).split(',');
const schemes = flags.includes('--no-dark') ? ['light'] : ['light', 'dark'];
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const db = admin(env);
const report = [];
const failures = [];
const want = (n) => !only || only.includes(n);

const browser = await launch();
let acct;
let acctLocked;
try {
  const suffix = String(Math.floor(1000 + Math.random() * 8999));
  acct = await db.createUser({ mobile: `+278399${suffix.padStart(5, '0').slice(-5)}`, username: 'QA Tester', withData: true, email: 'i18n-qa-fixed@ssp-test.local' });
  const plan = await db.plan(acct.id);
  const timerPlanId = plan[0].id;
  const mathSubjectId = acct.subjects[0].id;

  const shoot = async (page, name) => {
    try { await captureScreen(page, { outDir, name, report, schemes }); console.log('OK  ', name); }
    catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('FAIL', name, e.message.split('\n')[0]); }
  };

  // ---------------- logged out ----------------
  {
    const ctx = await newContext(browser, { base, lang });
    const page = await ctx.newPage();
    const visit = async (name, url, prep) => {
      if (!want(name)) return;
      try {
        await page.goto(`${base}${url}`, { waitUntil: 'networkidle' });
        if (prep) await prep(page);
        await shoot(page, name);
      } catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('FAIL', name, e.message.split('\n')[0]); }
    };
    await visit('welcome', '/');
    await visit('login', '/login');
    await visit('login-language-sheet', '/login', async (p) => { await p.getByRole('button', { name: /Language \/ Taal/ }).click(); await p.waitForTimeout(500); });
    await visit('register-step1', '/register');
    if (want('register-step2')) {
      await page.goto(`${base}/register`, { waitUntil: 'networkidle' });
      await page.evaluate(() => sessionStorage.setItem('registerStep1', JSON.stringify({ username: 'qa', mobileNumber: '+27831112222', password: 'secret1' })));
      await page.goto(`${base}/register/step2`, { waitUntil: 'networkidle' });
      await page.locator('input[type="radio"]').first().check({ force: true });
      await page.waitForTimeout(300);
      await shoot(page, 'register-step2');
    }
    await visit('forgot-password', '/forgot-password');
    await visit('reset-password-expired', '/reset-password');
    await visit('auth-callback-expired', '/auth/callback?error=access_denied');
    await visit('parent-confirmed-ok', '/parent-confirmed?status=ok');
    await visit('parent-unsubscribed-ok', '/parent-unsubscribed?status=ok');
    await visit('offline-page', '/offline.html');
    await ctx.close();
  }

  // ---------------- logged in ----------------
  {
    const ctx = await newContext(browser, { base, lang });
    const page = await ctx.newPage();
    await login(page, base, acct);
    const visit = async (name, url, prep) => {
      if (!want(name)) return;
      try {
        await page.goto(`${base}${url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        if (prep) await prep(page);
        await shoot(page, name);
      } catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('FAIL', name, e.message.split('\n')[0]); }
    };
    await visit('subjects', '/subjects');
    await visit('ranking', '/subjects/rank');
    await visit('exam-dates', '/subjects/dates');
    await visit('manage-ranking', '/subjects/manage');
    await visit('manage-subjects', '/subjects/manage', async (p) => { await p.locator('button', { hasText: /^(Subjects|Vakke)$/ }).click(); await p.waitForTimeout(200); });
    await visit('manage-dates', '/subjects/manage', async (p) => { await p.locator('button', { hasText: /^(Exam dates|Eksamendatums)$/ }).click(); await p.waitForTimeout(200); });
    await visit('dashboard', '/dashboard');
    await visit('dashboard-settings-menu', '/dashboard', async (p) => { await p.locator('button:has-text("⚙")').click(); await p.waitForTimeout(300); });
    await visit('dashboard-language-sheet', '/dashboard', async (p) => {
      await p.locator('button:has-text("⚙")').click();
      const row = p.getByRole('button', { name: /Language \/ Taal/ });
      if (await row.count()) { await row.click(); await p.waitForTimeout(500); }
    });
    await visit('dashboard-exams-sheet', '/dashboard', async (p) => { await p.locator('nav button').last().click(); await p.waitForTimeout(700); });
    await visit('calendar', '/calendar');
    await visit('timer', `/timer/${timerPlanId}`);
    await visit('session-complete', `/session-complete/${mathSubjectId}`);
    await visit('exam-timer-setup', '/exam-timer/setup');
    await visit('exam-timer-session', `/exam-timer/session?subjectId=${mathSubjectId}&minutes=150`);
    await visit('past-papers', '/past-papers');
    await visit('account', '/account');
    await ctx.close();
  }
} finally {
  if (acct) await db.deleteUser(acct.id);
  await browser.close();
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'overflow-report.json'), JSON.stringify(report, null, 2));
const bad = report.flatMap((r) => r.issues.map((i) => ({ ...i, screen: r.screen, viewport: r.viewport }))).filter((i) => i.kind !== 'ellipsis-truncated');
console.log(`\nscreens captured with ${failures.length} failure(s); overflow findings (excluding intentional ellipsis): ${bad.length}`);
failures.forEach((f) => console.log(' FAIL', f));
bad.slice(0, 40).forEach((i) => console.log(' ', i.screen, i.viewport, i.kind, i.element, i.text ?? ''));
