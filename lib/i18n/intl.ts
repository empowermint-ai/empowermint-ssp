'use client';

import { useLocale } from 'next-intl';
import { getLocaleConfig } from '@/config/locales';

/** BCP 47 tag (en-GB / af-ZA) for the active language, for Intl date/number APIs. */
export function useIntlTag(): string {
  return getLocaleConfig(useLocale()).intl;
}
