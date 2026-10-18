'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider, useLocale, useMessages, useTranslations } from 'next-intl';
import FinancialCalculator from '@/components/calculator/FinancialCalculator';
import FocusStrip, { useActiveSession } from '@/components/calculator/FocusStrip';
import ScientificCalculator from '@/components/calculator/ScientificCalculator';
import { getDir, getEnabledLocales } from '@/config/locales';
import type { Messages } from '@/lib/i18n/loadMessages';

// Pill-row order requested for the calculator screen.
const PILL_ORDER = ['en', 'af', 'fr', 'ar', 'zu', 'xh'];

const bundleCache = new Map<string, Messages>();

/**
 * The calculator's own language: starts as the learner's SSP language and can be
 * changed here for this screen only. Nothing in this file writes the cookie, the
 * profile or the app-wide language - leaving the screen puts everything back.
 */
export default function CalculatorShell({ kind }: { kind: 'scientific' | 'financial' }) {
  const appLocale = useLocale();
  const appMessages = useMessages() as Messages;
  const [lang, setLang] = useState(appLocale);
  const [messages, setMessages] = useState<Messages>(appMessages);

  const choose = useCallback(
    async (code: string) => {
      if (code === lang) return;
      if (code === appLocale) {
        setLang(code);
        setMessages(appMessages);
        return;
      }
      let bundle = bundleCache.get(code);
      if (!bundle) {
        try {
          const res = await fetch(`/lang/messages?l=${encodeURIComponent(code)}`);
          if (!res.ok) return;
          bundle = (await res.json()) as Messages;
          bundleCache.set(code, bundle);
        } catch {
          return; // offline: stay in the current language
        }
      }
      setMessages(bundle);
      setLang(code);
    },
    [lang, appLocale, appMessages]
  );

  return (
    <NextIntlClientProvider
      locale={lang}
      messages={messages}
      timeZone="Africa/Johannesburg"
      onError={() => {}}
      getMessageFallback={({ namespace, key }) => `${namespace ? namespace + '.' : ''}${key}`}
    >
      <Frame kind={kind} lang={lang} onChoose={choose} />
    </NextIntlClientProvider>
  );
}

function Frame({
  kind,
  lang,
  onChoose,
}: {
  kind: 'scientific' | 'financial';
  lang: string;
  onChoose: (code: string) => void;
}) {
  const t = useTranslations('calculator');
  const router = useRouter();
  const [pillsOpen, setPillsOpen] = useState(false);
  const { session, setSession, now } = useActiveSession();
  const dir = getDir(lang);
  const enabled = getEnabledLocales();
  const pills = PILL_ORDER.filter((c) => enabled.some((l) => l.code === c));

  useEffect(() => {
    document.title = `${t('title')} · empowermint`;
  }, [t]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard');
  }

  return (
    <main
      dir={dir}
      lang={lang}
      className="calc flex min-h-dvh flex-col overflow-x-hidden"
    >
      <header className="flex items-center justify-between px-5 pb-[10px] pt-[max(14px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('back')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-extrabold"
          style={{ background: 'var(--calc-chip)', color: 'var(--calc-ink)' }}
        >
          <span className="inline-block rtl:-scale-x-100">←</span>
        </button>
        <picture>
          <source media="(prefers-color-scheme: dark)" srcSet="/brand/logo-em-power-white.png" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-em-power-black.png" alt="empower" className="block h-[26px] w-auto" />
        </picture>
        <button
          type="button"
          onClick={() => setPillsOpen((o) => !o)}
          aria-expanded={pillsOpen}
          aria-label={t('languageAria')}
          className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[12px] font-extrabold"
          style={{ background: 'var(--calc-chip)', color: 'var(--calc-ink)' }}
        >
          {lang.toUpperCase()}
        </button>
      </header>

      {pillsOpen ? (
        <div role="radiogroup" aria-label={t('languageAria')} className="flex flex-wrap justify-center gap-[6px] px-5 pb-2">
          {pills.map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={code === lang}
              onClick={() => onChoose(code)}
              className="rounded-full px-3 py-[6px] text-[12px] font-extrabold"
              style={
                code === lang
                  ? { background: 'var(--calc-accent)', color: '#FFFFFF' }
                  : { background: 'var(--calc-chip)', color: 'var(--calc-ink)' }
              }
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}

      {/* Visible proof of the screen's language: the keypad itself is never translated. */}
      <h1 className="px-6 pb-1 text-[13px] font-bold" style={{ color: 'var(--calc-muted)' }}>
        {kind === 'scientific' ? t('sciTitle') : t('finTitle')}
      </h1>

      <FocusStrip variant={kind} session={session} now={now} onChange={setSession} />

      {kind === 'scientific' ? <ScientificCalculator stripActive={!!session} /> : <FinancialCalculator />}
    </main>
  );
}
