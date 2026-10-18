// Single source of truth for languages. To add a language: add an entry here,
// add messages/<code>.json, and add the code to NEXT_PUBLIC_ENABLED_LOCALES.

export interface LocaleConfig {
  /** Short code, also the messages/<code>.json file name and the NEXT_LOCALE cookie value. */
  code: string;
  /** The language written in its own language - shown in the picker, never translated. */
  nativeName: string;
  /** BCP 47 tag handed to Intl for dates, numbers and plurals. */
  intl: string;
  /** Reading direction; omit for left-to-right. Drives <html dir> and the rtl: styles. */
  dir?: 'rtl';
  /** Written in a script the share-PDF font cannot draw (Arabic, Devanagari): the PDF is produced in English. */
  nonLatin?: boolean;
  /** One line, written in this language, used by the one-time "now available" notice card. */
  noticeNative?: string;
}

export const LOCALES: LocaleConfig[] = [
  { code: 'en', nativeName: 'English', intl: 'en-GB' },
  {
    code: 'af',
    nativeName: 'Afrikaans',
    intl: 'af-ZA',
    noticeNative: 'Nuut: die planner is nou in Afrikaans beskikbaar.',
  },
  {
    code: 'zu',
    nativeName: 'isiZulu',
    intl: 'zu-ZA',
    noticeNative: 'Okusha: i-planner manje iyatholakala ngesiZulu.',
  },
  {
    code: 'xh',
    nativeName: 'isiXhosa',
    intl: 'xh-ZA',
    noticeNative: 'Okutsha: i-planner ngoku iyafumaneka ngesiXhosa.',
  },
  {
    code: 'fr',
    nativeName: 'Français',
    intl: 'fr-FR',
    noticeNative: 'Nouveau : le planificateur est maintenant disponible en français.',
  },
  {
    // Western digits (nu-latn): dates, exam countdowns and phone numbers read the
    // same in every language.
    code: 'ar',
    nativeName: 'العربية',
    intl: 'ar-u-nu-latn',
    dir: 'rtl',
    nonLatin: true,
    noticeNative: 'جديد: المخطط متاح الآن بالعربية.',
  },
  {
    code: 'sw',
    nativeName: 'Kiswahili',
    intl: 'sw-KE',
    noticeNative: 'Mpya: mpangaji sasa anapatikana kwa Kiswahili.',
  },
  {
    code: 'ha',
    nativeName: 'Hausa',
    intl: 'ha-NG',
    noticeNative: 'Sabo: mai tsara karatu yanzu yana nan cikin Hausa.',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    intl: 'hi-IN',
    nonLatin: true,
    noticeNative: 'नया: प्लानर अब हिन्दी में उपलब्ध है।',
  },
];

export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
/** Short-lived marker set by the ?lang= link handler so the client can save + toast once. */
export const LOCALE_SRC_COOKIE = 'NEXT_LOCALE_SRC';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Which languages get the one-time notice card, and the date it stops showing. */
export const LANGUAGE_ANNOUNCEMENT = {
  codes: ['sw', 'ha', 'hi'],
  announcedUntil: '2027-02-28',
};

// English is always enabled. With only "en" enabled the picker, the notice card
// and ?lang= all switch off and the app behaves exactly as before.
// Screens whose visible text is rendered entirely in the browser. Switching
// language there swaps the messages in place and skips the server refresh, which
// Next.js 14 implements by re-mounting the page (it would wipe a half-typed form
// or reset a running timer). Any screen NOT listed here gets a refresh so its
// server-rendered headings follow too. Add a route only if its page.tsx never
// calls getTranslations().
export const CLIENT_RENDERED_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/timer',
  '/exam-timer',
  '/past-papers',
  '/calculator',
];

export function isClientRenderedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return CLIENT_RENDERED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function getEnabledLocales(): LocaleConfig[] {
  const raw = process.env.NEXT_PUBLIC_ENABLED_LOCALES ?? DEFAULT_LOCALE;
  const wanted = new Set(
    raw
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean)
  );
  wanted.add(DEFAULT_LOCALE);
  return LOCALES.filter((l) => wanted.has(l.code));
}

export function isEnabledLocale(code: string | null | undefined): code is string {
  return !!code && getEnabledLocales().some((l) => l.code === code);
}

export function isNonLatin(code: string): boolean {
  return !!LOCALES.find((l) => l.code === code)?.nonLatin;
}

export function getDir(code: string): 'rtl' | 'ltr' {
  return LOCALES.find((l) => l.code === code)?.dir ?? 'ltr';
}

export function getLocaleConfig(code: string): LocaleConfig {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

export function hasMultipleLanguages(): boolean {
  return getEnabledLocales().length > 1;
}

/** Pick the first language in an Accept-Language header that the app has enabled. */
export function pickFromAcceptLanguage(header: string | null | undefined): string | null {
  if (!header) return null;
  const enabled = new Set(getEnabledLocales().map((l) => l.code));
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, q] = part.trim().split(';q=');
      return { base: tag.toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1, index };
    })
    .filter((x) => x.base && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked.find((x) => enabled.has(x.base))?.base ?? null;
}
