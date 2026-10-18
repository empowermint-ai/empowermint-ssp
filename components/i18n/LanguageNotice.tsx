'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LANGUAGE_ANNOUNCEMENT, getLocaleConfig, isEnabledLocale } from '@/config/locales';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { GlobeIcon } from '@/components/i18n/icons';
import { announceNoticeChange, languageNoticeKey } from '@/lib/i18n/noticeStorage';

// One key per announcement (the codes joined), so a learner who dismissed an
// earlier announcement (for example Afrikaans) still sees a new one.
const storageKey = languageNoticeKey;

/**
 * One-time "now available in <language>" card for learners who are not on that
 * language yet. Generic: driven by LANGUAGE_ANNOUNCEMENT in config/locales.ts.
 * Only ever rendered on Today's Plan - never on the timer or exam screens.
 */
export default function LanguageNotice() {
  const { locale, change } = useLanguage();
  const t = useTranslations('notice');
  const [visible, setVisible] = useState(false);
  const { announcedUntil } = LANGUAGE_ANNOUNCEMENT;
  const codes = LANGUAGE_ANNOUNCEMENT.codes.filter((c) => isEnabledLocale(c));
  const codesKey = codes.join('-');

  useEffect(() => {
    if (codes.filter((c) => c !== locale).length === 0) {
      setVisible(false);
      return;
    }
    const expired = Date.now() > new Date(`${announcedUntil}T23:59:59`).getTime();
    let hidden = false;
    try {
      hidden =
        localStorage.getItem(storageKey(codes, 'dismissed')) === '1' ||
        localStorage.getItem(storageKey(codes, 'done')) === '1';
    } catch {
      // Storage blocked: just show it.
    }
    setVisible(!expired && !hidden);
  }, [locale, codesKey, announcedUntil]);

  if (!visible) return null;

  // The learner's own language is left out of the list (a Zulu learner is offered the other three).
  const targets = codes.filter((c) => c !== locale).map((c) => getLocaleConfig(c));
  // Joined by hand with a per-language "and": the browser's list formatter has no data for
  // several of these languages and would fall back to English. "," means a plain comma list.
  const names = targets.map((l) => l.nativeName);
  const and = t('listAnd');
  const languages =
    names.length < 2
      ? names.join('')
      : and === ','
        ? names.join(', ')
        : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;

  function remember(kind: 'dismissed' | 'done') {
    try {
      localStorage.setItem(storageKey(codes, kind), '1');
    } catch {
      // ignore
    }
    announceNoticeChange();
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
            {t('headline', { languages })}
          </p>
          {targets.map(
            (target) =>
              target.noticeNative && (
                <p key={target.code} lang={target.code} dir={target.dir} className="mt-1 font-body text-[13px] leading-snug text-text-body">
                  {target.noticeNative}
                </p>
              )
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {targets.map((target) => (
          <button
            key={target.code}
            type="button"
            onClick={() => {
              remember('done');
              setVisible(false);
              change(target.code, 'notice');
            }}
            className="soft-pressed-accent min-h-[44px] rounded-full px-3 font-body text-[14px] font-bold text-black"
          >
            {t('switch', { language: target.nativeName })}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            remember('dismissed');
            setVisible(false);
          }}
          className="soft-raised col-span-2 min-h-[44px] w-full rounded-full px-5 font-body text-[14px] font-medium text-text-body"
        >
          {t('notNow')}
        </button>
      </div>
    </section>
  );
}
