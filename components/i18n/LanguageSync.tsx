'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getLocaleConfig, hasMultipleLanguages } from '@/config/locales';
import {
  hasExplicitChoice,
  markExplicitChoice,
  markSyncedThisSession,
  persistPreferredLanguage,
  readSavedLanguage,
  setLocaleCookie,
  takeLinkMarker,
  takePendingLanguage,
  wasSyncedThisSession,
} from '@/lib/i18n/client';
import { useToast } from '@/components/i18n/ToastProvider';

/**
 * Invisible. On load it (1) retries a profile save that failed earlier,
 * (2) finishes a ?lang= link (save + toast for logged-in learners), and
 * (3) once per session pulls a saved profile language onto this device.
 * Every step is best-effort - a failure just leaves the cookie in charge.
 */
export default function LanguageSync() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('language');
  const toast = useToast();

  useEffect(() => {
    if (!hasMultipleLanguages()) return;
    let cancelled = false;

    (async () => {
      try {
        const pendingSave = takePendingLanguage();
        if (pendingSave) await persistPreferredLanguage(pendingSave);

        const fromLink = takeLinkMarker();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled || !session) return;

        if (fromLink) {
          markExplicitChoice();
          markSyncedThisSession();
          await persistPreferredLanguage(locale, { from: fromLink, source: 'link' });
          toast.show(t('changed', { language: getLocaleConfig(locale).nativeName }));
          return;
        }

        if (wasSyncedThisSession()) return;
        markSyncedThisSession();
        if (hasExplicitChoice()) {
          await persistPreferredLanguage(locale);
          return;
        }
        const saved = await readSavedLanguage();
        if (!cancelled && saved && saved !== locale) {
          setLocaleCookie(saved);
          router.refresh();
        }
      } catch {
        // Cookie-only mode: nothing to do.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once per page load on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
