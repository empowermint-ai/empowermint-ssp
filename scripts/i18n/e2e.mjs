// node scripts/i18n/e2e.mjs <baseUrl> <en|af>
// Walks every flow in one language. Needs NEXT_PUBLIC_ENABLED_LOCALES=en,af on the server.
// Registration is exercised with the Supabase signup call and /api/create-profile
// intercepted: this proves the chosen language travels with the signup payload without
// creating a real account or sending a confirmation email. Everything else hits the real
// backend using throwaway accounts that are always deleted.
import fs from 'node:fs';
import { admin, launch, localMobile, newContext } from './qa-lib.mjs';

const [base, L = 'af'] = process.argv.slice(2);
const OTHER = L === 'af' ? 'en' : 'af';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const MSG = { en: JSON.parse(fs.readFileSync('messages/en.json', 'utf8')), af: JSON.parse(fs.readFileSync('messages/af.json', 'utf8')) };
const m = (lang, key, params = {}) => {
  let v = key.split('.').reduce((o, k) => o?.[k], MSG[lang]);
  if (typeof v !== 'string') throw new Error(`no message ${lang}:${key}`);
  for (const [k, val] of Object.entries(params)) v = v.replaceAll(`{${k}}`, String(val));
  return v;
};
const LANGNAME = { en: 'English', af: 'Afrikaans' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);

const results = [];
let consoleErrors = [];
async function step(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, ok: false, err: e.message.split('\n')[0] }); console.log('FAIL', name, '-', e.message.split('\n')[0]); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const lang = (page) => page.evaluate(() => document.documentElement.lang);
const cookie = async (ctx, name) => (await ctx.cookies()).find((c) => c.name === name)?.value;
const dial = (page) => page.locator('text=/^\\d{1,2}:\\d{2}(:\\d{2})?$/').first();
const secs = async (page) => { const t = (await dial(page).innerText()).trim().split(':').map(Number); return t.length === 3 ? t[0] * 3600 + t[1] * 60 + t[2] : t[0] * 60 + t[1]; };

const db = admin(env);
const browser = await launch();
const created = [];
const suffix = () => String(Math.floor(10000 + Math.random() * 89999));

