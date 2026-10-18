'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { NOTICE_CHANGE_EVENT, languageNoticePending } from '@/lib/i18n/noticeStorage';
import { calculatorFor } from '@/lib/educationLevel';

// One-time "there is now a calculator" card on Today's Plan. Remembered per device;
// stops showing on its own after the end date.
const STORAGE_KEY = 'ssp_calc_notice_v1';
const SHOW_UNTIL = '2027-01-31';

export default function CalculatorNotice({ grade }: { grade: string | null }) {
  const t = useTranslations('calculatorNotice');
  const tn = useTranslations('notice');
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const expired = Date.now() > new Date(`${SHOW_UNTIL}T23:59:59`).getTime();
      let hidden = false;
      try {
        hidden = localStorage.getItem(STORAGE_KEY) === '1';
      } catch {
        // Storage blocked: just show it.
      }
      // one card at a time: the language card goes first
      setVisible(!expired && !hidden && !languageNoticePending(locale));
    };
    evaluate();
    window.addEventListener(NOTICE_CHANGE_EVENT, evaluate);
    return () => window.removeEventListener(NOTICE_CHANGE_EVENT, evaluate);
  }, [locale]);

  if (!visible) return null;

  const kind = calculatorFor(null, grade);
  const body = kind === 'scientific' ? t('bodyScientific') : kind === 'financial' ? t('bodyFinancial') : t('bodyGeneric');

  function remember() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <section aria-label={t('aria')} className="soft-raised mb-5 rounded-[20px] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="soft-pressed mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
            <rect x="8" y="6" width="8" height="3.4" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1 text-balance">
          <p className="font-heading text-[14px] font-semibold leading-snug text-text-primary">{t('headline')}</p>
          <p className="mt-1 font-body text-[13px] leading-snug text-text-body">{body}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/calculator"
          onClick={remember}
          className="soft-pressed-accent flex min-h-[44px] items-center justify-center rounded-full px-3 font-body text-[14px] font-bold text-black"
        >
          {t('open')}
        </Link>
        <button
          type="button"
          onClick={remember}
          className="soft-raised min-h-[44px] rounded-full px-5 font-body text-[14px] font-medium text-text-body"
        >
          {tn('notNow')}
        </button>
      </div>
    </section>
  );
}
