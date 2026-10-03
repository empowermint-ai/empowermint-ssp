'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LANGUAGE_ANNOUNCEMENT, getLocaleConfig, isEnabledLocale } from '@/config/locales';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { GlobeIcon } from '@/components/i18n/icons';

const storageKey = (code: string, kind: 'dismissed' | 'done') => `ssp_lang_notice_${kind}_${code}`;

/**
 * One-time "now available in <language>" card for learners who are not on that
 * language yet. Generic: driven by LANGUAGE_ANNOUNCEMENT in config/locales.ts.
 * Only ever rendered on Today's Plan - never on the timer or exam screens.
 */
export default function LanguageNotice() {
  const { locale, change } = useLanguage();
  const t = useTranslations('notice');
  const [visible, setVisible] = useState(false);
  const { code, announcedUntil } = LANGUAGE_ANNOUNCEMENT;

  useEffect(() => {
    if (!isEnabledLocale(code) || locale === code) {
      setVisible(false);
      return;
    }
    const expired = Date.now() > new Date(`${announcedUntil}T23:59:59`).getTime();
    let hidden = false;
    try {
      hidden =
        localStorage.getItem(storageKey(code, 'dismissed')) === '1' ||
        localStorage.getItem(storageKey(code, 'done')) === '1';
    } catch {
      // Storage blocked: just show it.
    }
    setVisible(!expired && !hidden);
  }, [locale, code, announcedUntil]);

  if (!visible) return null;

  const target = getLocaleConfig(code);

  function remember(kind: 'dismissed' | 'done') {
    try {
      localStorage.setItem(storageKey(code, kind), '1');
    } catch {
      // ignore
    }
  }

  return (
    <section
      aria-label={t('aria')}
      className="soft-raised mb-5 rounded-[20px] px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <span className="soft-pressed mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-primary">
          <GlobeIcon size={18} />
        </span>
        <div className="min-w-0 flex-1 text-balance">
          <p className="font-heading text-[14px] font-semibold leading-snug text-text-primary">
            {t('headline', { language: target.nativeName })}
          </p>
          {target.noticeNative && (
            <p lang={target.code} className="mt-1 font-body text-[13px] leading-snug text-text-body">
              {target.noticeNative}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            remember('done');
            setVisible(false);
            change(code, 'notice');
          }}
          className="soft-pressed-accent min-h-[44px] flex-1 rounded-full px-5 font-body text-[14px] font-bold text-black"
        >
          {t('switch', { language: target.nativeName })}
        </button>
        <button
          type="button"
          onClick={() => {
            remember('dismissed');
            setVisible(false);
          }}
          className="soft-raised min-h-[44px] rounded-full px-5 font-body text-[14px] font-medium text-text-body"
        >
          {t('notNow')}
        </button>
      </div>
    </section>
  );
}
