import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isEnabledLocale,
  pickFromAcceptLanguage,
} from '@/config/locales';

type Messages = { [key: string]: string | Messages };

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    out[key] =
      typeof value === 'object' && value !== null && typeof existing === 'object' && existing !== null
        ? deepMerge(existing as Messages, value as Messages)
        : value;
  }
  return out;
}

// Locale order on the server: NEXT_LOCALE cookie (which already reflects an
// explicit choice, a ?lang= link, or a saved profile language synced on login),
// then the phone/browser language (first launch only), then English.
export default getRequestConfig(async () => {
  const cookieValue = cookies().get(LOCALE_COOKIE)?.value;
  let locale = DEFAULT_LOCALE;
  if (isEnabledLocale(cookieValue)) {
    locale = cookieValue;
  } else {
    const fromBrowser = pickFromAcceptLanguage(headers().get('accept-language'));
    if (fromBrowser) locale = fromBrowser;
  }

  const english = (await import('../messages/en.json')).default as Messages;
  // Anything missing from another language falls back to the English string.
  const messages =
    locale === DEFAULT_LOCALE
      ? english
      : deepMerge(english, (await import(`../messages/${locale}.json`)).default as Messages);

  return {
    locale,
    messages,
    timeZone: 'Africa/Johannesburg',
    formats: { dateTime: {} },
    // Unknown tags (e.g. a typo) must never crash a screen.
    onError: () => {},
    getMessageFallback: ({ namespace, key }) => `${namespace ? namespace + '.' : ''}${key}`,
  };
});
