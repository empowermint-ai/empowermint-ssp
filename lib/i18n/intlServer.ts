import { getLocale } from 'next-intl/server';
import { getLocaleConfig } from '@/config/locales';

/** Server-component version of useIntlTag. */
export async function getIntlTag(): Promise<string> {
  return getLocaleConfig(await getLocale()).intl;
}