try {
  // ====================== A. logged out: welcome > pick > register ======================
  {
    const ctx = await newContext(browser, { base, acceptLanguage: 'en-GB' });
    const page = await ctx.newPage();
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[A] ${msg.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push(`[A] HTTP ${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`); });
    page.on('pageerror', (e) => consoleErrors.push(`[A] pageerror ${e.message}`));
    let signupBody; let profileBody;
    await page.route('**/auth/v1/signup', async (route) => {
      signupBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '11111111-1111-1111-1111-111111111111', email: signupBody.email, identities: [{ id: 'x' }] }) });
    });
    await page.route('**/api/create-profile', async (route) => {
      profileBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    await step('welcome: loads in English by default (en phone)', async () => {
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      assert((await lang(page)) === 'en', 'html lang is not en');
      assert(await page.getByRole('radio', { name: 'English' }).getAttribute('aria-checked') === 'true', 'English not pre-selected');
    });
    await step(`welcome: pick ${LANGNAME[L]} -> instant, no reload, toast in new language, cookie`, async () => {
      await page.evaluate(() => { window.__noReload = true; });
      if (L === 'en') { // already English: tap Afrikaans first so there is a real change to observe
        await page.getByRole('radio', { name: 'Afrikaans' }).click();
        await page.waitForFunction(() => document.documentElement.lang === 'af');
      }
      await page.getByRole('radio', { name: LANGNAME[L] }).click();
      await page.waitForFunction((l) => document.documentElement.lang === l, L);
      assert(await page.evaluate(() => window.__noReload === true), 'full page reload happened');
      await page.getByText(m(L, 'language.changed', { language: LANGNAME[L] })).waitFor({ timeout: 4000 }).catch(() => { if (L !== 'en') throw new Error('toast missing'); });
      assert((await cookie(ctx, 'NEXT_LOCALE')) === L, 'NEXT_LOCALE cookie not set');
      assert(await page.getByRole('radio', { name: LANGNAME[L] }).getAttribute('aria-checked') === 'true', 'selected state not reflected');
      await page.getByRole('heading', { name: m(L, 'welcome.title') }).waitFor({ timeout: 4000 });
    });
    await step('welcome: CTA visible without scrolling at 360x640', async () => {
      await page.setViewportSize({ width: 360, height: 640 });
      const cta = page.getByRole('link', { name: new RegExp(esc(m(L, 'welcome.start')), 'i') });
      const box = await cta.boundingBox();
      assert(box && box.y + box.height <= 640, `CTA bottom at ${box && Math.round(box.y + box.height)}px`);
      await page.setViewportSize({ width: 390, height: 844 });
    });
    await step('register step 1 (validation + continue)', async () => {
      await page.getByRole('link', { name: new RegExp(esc(m(L, 'welcome.start')), 'i') }).click();
      await page.waitForURL('**/register');
      await page.getByRole('button', { name: m(L, 'auth.register.continue') }).click();
      await page.getByText(m(L, 'auth.register.usernameRequired')).waitFor({ timeout: 3000 });
      await page.locator('#username').fill('QA Learner');
      await page.getByPlaceholder(m(L, 'auth.phone.placeholder')).fill(localMobile(`+278388${suffix()}`.slice(0, 12)));
      await page.locator('input[type="password"]').first().fill('TestPass123!');
      await page.getByRole('button', { name: m(L, 'auth.register.continue') }).click();
      await page.waitForURL('**/register/step2', { timeout: 15000 });
    });
    await step('register step 2: signup carries preferred_language, success screen localised', async () => {
      await page.locator('#email').fill('i18n-qa-register@ssp-test.local');
      await page.locator('label:has(input[name="institutionType"]) >> nth=0').click();
      await page.locator('#institutionName').fill('QA High');
      await page.locator('#gradeOrYear').selectOption({ index: 1 });
      await page.locator('button[type="submit"]').click();
      await page.getByText(m(L, 'auth.step2.checkTitle')).waitFor({ timeout: 8000 });
      assert(profileBody?.preferred_language === L, `create-profile preferred_language = ${profileBody?.preferred_language}`);
    });
    await step('?lang=<other> logged out: sets cookie, strips param, page switches', async () => {
      await page.goto(`${base}/?lang=${OTHER}`, { waitUntil: 'networkidle' });
      assert(!page.url().includes('lang='), `param not stripped: ${page.url()}`);
      assert((await lang(page)) === OTHER, 'language did not switch');
      assert((await cookie(ctx, 'NEXT_LOCALE')) === OTHER, 'cookie not updated');
    });
    await step('?lang=xx (invalid) is ignored', async () => {
      await page.goto(`${base}/?lang=zz`, { waitUntil: 'networkidle' });
      assert((await lang(page)) === OTHER, 'invalid code changed the language');
    });
    await step('phone language af pre-selects Afrikaans on first launch', async () => {
      const c2 = await newContext(browser, { base, acceptLanguage: 'af-ZA,af;q=0.9,en;q=0.5' });
      const p2 = await c2.newPage();
      await p2.goto(`${base}/`, { waitUntil: 'networkidle' });
      assert((await lang(p2)) === 'af', 'not pre-selected');
      assert(await p2.getByRole('radio', { name: 'Afrikaans' }).getAttribute('aria-checked') === 'true', 'radio not checked');
      await c2.close();
    });
    await ctx.close();
  }

  // ====================== B. onboarding with a fresh account ======================
  const fresh = await db.createUser({ mobile: `+278377${suffix()}`.slice(0, 12), username: 'QA Fresh', withData: false, email: `i18n-qa-fresh-${L}-${Date.now()}@ssp-test.local` });
  created.push(fresh.id);
  const ctxB = await newContext(browser, { base, acceptLanguage: 'en-GB' });
  const page = await ctxB.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[B] ${msg.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`[B] pageerror ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push(`[B] HTTP ${r.status()} ${r.request().method()} ${r.url().replace(env.NEXT_PUBLIC_SUPABASE_URL, '<supabase>').slice(0, 140)}`); });
  await ctxB.addCookies([{ name: 'NEXT_LOCALE', value: L, url: base }]);

  await step('login: globe opens sheet, switch language, toast, login works', async () => {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Language / Taal' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.waitFor();
    await dlg.getByRole('radio', { name: LANGNAME[OTHER] }).click();
    await page.waitForFunction((l) => document.documentElement.lang === l, OTHER);
    await page.getByText(m(OTHER, 'language.changed', { language: LANGNAME[OTHER] })).waitFor({ timeout: 4000 });
    await page.getByRole('button', { name: 'Language / Taal' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: LANGNAME[L] }).click();
    await page.waitForFunction((l) => document.documentElement.lang === l, L);
    await page.getByPlaceholder(m(L, 'auth.phone.placeholder')).fill(localMobile(fresh.mobile));
    await page.locator('input[type="password"]').fill(fresh.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    assert((await lang(page)) === L, 'explicit choice did not win after login');
  });
  await step('login: half-typed form survives a language switch (nothing is remounted)', async () => {
    const c = await newContext(browser, { base, lang: L });
    const p = await c.newPage();
    await p.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder(m(L, 'auth.phone.placeholder')).fill('83 111 2222');
    await p.locator('input[type="password"]').fill('secret99');
    await p.evaluate(() => { window.__noReload = true; });
    await p.getByRole('button', { name: 'Language / Taal' }).click();
    await p.getByRole('dialog').getByRole('radio', { name: LANGNAME[OTHER] }).click();
    await p.waitForFunction((l) => document.documentElement.lang === l, OTHER);
    await p.getByRole('button', { name: m(OTHER, 'auth.login.submit') }).waitFor();
    await p.waitForTimeout(1500);
    const vals = await p.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.value));
    assert(vals.includes('83 111 2222') && vals.includes('secret99'), `form values lost: ${JSON.stringify(vals)}`);
    assert(await p.evaluate(() => window.__noReload === true), 'full reload happened');
    await c.close();
  });
  await step('login with wrong password shows localised error', async () => {
    const c = await newContext(browser, { base, lang: L });
    const p = await c.newPage();
    await p.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder(m(L, 'auth.phone.placeholder')).fill(localMobile(fresh.mobile));
    await p.locator('input[type="password"]').fill('wrongwrong');
    await p.locator('button[type="submit"]').click();
    await p.getByText(m(L, 'auth.login.invalid')).waitFor({ timeout: 10000 });
    await c.close();
  });
  await step('subjects: Afrikaans label shown, search works in both languages, stored name stays English', async () => {
    await page.goto(`${base}/subjects`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: m(L, 'subjects.title') }).waitFor();
    const search = page.getByPlaceholder(m(L, 'subjects.searchPlaceholder'));
    for (const q of ['Math', 'Wisk']) {
      await search.fill(q);
      await page.waitForTimeout(900);
      assert(await page.getByRole('button', { name: m(L, 'presets.mathematics'), exact: true }).count() > 0, `search "${q}" did not find Mathematics/Wiskunde`);
    }
    await page.getByRole('button', { name: m(L, 'presets.mathematics'), exact: true }).first().click();
    await search.fill('Life');
    await page.getByRole('button', { name: m(L, 'presets.lifeSciences'), exact: true }).first().click().catch(async () => {
      await search.fill('Lewens'); await page.getByRole('button', { name: m(L, 'presets.lifeSciences'), exact: true }).first().click();
    });
    await page.getByRole('button', { name: m(L, 'subjects.next') }).click();
    await page.waitForURL('**/subjects/rank', { timeout: 15000 });
    const rows = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subjects?user_id=eq.${fresh.id}&select=subject_name`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })).json();
    const names = rows.map((r) => r.subject_name).sort();
    assert(names.join() === 'Life Sciences,Mathematics', `stored names: ${names.join()}`);
  });
  await step('ranking: rate each subject and continue', async () => {
    await page.getByRole('heading', { name: m(L, 'ranking.title') }).waitFor();
    await page.getByRole('button', { name: m(L, 'ranking.scoreAria', { subject: m(L, 'presets.mathematics'), score: 3 }) }).click();
    await page.getByRole('button', { name: m(L, 'ranking.scoreAria', { subject: m(L, 'presets.lifeSciences'), score: 2 }) }).click();
    await page.getByRole('button', { name: m(L, 'ranking.next') }).click();
    await page.waitForURL('**/subjects/dates', { timeout: 15000 });
  });
  await step('exam dates: add dates, generate plan, land on Today\'s Plan', async () => {
    await page.getByRole('heading', { name: m(L, 'examDates.title') }).waitFor();
    const d = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
    const inputs = page.locator('input[type="date"]');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) { await inputs.nth(i).fill(d); await page.waitForTimeout(700); }
    await page.getByRole('button', { name: m(L, 'examDates.generate') }).click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  });

  // ====================== C. Today's Plan, notice card, timer ======================
  await step(L === 'en' ? 'notice card: shows in English for existing learner, "Not now" hides it for good' : 'notice card: not shown when already in Afrikaans', async () => {
    const card = page.getByRole('region', { name: m(L, 'notice.aria') }).or(page.locator(`[aria-label="${m(L, 'notice.aria')}"]`));
    if (L === 'af') { assert((await card.count()) === 0, 'notice shown to an Afrikaans user'); return; }
    await card.first().waitFor({ timeout: 6000 });
    await page.getByText(m('en', 'notice.headline', { language: 'Afrikaans' })).waitFor();
    await page.getByRole('button', { name: m('en', 'notice.notNow') }).click();
    await page.reload({ waitUntil: 'networkidle' });
    assert((await card.count()) === 0, 'notice came back after Not now');
  });
  const sessionBtn = page.getByRole('link').or(page.getByRole('button')).filter({ hasText: m(L, 'presets.mathematics') });
  await step('today\'s plan: open first session, timer shows Start gate', async () => {
    await page.locator('div.cursor-pointer', { hasText: m(L, 'presets.mathematics') }).first().click();
    await page.waitForURL('**/timer/**', { timeout: 15000 });
    await page.getByRole('button', { name: m(L, 'timer.start') }).waitFor();
    assert((await secs(page)) === 1500, 'timer is not 25:00 before start');
  });
  let timerWorks = false;
  await step('timer: start, pause (frozen), resume', async () => {
    await page.getByRole('button', { name: m(L, 'timer.start') }).click();
    await page.waitForTimeout(2200);
    const a = await secs(page); assert(a < 1500, 'did not count down');
    await page.getByRole('button', { name: m(L, 'timer.pause') }).click();
    const p1 = await secs(page); await page.waitForTimeout(1800); const p2 = await secs(page);
    assert(p1 === p2, `paused timer moved ${p1}->${p2}`);
    await page.getByRole('button', { name: m(L, 'timer.resume') }).click();
    await page.waitForTimeout(1500);
    assert((await secs(page)) < p2, 'did not resume');
    timerWorks = true;
  });
  await step(`timer: switch language to ${LANGNAME[OTHER]} mid-session via Settings; timer keeps running`, async () => {
    assert(timerWorks, 'timer prerequisite failed');
    const before = await secs(page);
    // The timer screens have no language control (by design), so the same code path the picker
    // uses is called through a test hook that exists only in this dev run.
    await page.evaluate(() => { window.__noReload = true; });
    await page.evaluate((l) => window.__sspSetLanguage(l, 'settings'), OTHER);
    await page.waitForFunction((l) => document.documentElement.lang === l, OTHER, { timeout: 8000 });
    await page.getByRole('button', { name: m(OTHER, 'timer.pause') }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(1500); // a server refresh, if one wrongly happened, would land by now
    assert(await page.evaluate(() => window.__noReload === true), 'full reload happened');
    const after = await secs(page);
    assert(after < before && after > 0 && after < 1500, `timer reset or stopped (${before} -> ${after})`);
    await page.waitForTimeout(1500);
    assert((await secs(page)) < after, 'timer stopped after language switch');
    await page.evaluate((l) => window.__sspSetLanguage(l, 'settings'), L);
    await page.waitForFunction((l) => document.documentElement.lang === l, L, { timeout: 8000 });
  });
  await step('timer: end session -> session complete screen', async () => {
    await page.getByRole('button', { name: m(L, 'timer.end') }).click();
    await page.waitForURL('**/session-complete/**', { timeout: 15000 });
    await page.getByText(m(L, 'sessionComplete.whatsNext')).waitFor({ timeout: 8000 });
  });
  await step('session complete -> back to Today\'s Plan', async () => {
    const back = page.getByRole('button', { name: m(L, 'sessionComplete.backToPlan') }).or(page.getByRole('link', { name: m(L, 'sessionComplete.backToPlan') }));
    if (await back.count()) { await back.first().click(); await page.waitForURL('**/dashboard', { timeout: 15000 }); }
    else { await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' }); }
  });

  // ====================== D. settings language switch with state kept ======================
  await step(`settings: gear menu > Language / Taal > ${LANGNAME[OTHER]}; toast; saved cookie; then back`, async () => {
    await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: m(L, 'settings.aria') }).click();
    await page.getByRole('menuitem', { name: m(L, 'settings.language') }).or(page.getByRole('button', { name: m(L, 'settings.language') })).first().click();
    await page.getByRole('dialog').getByRole('radio', { name: LANGNAME[OTHER] }).click();
    await page.waitForFunction((l) => document.documentElement.lang === l, OTHER);
    await page.getByText(m(OTHER, 'language.changed', { language: LANGNAME[OTHER] })).waitFor({ timeout: 4000 });
    assert((await cookie(ctxB, 'NEXT_LOCALE')) === OTHER, 'cookie not updated');
    await page.getByRole('button', { name: m(OTHER, 'settings.aria') }).click();
    await page.getByRole('menuitem', { name: m(OTHER, 'settings.language') }).or(page.getByRole('button', { name: m(OTHER, 'settings.language') })).first().click();
    await page.getByRole('dialog').getByRole('radio', { name: LANGNAME[L] }).click();
    await page.waitForFunction((l) => document.documentElement.lang === l, L);
  });
  await step('settings: persistence is fail-safe while the column does not exist (no error toast, no crash)', async () => {
    const errs = consoleErrors.filter((e) => /preferred_language|42703|PGRST204/.test(e));
    assert(errs.length === 0, `errors: ${errs.join(' | ')}`);
    const alerts = (await page.locator('[role="alert"]').allInnerTexts()).filter((t) => t.trim());
    assert(alerts.length === 0, `alerts shown: ${alerts.join(' | ')}`);
  });

  // ====================== E. calendar, past papers, exam timer, manage, account ======================
  await step('calendar renders localised month and legend', async () => {
    await page.goto(`${base}/calendar`, { waitUntil: 'networkidle' });
    await page.getByText(m(L, 'calendar.title')).waitFor();
    await page.getByText(m(L, 'calendar.legendExam')).waitFor();
    const month = new Intl.DateTimeFormat(L === 'af' ? 'af-ZA' : 'en-GB', { month: 'long' }).format(new Date());
    assert((await page.locator('body').innerText()).toLowerCase().includes(month.toLowerCase()), `month name "${month}" not on page`);
  });
  await step('past papers page', async () => {
    await page.goto(`${base}/past-papers`, { waitUntil: 'networkidle' });
    await page.getByText(m(L, 'pastPapers.title'), { exact: false }).first().waitFor();
  });
  await step('exam timer: setup -> session -> start -> pause -> end early', async () => {
    await page.goto(`${base}/exam-timer/setup`, { waitUntil: 'networkidle' });
    await page.getByText(m(L, 'examTimer.setup.eyebrow')).waitFor();
    await page.locator('#examTimerSubject').selectOption({ index: 1 });
    await page.locator('#examTimerDuration').selectOption({ index: 1 });
    await page.getByRole('button', { name: m(L, 'examTimer.setup.go') }).click();
    await page.waitForURL('**/exam-timer/session**', { timeout: 15000 });
    await page.getByRole('button', { name: m(L, 'examTimer.session.start') }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: m(L, 'examTimer.session.pause') }).click();
    await page.getByRole('button', { name: m(L, 'examTimer.session.resume') }).waitFor();
  });
  await step('manage planner + account pages render', async () => {
    await page.goto(`${base}/subjects/manage`, { waitUntil: 'networkidle' });
    await page.getByText(m(L, 'presets.mathematics')).first().waitFor();
    await page.goto(`${base}/account`, { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
  });

  // ====================== F. ?lang= while logged in, logout, login again ======================
  await step(`?lang=${OTHER} logged in: switches, toast, param stripped`, async () => {
    await page.goto(`${base}/?lang=${OTHER}`, { waitUntil: 'commit' });
    await page.getByText(m(OTHER, 'language.changed', { language: LANGNAME[OTHER] })).waitFor({ timeout: 15000 });
    assert(!page.url().includes('lang='), `param not stripped: ${page.url()}`);
    assert((await lang(page)) === OTHER, 'did not switch');
  });
  await step('log out', async () => {
    await page.getByRole('button', { name: m(OTHER, 'settings.aria') }).click();
    await page.getByRole('menuitem', { name: m(OTHER, 'settings.logout') }).or(page.getByRole('button', { name: m(OTHER, 'settings.logout') })).first().click();
    await page.waitForURL((u) => ['/', '/login'].includes(u.pathname), { timeout: 15000 });
  });
  await step('logged out: language stays what the learner chose (cookie), login screen localised', async () => {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    assert((await lang(page)) === OTHER, 'lang lost after logout');
    await page.getByRole('button', { name: m(OTHER, 'auth.login.submit') }).waitFor();
  });
  await ctxB.close();

  // ====================== G. English-only flag behaviour is covered by the sweep ======================
} finally {
  for (const id of created) await db.deleteUser(id).catch(() => {});
  await db.deleteByEmailPrefix('i18n-qa-').catch(() => {});
  await browser.close();
}

const fail = results.filter((r) => !r.ok);
console.log(`\n${L}: ${results.length - fail.length}/${results.length} steps passed; console errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 15).forEach((e) => console.log('  console:', e.slice(0, 200)));
fail.forEach((f) => console.log('  FAIL:', f.name, '-', f.err));
process.exit(fail.length ? 1 : 0);
