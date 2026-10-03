'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import LanguageSheet from '@/components/i18n/LanguageSheet';
import { GlobeIcon } from '@/components/i18n/icons';

/** Small round globe button (login screen) that opens the language sheet. */
export default function LanguageGlobeButton() {
  const { enabled } = useLanguage();
  const t = useTranslations('language');
  const [open, setOpen] = useState(false);

  if (enabled.length < 2) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t('open')}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="soft-raised flex h-[44px] w-[44px] items-center justify-center rounded-full text-text-primary"
      >
        <GlobeIcon size={20} />
      </button>
      {open && <LanguageSheet source="login" onClose={() => setOpen(false)} />}
    </>
  );
}
