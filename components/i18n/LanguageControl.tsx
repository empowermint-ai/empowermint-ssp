'use client';

import { useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSource } from '@/lib/i18n/client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { CheckIcon, GlobeIcon } from '@/components/i18n/icons';

/**
 * Compact segmented language picker (welcome screen). Raised = unselected,
 * pressed + Hermes Orange + check + bold = selected, so the selected state never
 * relies on shadow alone. Hidden unless more than one language is enabled.
 */
export default function LanguageControl({ source }: { source: LanguageSource }) {
  const { locale, enabled, change } = useLanguage();
  const t = useTranslations('language');
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (enabled.length < 2) return null;

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = enabled.length - 1;
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    if (next < 0) return;
    event.preventDefault();
    change(enabled[next].code, source);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5 text-text-muted">
        <GlobeIcon />
        <span id={labelId} className="font-body text-[12px] font-medium">
          {t('label')}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="soft-pressed grid w-full max-w-[320px] gap-[8px] rounded-[22px] p-[10px]"
        style={{ gridTemplateColumns: `repeat(${Math.min(enabled.length, 3)}, minmax(0, 1fr))` }}
      >
        {enabled.map((language, index) => {
          const selected = language.code === locale;
          return (
            <button
              key={language.code}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              lang={language.code}
              onClick={() => change(language.code, source)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`flex min-h-[38px] min-w-0 items-center justify-center gap-1 rounded-full px-1 font-body text-[12px] transition-colors min-[360px]:px-2 min-[360px]:text-[13px] ${
                selected
                  ? 'soft-pressed-accent font-bold text-black'
                  : 'soft-raised font-medium text-text-body'
              }`}
            >
              {selected && (
                <span className="hidden min-[360px]:inline-flex">
                  <CheckIcon size={13} />
                </span>
              )}
              <span className="truncate">{language.nativeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
