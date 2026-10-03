This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Languages (English + Afrikaans)

Text lives in `messages/<code>.json`, grouped by screen (`welcome`, `auth`, `subjects`, `plan`, `timer`, ...). English is the source; a key missing from another language falls back to the English text. Only the active language is loaded. URLs never change - the language is a cookie (`NEXT_LOCALE`), not a path prefix.

Languages are switched on per environment with `NEXT_PUBLIC_ENABLED_LOCALES` (for example `en,af` on preview, `en` on production). With only `en`, the picker, the "now available" notice and `?lang=` links are hidden or ignored and the app behaves as it did before.

### How to add a new language (for example isiZulu, `zu`)

1. **Config:** add one entry to `LOCALES` in `config/locales.ts` - `{ code: 'zu', nativeName: 'isiZulu', intl: 'zu-ZA', noticeNative: '...' }`. The picker, the sheet and the notice card are driven from this list.
2. **Messages:** copy `messages/en.json` to `messages/zu.json` and translate the values (keep `{placeholders}` and the `{count, plural, ...}` shape exactly; `presets.*` holds the labels for the preset subject list - the stored subject name stays English). Anything left out falls back to English. Run `npm run i18n:check` to catch missing keys, mismatched placeholders and unused keys.
3. **Offline page:** add one line to `MESSAGES` in `public/offline.html` (the page is served from the service-worker cache, so it cannot read the message files).
4. **Announcement (optional):** to show the one-time "now available" card on Today's Plan, set `LANGUAGE_ANNOUNCEMENT` in `config/locales.ts` to the new code and an end date.
5. **Switch it on:** add the code to `NEXT_PUBLIC_ENABLED_LOCALES` (for example `en,af,zu`) in the environment you want it in.

Translator hand-off: `npm run i18n:export` writes `translations-review.csv` (key, English, translation, screen, notes). After review, `npm run i18n:import` writes the edited column back into the message file.

Other checks: `npm run i18n:scan` looks for hard-coded English in `app/` and `components/` (it ignores class names, routes, URLs, enum-like values, brand names and anything in a `t()` call). The Playwright scripts in `scripts/i18n/` (`e2e.mjs`, `sweep.mjs`, `persist.mjs`, `compare.mjs`) are development-only; they create throwaway accounts and delete them afterwards.

### Saved language

`users.preferred_language` (migration `supabase/migrations/20261003090000_add_preferred_language.sql`) remembers the choice across devices. The app works before the migration is applied: it falls back to the cookie only.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
