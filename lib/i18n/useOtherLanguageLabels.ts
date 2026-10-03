'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { getEnabledLocales } from '@/config/locales';
import { PRESET_SUBJECTS } from '@/lib/i18n/subjects';

/**
 * Preset subject labels in the OTHER enabled languages, keyed by the stored English
 * name, so search finds "Wiskunde" while the app is in English (and vice versa).
 * Only fetched once the learner starts searching; failures just mean no extra matches.
 */
export function useOtherLanguageLabels(active: boolean): Record<string, string[]> {
  const locale = useLocale();
  const [labels, setLabels] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const others = getEnabledLocales().filter((l) => l.code !== locale);
    Promise.all(
      others.map((l) =>
        fetch(`/lang/messages?l=${encodeURIComponent(l.code)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((bundles) => {
      if (cancelled) return;
      const next: Record<string, string[]> = {};
      for (const preset of PRESET_SUBJECTS) {
        next[preset.name] = bundles
          .map((b) => b?.presets?.[preset.id])
          .filter((v): v is string => typeof v === 'string');
      }
      setLabels(next);
    });
    return () => {
      cancelled = true;
    };
  }, [active, locale]);

  return labels;
}
