import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isEnabledLocale,
  pickFromAcceptLanguage,
} from '@/config/locales';
import { loadMessages } from '@/lib/i18n/loadMessages';

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

  const messages = await loadMessages(locale);

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
