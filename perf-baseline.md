# Performance baseline — before the brand refresh

Captured 2026-10-02 against production (`https://plan.empowermint.co.za`), before any
styling changes on the `design/brand-refresh` branch. A seeded test account
(`BrandRefreshBaseline`, Grade 11, 2 subjects with confidence + exam dates set) was used
for the logged-in pages; it will be re-used for the "after" run so the two are directly
comparable, then deleted once this task wraps up.

## Method

- Lighthouse 13.5.0, mobile form factor (Moto G Power emulation, default Lighthouse mobile
  viewport/UA), **simulated** throttling with Lighthouse's default mobile profile:
  150ms RTT, ~1.64 Mbps down / 675 Kbps up, **4x CPU slowdown** — this is Lighthouse's
  standard "Slow 4G, 4x CPU" mobile preset, used unmodified so the numbers are reproducible
  with a plain `npx lighthouse <url> --only-categories=performance,accessibility,best-practices`.
- Logged-in pages were authenticated by scripting a real login with Playwright and passing
  the resulting Supabase session cookie to Lighthouse via `--extra-headers`.
- **Lighthouse's PWA category no longer exists in v13** (removed upstream, not just moved —
  confirmed no `service-worker`/`installable-manifest`/`viewport` audit keys in the output).
  PWA correctness is checked manually instead (see below).
- Raw JSON reports: `scripts/visual-qa/` output kept outside the repo in session scratch,
  not committed (binary/report artifacts, not source).

## Lighthouse scores and Core Web Vitals

| Page | Perf | A11y | Best Practices | LCP | CLS | TBT | Transfer |
|---|---|---|---|---|---|---|---|
| Welcome `/` | 95 | 88 | 100 | 2.3 s | 0 | 0 ms | 470 KiB |
| Register `/register` | 74 | 85 | 100 | 4.8 s | 0 | 10 ms | 422 KiB |
| Login `/login` | 80 | 85 | 100 | 4.0 s | 0 | 10 ms | 455 KiB |
| Dashboard `/dashboard` (auth) | 77 | 89 | 96 | 3.9 s | **0.103** | 10 ms | 430 KiB |
| Calendar `/calendar` (auth) | 96 | 88 | 100 | 2.4 s | 0 | 20 ms | 424 KiB |
| Exam timer setup `/exam-timer/setup` (auth) | 97 | 88 | 100 | 2.0 s | 0 | 30 ms | 315 KiB |
| Focus timer `/timer/[id]` (auth) | 96 | 88 | 100 | 2.3 s | 0 | 20 ms | 384 KiB |

Notable pre-existing issues (not introduced by this task, listed for context):
- Dashboard has a real CLS of 0.103 — worth a look separately, but out of scope for a
  visual-only refresh per the guardrails.
- Register/Login Performance scores (74/80) are the weakest of the set, driven mostly by LCP.

## Font bytes loaded per page (current fonts)

| Page | Font requests | Font bytes |
|---|---|---|
| Welcome | 2 | 24,379 B |
| Register | 2 | 24,438 B |
| Login | 3 | 47,564 B |
| Dashboard | 3 | 47,530 B |
| Calendar | 3 | 47,525 B |
| Exam timer setup | 2 | 24,372 B |
| Focus timer | 2 | 24,402 B |

Breakdown: every page loads a `fonts.googleapis.com/css2?family=Montserrat...` request
(~1.1 KB, third-party, render-blocking) even though no "Mont" font file actually exists in
the repo — it's declared as the heading font, falls through to this Google-hosted Montserrat.
Pages with password inputs (login, register w/ password step, dashboard, calendar) load a
second self-hosted `GeneralSans-Medium.woff2` (~23 KB) on top of `GeneralSans-Regular.woff2`
(~23 KB each). Zero font files are currently preloaded or precached by the service worker.

## Manual PWA checklist (before)

| Check | Status |
|---|---|
| `manifest.json` theme_color | `#F37021` (orange) — brief wants white |
| `manifest.json` background_color | `#FFFFFF` — already correct |
| `<meta name="theme-color">` | `#F37021`, single value, not media-aware |
| `<meta name="viewport">` | `width=device-width, initial-scale=1, **maximum-scale=1**, viewport-fit=cover` — blocks pinch-zoom |
| `sw.js` reachable | Yes, cached (`cache-control: public, max-age=0, must-revalidate`) |
| `sw.js` precache scope | Only `/offline.html` — no fonts precached |
| Service worker registration | Registered client-side in `app/service-worker-register.tsx`, fire-and-forget |

## What changes next

Fonts, the `.neu-*` surface classes, button shapes, manifest/meta/sw.js per the guardrails
in the brief. Same pages, same method, re-run after the refresh for direct comparison.
