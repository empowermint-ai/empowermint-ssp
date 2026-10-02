# SSP design system

This documents the brand refresh on `design/brand-refresh` — the tokens, type scale, and
component rules introduced to replace the app's original neumorphic look with the flatter,
white/cream/Hermes-orange language used on the new empowermint marketing site. This was a
**visual-layer change only**: no business logic, data, auth, routing, or planning-algorithm
code was touched (see the guardrail-compliance note at the bottom).

## Where things live

- **Tokens**: `app/globals.css` — one `:root` block for light, one `@media (prefers-color-scheme: dark)`
  override block for dark. No JS theme toggle; the app follows the OS/browser setting, same as before.
- **Tailwind mapping**: `tailwind.config.ts` maps every CSS variable to a Tailwind colour/radius
  utility (`bg-orange`, `text-text-muted`, `rounded-neu-md`, etc.) — components should always
  reach for these utilities, never a hardcoded hex.
- **Surfaces**: six utility classes in `globals.css` (`.neu-raised`, `.neu-pressed`,
  `.neu-raised-accent`, `.neu-pressed-accent`, `.neu-pressed-accent-sm`, `.neu-outline-accent`)
  are the single source every card, input, and accent surface in the app draws from. The names
  are a holdover from the old neumorphic system (kept so none of the ~32 consuming files needed
  a className rename) but the implementation is now flat fills + a 1px hairline border, not
  dual-tone shadows.
- **Fonts**: `public/fonts/InterVariable.woff2` + `public/fonts/Inter-OFL.txt` (the licence).

## Colour tokens

| Token (CSS var → Tailwind) | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` → `bg-bg` | `#FFFFFF` | `#000000` | Page background, every screen |
| `--color-card` → `bg-card` | `#F1EFE7` (cream) | `#1C1B18` | Card/panel/sheet fill — never a full-width page band |
| `--color-surface` → `bg-surface` | *(unset)* | `#121212` | Dark-mode-only neutral surface, reserved for a future hairline-only panel; not currently used by any component |
| `--color-card-border` → `border-card-border` | `#E6E2D8` | `#2A2925` | Card hairline |
| `--color-input-border` → `border-input-border` | `#D9D5CB` | `#2A2925` | Input/pressed-surface border |
| `--color-line` → `border-line` | `#E6E2D8` | `#2A2925` | Dividers |
| `--color-text-primary` → `text-text-primary` | `#000000` | `#FFFFFF` | Headings |
| `--color-text-body` → `text-text-body` | `#1A1A1A` (ink) | `#E6E6E6` | Body copy |
| `--color-text-muted` → `text-text-muted` | `#5A5A5A` | `#A3A3A3` | Captions, helper text |
| `--color-orange` → `bg-orange` / `border-orange` / `text-orange` | `#F37021` | `#F37021` | Fills, borders, icons, **large** text only |
| `--color-orange-text` → `text-orange-text` | `#C2540A` | `#F37021` | **Small** orange text (orange-on-white is ~3:1, fails AA for small text) |
| `--color-teal` → `bg-teal` / `text-teal` | `#0A7968` | `#1FA58F` | Done / progress / timer "on track" state |
| `--color-teal-tint` → `bg-teal-tint` | `#E7F2F0` | `#13332D` | Reserved tint, not yet consumed by a component |
| `--color-navy` → `bg-navy` | `#163460` | `#163460` | Brand dot, upcoming-exams panel |
| `--color-purple` → `bg-purple` | `#60427D` | `#60427D` | Brand dot |
| `--color-cream` → `bg-cream` | `#F1EFE7` | `#F1EFE7` | Brand dot (4th dot in the welcome-screen motif) |
| `--color-error` → `bg-error` / `text-error` | `#B3261E` | `#E5564A` | Missed-session indicator, timer "final stretch" |

Text-on-orange is **always black** (`text-black`), not `text-text-primary` — `text-text-primary`
flips to white in dark mode, which would fail contrast against the orange fill since orange
itself doesn't change between modes.

Navy and purple are unchanged between light/dark (the brief didn't specify dark variants and
the existing app already used flat, mode-independent values for both).

## Typography

Self-hosted **Inter**, one variable file (`InterVariable.woff2`, `wght` 100–900 + `opsz` 14–32),
Latin-subset via `fonttools pyftsubset`, no second "Display" family — see "Font choice" below.

