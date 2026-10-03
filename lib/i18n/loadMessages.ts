import { DEFAULT_LOCALE } from '@/config/locales';

export type Messages = { [key: string]: string | Messages };

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

/** Only the active language is loaded; anything it lacks falls back to English. */
export async function loadMessages(locale: string): Promise<Messages> {
  const english = (await import('../../messages/en.json')).default as Messages;
  if (locale === DEFAULT_LOCALE) return english;
  return deepMerge(english, (await import(`../../messages/${locale}.json`)).default as Messages);
}
