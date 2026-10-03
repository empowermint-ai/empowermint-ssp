'use client';

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from 'react';
import { useLocale, useMessages, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  LocaleConfig,
  getEnabledLocales,
  getLocaleConfig,
  isClientRenderedRoute,
  isEnabledLocale,
} from '@/config/locales';
import { useIntlOverride } from '@/components/i18n/IntlProvider';
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
  /** A learner's own choice: applies it, marks it explicit and saves it to the profile. */
  change: (code: string, source: LanguageSource) => void;
  /** Applies a language without recording a choice (used when syncing a saved profile language). */
  applyLocale: (code: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  enabled: [],
  change: () => {},
  applyLocale: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('language');
  const messages = useMessages() as Record<string, Record<string, string> | undefined>;
  const pathname = usePathname();
  const setOverride = useIntlOverride();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const enabled = getEnabledLocales();

  const applyLocale = useCallback(
    (code: string) => {
      if (!isEnabledLocale(code) || code === locale) return;
      setLocaleCookie(code);
      const previousTitle = document.title;
      const previousMetadataTitle = String(messages?.metadata?.title ?? '');

      const refreshServerTree = () => startTransition(() => router.refresh());

      // 1) Swap the client-side text right now - no remount, so nothing is lost.
      fetch(`/lang/messages?l=${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('messages'))))
        .then((next) => {
          setOverride({ locale: code, messages: next });
          if (previousMetadataTitle && previousTitle === previousMetadataTitle && next?.metadata?.title) {
            document.title = next.metadata.title;
          }
          // 2) Screens with server-rendered headings also need a server pass.
          if (!isClientRenderedRoute(pathname)) refreshServerTree();
        })
        .catch(() => {
          // Offline or the bundle could not load: fall back to the server pass.
          refreshServerTree();
        });
    },
    [locale, messages, pathname, router, setOverride]
  );

  const change = useCallback(
    (code: string, source: LanguageSource) => {
      if (!isEnabledLocale(code) || code === locale) return;
      markExplicitChoice();
      setPending(code);
      applyLocale(code);
      void persistPreferredLanguage(code, { from: locale, source });
    },
    [locale, applyLocale]
  );

  // Test hook for the Playwright run only (set NEXT_PUBLIC_I18N_TEST_HOOK=1); absent in real builds.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_I18N_TEST_HOOK !== '1') return;
    (window as unknown as { __sspSetLanguage?: typeof change }).__sspSetLanguage = change;
  }, [change]);

  // Show the confirmation only once the new language has actually rendered, so
  // the toast is written in the NEW language.
  useEffect(() => {
    if (pending && locale === pending) {
      toast.show(t('changed', { language: getLocaleConfig(pending).nativeName }));
      setPending(null);
    }
  }, [locale, pending, t, toast]);

  return (
    <LanguageContext.Provider value={{ locale, enabled, change, applyLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}
