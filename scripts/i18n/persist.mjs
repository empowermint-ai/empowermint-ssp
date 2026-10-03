// node scripts/i18n/persist.mjs <baseUrl>
// Proves the saved-language behaviour in BOTH database states without touching the real
// schema: (1) the real backend as it is today (column missing -> must fail safe), and
// (2) a simulated backend where learners.preferred_language exists (requests to the users
// table are intercepted in the browser). Also reads the real activity_log for language_changed.
import fs from 'node:fs';
import { admin, launch, newContext, login } from './qa-lib.mjs';

const [base] = process.argv.slice(2);
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const db = admin(env);
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(1); console.log('PASS', name); } catch (e) { results.push(0); console.log('FAIL', name, '-', e.message.split('\n')[0]); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
const lang = (p) => p.evaluate(() => document.documentElement.lang);
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;

const acct = await db.createUser({ mobile: `+278366${String(Math.floor(10000 + Math.random() * 89999))}`.slice(0, 12), username: 'Persist QA', withData: true, email: `i18n-qa-persist-${Date.now()}@ssp-test.local` });
const browser = await launch();
try {
  // ---------- (1) real backend: column missing ----------
  await step('real backend (column missing): switching works, no error UI, choice kept by cookie', async () => {
    const ctx = await newContext(browser, { base, lang: 'en' });
    const page = await ctx.newPage();
    await login(page, base, acct);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Language / Taal').click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Afrikaans' }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'af');
    await page.getByText('Taal verander na Afrikaans').waitFor({ timeout: 4000 });
    await page.reload({ waitUntil: 'networkidle' });
    assert((await lang(page)) === 'af', 'choice lost after reload');
    const pending = await page.evaluate(() => localStorage.getItem('ssp_lang_pending'));
    assert(!pending, `missing column must not queue retries forever (pending=${pending})`);
    const alerts = (await page.locator('[role="alert"]').allInnerTexts()).filter((t) => t.trim());
    assert(alerts.length === 0, 'an error was shown');
    await ctx.close();
  });
  await step('real backend: language_changed event is written to activity_log', async () => {
    const rows = await (await fetch(`${SUPA}/rest/v1/activity_log?learner_id=eq.${acct.id}&event_type=eq.language_changed&select=metadata`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })).json();
    assert(Array.isArray(rows) && rows.length >= 1, `rows: ${JSON.stringify(rows)}`);
    const md = rows[0].metadata;
    assert(md.from === 'en' && md.to === 'af' && md.source === 'settings', `metadata ${JSON.stringify(md)}`);
  });

  // ---------- (2) simulated backend: column exists ----------
  const simulate = async (page, state) => {
    await page.route(`${SUPA}/rest/v1/users?*`, async (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        const body = req.postDataJSON();
        if ('preferred_language' in body) {
          state.patches.push(body.preferred_language);
          if (state.failNext) { state.failNext = false; return route.abort('failed'); }
          state.saved = body.preferred_language;
          return route.fulfill({ status: 204, body: '' });
        }
      }
      if (req.method() === 'GET' && /select=preferred_language/.test(req.url())) {
        const single = (req.headers()['accept'] || '').includes('pgrst.object');
        const row = { preferred_language: state.saved };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) });
      }
      return route.continue();
    });
  };

  await step('column exists: choice in Settings is saved (background PATCH)', async () => {
    const state = { saved: 'en', patches: [] };
    const ctx = await newContext(browser, { base, lang: 'en' });
    const page = await ctx.newPage();
    await simulate(page, state);
    await login(page, base, acct);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Language / Taal').click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Afrikaans' }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'af');
    await page.waitForTimeout(800);
    assert(state.patches.includes('af'), `patches: ${state.patches}`);
    await ctx.close();
  });
  await step('column exists: saved language is applied at login on a new device (cookie says en)', async () => {
    const state = { saved: 'af', patches: [] };
    const ctx = await newContext(browser, { base, lang: 'en' });
    const page = await ctx.newPage();
    await simulate(page, state);
    await login(page, base, acct);
    await page.waitForFunction(() => document.documentElement.lang === 'af', null, { timeout: 15000 });
    await ctx.close();
  });
  await step('column exists: an explicit choice this session beats the saved language', async () => {
    const state = { saved: 'af', patches: [] };
    const ctx = await newContext(browser, { base, lang: 'af' });
    const page = await ctx.newPage();
    await simulate(page, state);
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Language / Taal' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: 'English' }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    await page.getByPlaceholder('83 123 4567').fill(acct.mobile.replace('+27', '').replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3'));
    await page.locator('input[type="password"]').fill(acct.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
    await page.waitForTimeout(2500);
    assert((await lang(page)) === 'en', 'saved language overrode the explicit choice');
    assert(state.patches.includes('en') && state.saved === 'en', `explicit choice not saved: ${state.patches}`);
    await ctx.close();
  });
  await step('column exists: failed save (offline) is retried on the next load', async () => {
    const state = { saved: 'en', patches: [], failNext: true };
    const ctx = await newContext(browser, { base, lang: 'en' });
    const page = await ctx.newPage();
    await simulate(page, state);
    await login(page, base, acct);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Language / Taal').click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Afrikaans' }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'af');
    await page.waitForTimeout(800);
    assert(state.saved === 'en', 'first save should have failed');
    assert(await page.evaluate(() => localStorage.getItem('ssp_lang_pending')) === 'af', 'retry not queued');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    assert(state.saved === 'af', `retry did not save (saved=${state.saved})`);
    await ctx.close();
  });
} finally {
  await db.deleteUser(acct.id);
  await db.deleteByEmailPrefix('i18n-qa-').catch(() => {});
  await browser.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\npersistence: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
