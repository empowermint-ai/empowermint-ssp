import { getTranslations } from 'next-intl/server';
import { presetSubjectId } from '@/lib/i18n/subjects';

/** Server-component version of useSubjectLabel. */
export async function getSubjectLabel(): Promise<(storedName: string) => string> {
  const t = await getTranslations('presets');
  return (storedName: string) => {
    const id = presetSubjectId(storedName);
    if (!id) return storedName;
    return t.has(id) ? t(id) : storedName;
  };
}
