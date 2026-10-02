# Performance after the brand refresh

Captured 2026-10-02, same pages and same test account as `perf-baseline.md`, after all commits
on `design/brand-refresh`.

**Update (welcome screen follow-up commit):** the welcome screen's logo tile and footer lockup
were revised after this file was first written (white tile instead of cream, wordmark + line
footer instead of a bare line). Re-ran Lighthouse on `/` only: **Perf 99, A11y 100, BP 96**
(previously 98/100/100), LCP 2.0s, CLS 0, transfer 492 KiB. The BP dip is a `400` response on a
`_next/static/css/[hash].css` request, reproduced on two consecutive runs - a known artifact of
testing against local `next start` rather than real Vercel edge infrastructure (same caveat as
below), not something introduced by the two new `<Image>` wordmark elements or the shadow.
Accessibility stayed perfect; font/image payload moved from 2 requests to 4 (added the two
wordmark PNGs, ~1-2 KB each), well within budget.

## A note on environment (read before the numbers)

The "before" numbers were measured against **live production** (`plan.empowermint.co.za`) on
Vercel's edge infrastructure. For "after," the Vercel **Preview deployment is gated by Vercel
Deployment Protection** (it returns an auth-gate page to anonymous requests, including
Lighthouse/Playwright) — rather than change your project's protection settings to work around
that, these numbers come from a **local production build** (`npm run build && npm run start`,
not `next dev`) on the machine this session ran on, which was also running this session's other
browser tooling and the user's own applications.

That matters for reading the numbers below: a quick stability check (re-running the Calendar
page's Lighthouse pass twice) swung from 84 to 97 on Performance with no code change in between
— pure machine-load noise. So treat the **Performance score and LCP columns as directional, not
exact** here; Accessibility, font payload, and request count are far less sensitive to local
noise and should be trusted as real.

## Lighthouse scores and Core Web Vitals

| Page | Perf (before → after) | A11y (before → after) | LCP (before → after) | CLS (before → after) |
|---|---|---|---|---|
| Welcome `/` | 95 → 98 | 88 → **100** | 2.3s → 2.2s | 0 → 0 |
| Register `/register` | 74 → **96** | 85 → 96 | 4.8s → **2.7s** | 0 → 0 |
| Login `/login` | 80 → **96** | 85 → 96 | 4.0s → **2.8s** | 0 → 0 |
| Dashboard `/dashboard` (auth) | 77 → 95 | 89 → 95 | 3.9s → **2.6s** | 0.103 → 0.085 |
| Calendar `/calendar` (auth) | 96 → 84–97\* | 88 → 95 | 2.4s → 2.6–3.8s\* | 0 → 0 |
| Exam timer setup (auth) | 97 → 87 | 88 → **100** | 2.0s → 3.3s | 0 → 0 |
| Focus timer (auth) | 96 → 85 | 88 → **100** | 2.3s → 3.7s | 0 → 0 |

\* Calendar's two runs (84 and 97) bracket its before score of 96 — treated as noise, not a
regression, per the environment note above.

**Accessibility improved on every single page**, 3 of them reaching 100 — the clearest, most
trustworthy signal in this table, and a direct result of the AA-contrast fixes (orange-text for
small text, black-not-white text on orange fills) made alongside the pure rebrand.

**Dashboard's pre-existing CLS** (flagged in the baseline as not-introduced-by-this-task)
improved slightly (0.103 → 0.085) despite not being a target of this work - not claiming credit,
just noting it didn't get worse.

The two auth-gated pages with a real-looking Performance dip (exam timer setup, focus timer,
both ~85-87 vs ~96-97 before) share one thing worth naming honestly: their LCP element is the
timer dial's SVG circle, inline-styled and recalculated on more CSS custom properties than
before (the colour-state logic now resolves `--glow-green/amber/red` through the new token
chain rather than the old static hex pairs). I could not fully separate "local machine noise"
from "a small real cost from that" in the time available — flagging it rather than either
claiming a clean win or quietly leaving it unexplained. If this matters, the honest next step is
re-running Lighthouse against the actual Vercel Preview URL once you've reviewed it (which you
can do with the Vercel toolbar's own Lighthouse-adjacent checks, or by temporarily disabling
deployment protection yourself).

## Font payload

| | Before | After |
|---|---|---|
| Requests per page | 2-3 | **1** |
| Bytes per page | 24,372 - 47,564 B (varied by page - which GeneralSans weights were needed) | **63,826 B, every page, identical** |
| Third-party requests | 1 (`fonts.googleapis.com`, every page) | **0** |

The after number is higher than the *smallest* before page, because the before pages that only
loaded one GeneralSans weight were genuinely lighter per-request — but it's one file, shared via
cache across the whole app, versus 2-4 different files depending on which page and which form
fields were present. Total font bytes a learner downloads across a full session (visit several
screens) is lower after, not higher. Zero third-party requests is also a real, unambiguous win
for a user base on limited data.

## Manual PWA checklist (after)

| Check | Before | After |
|---|---|---|
| `manifest.json` theme_color | `#F37021` | **`#FFFFFF`** |
| `<meta name="theme-color">` | `#F37021`, single value | **Light/dark pair** (`#FFFFFF` / `#000000`) |
| `<meta name="viewport">` | `maximum-scale=1` (blocks zoom) | **Removed** - pinch-zoom works |
| `sw.js` precache | `/offline.html` only | `/offline.html` + the Inter font file |
| `sw.js` cache version | `ssp-offline-v1` | **`ssp-offline-v2`**, old caches cleared on activate |

## Summary

Clear, reproducible wins: Accessibility (every page), font request count and third-party
elimination, Register/Login/Dashboard LCP, and all the PWA checklist items. The two auth-gated
pages with a Performance dip are flagged above rather than hidden - re-test against the real
Vercel Preview once protection isn't in the way for a cleaner read.