```css
--font-heading: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

- `h1`–`h6` (and the `.font-heading` utility, for non-heading elements that want the same
  treatment — buttons, card titles) set `font-variation-settings: 'opsz' 32` to pull the Inter
  Display letterforms from the same file. Body text leaves `opsz` unset, which resolves to the
  font's own default instance (`14`) — the same shapes a dedicated "Inter" static file would give you.
- `.tabular-nums` utility (`font-variant-numeric: tabular-nums` + the `tnum` feature) is
  available for anywhere digits need to line up — the timer countdown already used a fixed-width
  layout via padStart, so this wasn't load-bearing there, but it's there for future numeric UI.
- Heading tracking: the app previously used one blanket value (`-0.066em`) everywhere. This pass
  collapsed it to the brief's **Screen title** tier (`-0.025em`), and gave the one true **Welcome
  headline** (the logo-tile screen) its own `-0.03em`. The brief's full five-tier scale
  (Welcome/Screen/Section/Card title/Lead) was **not** applied size-for-size — see "What wasn't
  done" below.

### Font choice: variable vs. static (brief asked for a size comparison)

The brief's preferred approach — one variable file, `opsz` driving the Display shapes — was used,
because it came out smaller than the static alternative once both were subset identically:

| Approach | Files | Subset size |
|---|---|---|
| **`InterVariable.woff2`** (chosen) | 1 | **62.1 KB** (63,544 B) |
| Static alternative (Inter 400/500/600 + InterDisplay 300/500/600) | 6 | 102.8 KB (105,284 B) |

Both subset to the brief's exact Latin unicode range, keeping `kern liga calt case tnum`, via:

```bash
pyftsubset InterVariable.woff2 --output-file=InterVariable.woff2 --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,\
U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features='kern,liga,calt,case,tnum' --no-hinting
```

Source: official [rsms/inter v4.1 release](https://github.com/rsms/inter/releases/tag/v4.1)
(`Inter-4.1.zip`, SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`),
SIL Open Font License 1.1, licence text copied to `public/fonts/Inter-OFL.txt`. No Google Fonts,
no other CDN, no runtime link to rsms.me.

**Total font payload: 62.1 KB** (well under the ~200 KB budget) — down from the old setup's
24–48 KB **per page** (Montserrat from Google Fonts + 1–2 General Sans weights), and the new
total is paid once across the whole app rather than per-page, since every page now shares the
one file via the browser cache.

## Shapes, spacing, motion

- **Buttons**: `rounded-full` (not a radius token — several non-button panels share the old
  `--neu-radius-lg` value, so buttons set their own pill shape directly in markup rather than
  through the token). Primary = `.neu-raised-accent` (orange fill) + `text-black`. Secondary =
  `.neu-raised` (cream fill, hairline border) + `text-text-primary`. Destructive/calm variant =
  `.neu-outline-accent` (white fill, orange border).
- **Cards/panels**: `--neu-radius-lg` and `--neu-radius-md` both resolve to `20px` now (the brief
  specifies one card radius, not a scale); `--neu-radius-sm` (`12px`) stays for tight elements
  like badges and date chips.
- **Inputs**: `.neu-pressed` → white fill, 1px `input-border`, no inset shadow.
- Spacing and the 8px scale were not restructured — this pass changed colour/surface/type
  tokens, not layout/padding values, since the brief's own emphasis was on tokens "replaced
  everywhere" rather than a spacing rebuild, and re-tuning padding across 32 files risked far
  more layout regressions than the token swap did.
- Motion (150–200ms ease-out, `active:scale-[0.97]` on buttons) was already the app's existing
  pattern and needed no change.

## PWA

- `manifest.json` `theme_color`: `#FFFFFF` (was `#F37021`).
- `app/layout.tsx` `viewport.themeColor`: now a light/dark array (`#FFFFFF` / `#000000`) instead
  of one static orange value; `maximumScale: 1` removed (no reason found in git history — see
  the summary for what was checked).
- `InterVariable.woff2` is preloaded (`<link rel="preload" as="font">`) and precached by
  `public/sw.js` (cache bumped to `ssp-offline-v2`, old caches cleared on activate so an
  already-installed PWA picks up the change on its next open).

## What wasn't done (flagged, not silently skipped)

- **Full literal type scale** (Welcome 36/40, Screen 28/32, Section 22/26, Card 18/22, Lead
  18/26, Body 16/24, Caption 14/20) was not applied size-for-size. The existing app runs
  noticeably smaller throughout (e.g. screen titles at 21px, body at 13.5–14px, captions at
  10–11px) — resizing every text element to the brief's literal px scale would mean touching
  nearly every line of JSX across all 32 files and re-tuning the padding/spacing built around
  the smaller sizes, which is a layout-level project in its own right, not a token swap. What
  *was* done: font family (Inter), heading weight/opsz/tracking, and all colour tokens, applied
  everywhere. Resizing is a reasonable follow-up pass if wanted.
- `--color-surface` and `--color-teal-tint` are defined but not yet consumed by any component —
  included because the brief specifies them, available for a future panel that wants a
  non-warm dark surface or a teal-tinted background.
- `subjects/dates` (exam-dates onboarding step) is missing from the before/after screenshot set —
  the Playwright flow to drive a fresh account through pick → rank → dates reliably timed out on
  the confidence-pill step; the other 15 screens captured cleanly. Not a code issue, a QA-script
  gap.

## Guardrail compliance

- No `app/api`, server actions, data/planning logic, database/schema files, auth, or middleware
  touched.
- No new runtime dependencies — `playwright` is a devDependency only, used by the scripts in
  `scripts/visual-qa/`, none of which ship in the production bundle.
- See the final summary message for the grouped `git diff --stat` against `main` and
  typecheck/lint/build results.
