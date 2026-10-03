'use client';

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LocaleConfig, getEnabledLocales, getLocaleConfig, isEnabledLocale } from '@/config/locales';
import {
  LanguageSource,
  markExplicitChoice,
  persistPreferredLanguage,
  setLocaleCookie,
} from '@/lib/i18n/client';
import { useToast } from '@/components/i18n/ToastProvider';

interface LanguageContextValue {
  locale: string;
  enabled: LocaleConfig[];
  change: (code: string, source: LanguageSource) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  enabled: [],
  change: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('language');
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const enabled = getEnabledLocales();

  const change = useCallback(
    (code: string, source: LanguageSource) => {
      if (!isEnabledLocale(code) || code === locale) return;
      setLocaleCookie(code);
      markExplicitChoice();
      setPending(code);
      // router.refresh() re-renders the server tree in the new language and
      // keeps client state (a running timer, a half-filled form) intact.
      startTransition(() => router.refresh());
      void persistPreferredLanguage(code, { from: locale, source });
    },
    [locale, router]
  );

  // Show the confirmation only once the new language has actually rendered, so
  // the toast is written in the NEW language.
  useEffect(() => {
    if (pending && locale === pending) {
      toast.show(t('changed', { language: getLocaleConfig(pending).nativeName }));
      setPending(null);
    }
  }, [locale, pending, t, toast]);

  return (
    <LanguageContext.Provider value={{ locale, enabled, change }}>
      {children}
    </LanguageContext.Provider>
  );
}
