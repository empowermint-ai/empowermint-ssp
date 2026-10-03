'use client';

import { useTranslations } from 'next-intl';
import { presetSubjectId } from '@/lib/i18n/subjects';

/** Returns a function that turns a stored subject name into the label to show. */
export function useSubjectLabel(): (storedName: string) => string {
  const t = useTranslations('presets');
  return (storedName: string) => {
    const id = presetSubjectId(storedName);
    if (!id) return storedName;
    return t.has(id) ? t(id) : storedName;
  };
}
