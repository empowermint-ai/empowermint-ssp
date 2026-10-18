'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSource } from '@/lib/i18n/client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import LanguageSheet from '@/components/i18n/LanguageSheet';
import { GlobeIcon } from '@/components/i18n/icons';

/**
 * Welcome-screen language control: one compact pill showing the current language.
 * Tapping it opens the scrolling language sheet (the same one the login globe and
 * Settings use), so the screen stays tidy however many languages are switched on.
 * Hidden unless more than one language is enabled.
 */
export default function LanguageControl({ source }: { source: LanguageSource }) {
  const { locale, enabled } = useLanguage();
  const t = useTranslations('language');
  const [open, setOpen] = useState(false);

  if (enabled.length < 2) return null;

  const current = enabled.find((l) => l.code === locale) ?? enabled[0];

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('open')}: ${current.nativeName}`}
        onClick={() => setOpen(true)}
        className="soft-raised inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 font-body text-[14px] font-medium text-text-primary"
      >
        <GlobeIcon size={18} />
        <span lang={current.code}>{current.nativeName}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <LanguageSheet source={source} onClose={() => setOpen(false)} />}
    </div>
  );
}
