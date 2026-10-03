// Shared QA helpers for the i18n Playwright runs (dev-only tooling).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

export const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
];
export const SCHEMES = ['light', 'dark'];

// ---------- Supabase admin (test accounts only; always cleaned up) ----------
export function admin(env) {
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const rest = async (method, p, body, extra = {}) => {
    const r = await fetch(`${base}/rest/v1/${p}`, { method, headers: { ...h, ...extra }, body: body ? JSON.stringify(body) : undefined });
    return r.status === 204 ? null : r.json().catch(() => null);
  };
  return {
    async createUser({ mobile, username, grade = 'Grade 12', withData = false, email: fixedEmail }) {
      const email = fixedEmail ?? `i18n-qa-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ssp-test.local`;
      const password = 'TestPass123!';
      const auth = await (await fetch(`${base}/auth/v1/admin/users`, { method: 'POST', headers: h, body: JSON.stringify({ email, password, email_confirm: true }) })).json();
      const id = auth.id;
      await rest('POST', 'users', { id, username, mobile_number: mobile, parent_email: email, grade, student_type: 'school' });
      let subjects = [];
      if (withData) {
        subjects = await rest('POST', 'subjects', [
          { user_id: id, subject_name: 'Mathematics', is_custom: false, confidence_score: 3 },
          { user_id: id, subject_name: 'Life Sciences', is_custom: false, confidence_score: 4 },
          { user_id: id, subject_name: 'My Custom Subject', is_custom: true, confidence_score: 2 },
        ], { Prefer: 'return=representation' });
        if (!Array.isArray(subjects)) throw new Error('seed subjects failed: ' + JSON.stringify(subjects));
        const date = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
        await rest('POST', 'exam_dates', subjects.map((s) => ({ subject_id: s.id, exam_date: date })));
        const today = new Date().toISOString().slice(0, 10);
        await rest('POST', 'daily_plans', subjects.map((s, i) => ({ user_id: id, subject_id: s.id, plan_date: today, session_order: i + 1 })));
      }
      return { id, email, password, mobile, subjects };
    },
    async plan(userId) {
      const today = new Date().toISOString().slice(0, 10);
      return rest('GET', `daily_plans?user_id=eq.${userId}&plan_date=eq.${today}&select=id,subject_id&order=session_order`);
    },
    async deleteUser(id) {
      await rest('DELETE', `users?id=eq.${id}`);
      await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: h });
    },
    async deleteByEmailPrefix(prefix) {
      const list = await (await fetch(`${base}/auth/v1/admin/users?per_page=200`, { headers: h })).json();
      for (const u of list.users ?? []) if (u.email?.startsWith(prefix)) await this.deleteUser(u.id);
    },
  };
}

export function localMobile(e164) {
  const d = e164.replace('+27', '');
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export async function newContext(browser, { base, lang, scheme = 'light', width = 390, height = 844, acceptLanguage, fixRandom = true }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    extraHTTPHeaders: acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined,
  });
  if (lang) await ctx.addCookies([{ name: 'NEXT_LOCALE', value: lang, url: base }]);
  // Greetings and quotes are random; pin Math.random so screenshots are comparable.
  if (fixRandom) await ctx.addInitScript(() => { Math.random = () => 0.01; });
  return ctx;
}

export async function login(page, base, acct) {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('83 123 4567').fill(localMobile(acct.mobile));
  await page.locator('input[type="password"]').fill(acct.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForLoadState('networkidle');
}

// ---------- overflow detector ----------
export async function detectOverflow(page) {
  return page.evaluate(() => {
    const out = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) out.push({ kind: 'page-scrolls-horizontally', scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth });
    const label = (el) => {
      const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
    };
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'inline' || cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      if (['svg', 'path', 'circle', 'g', 'line', 'polygon', 'rect', 'text'].includes(el.tagName.toLowerCase())) continue;
      const over = el.scrollWidth - el.clientWidth;
      if (over > 1 && el.clientWidth > 0) {
        const text = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
        out.push({
          kind: cs.textOverflow === 'ellipsis' || el.classList.contains('truncate') ? 'ellipsis-truncated' : (cs.overflowX === 'visible' ? 'overflowing' : 'clipped'),
          element: label(el), over, text,
        });
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && cs.position !== 'fixed' && !el.closest('[aria-hidden="true"]')) {
        if (!out.some((o) => o.element === label(el) && o.kind === 'outside-viewport')) out.push({ kind: 'outside-viewport', element: label(el), right: Math.round(r.right), left: Math.round(r.left), text: (el.innerText || '').trim().slice(0, 40) });
      }
    }
    return out;
  });
}

// ---------- capture one screen at every viewport/scheme ----------
export async function captureScreen(page, { outDir, name, report, viewports = VIEWPORTS, schemes = SCHEMES, settle = 400 }) {
  for (const vp of viewports) {
    for (const scheme of schemes) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ colorScheme: scheme });
      await page.waitForTimeout(settle);
      const dir = path.join(outDir, vp.name, scheme);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
      if (report && scheme === 'light') {
        const issues = await detectOverflow(page);
        report.push({ screen: name, viewport: vp.name, issues });
      }
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
}

// ---------- pixel diff (no extra dependency: done in a Chromium canvas) ----------
export async function diffImages(browser, fileA, fileB) {
  const page = await browser.newPage();
  const toUrl = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
  const result = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: true, a: [ia.width, ia.height], b: [ib.width, ib.height] };
    const px = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
    const da = px(ia), db = px(ib);
    let diff = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) {
        diff++; const p = i / 4, x = p % ia.width, y = Math.floor(p / ia.width);
        if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
    return { diff, total: da.length / 4, box: diff ? [minX, minY, maxX, maxY] : null };
  }, [toUrl(fileA), toUrl(fileB)]);
  await page.close();
  return result;
}

export async function launch() {
  return chromium.launch();
}
