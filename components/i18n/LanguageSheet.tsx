'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSource } from '@/lib/i18n/client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { CheckIcon } from '@/components/i18n/icons';

/** Bottom sheet listing every enabled language. Used by the login globe and Settings. */
export default function LanguageSheet({
  source,
  onClose,
}: {
  source: LanguageSource;
  onClose: () => void;
}) {
  const { locale, enabled, change } = useLanguage();
  const t = useTranslations('language');
  const [entered, setEntered] = useState(false);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setEntered(true);
      selectedRef.current?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
        style={{ opacity: entered ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        className="soft-raised fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] px-[22px] pb-[max(24px,env(safe-area-inset-bottom))] pt-3 transition-transform duration-200"
        style={{ transform: entered ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="mb-3 flex justify-center">
          <span className="h-[4px] w-10 rounded-full bg-line" />
        </div>
        <h2 className="mb-4 font-heading text-[18px] font-semibold text-text-primary">
          {t('title')}
        </h2>
        <div role="radiogroup" aria-label={t('title')} className="flex flex-col gap-3">
          {enabled.map((language) => {
            const selected = language.code === locale;
            return (
              <button
                key={language.code}
                ref={selected ? selectedRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                lang={language.code}
                onClick={() => {
                  change(language.code, source);
                  onClose();
                }}
                className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[18px] px-5 text-left font-body text-[16px] ${
                  selected
                    ? 'soft-pressed-accent font-bold text-black'
                    : 'soft-raised font-medium text-text-primary'
                }`}
              >
                <span>{language.nativeName}</span>
                {selected && <CheckIcon size={18} />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
