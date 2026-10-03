'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="black" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 1L7 7L1 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExamTimerEntryCard() {
  const router = useRouter();
  const t = useTranslations('examTimer.entry');

  return (
    <button
      type="button"
      onClick={() => router.push('/exam-timer/setup')}
      className="neu-raised w-full flex items-center gap-3 rounded-neu-sm px-[12px] py-[9px] mb-[8px] text-left"
    >
      <span className="flex items-center justify-center w-[36px] h-[36px] rounded-full bg-orange flex-shrink-0">
        <ClockIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-[6px]">
          <span className="font-heading font-bold text-[13.5px] text-text-primary">
            {t('title')}
          </span>
          <span className="font-heading font-bold text-[8.5px] uppercase tracking-wide text-black bg-orange rounded-full px-[6px] py-[1.5px] flex-shrink-0">
            {t('badge')}
          </span>
        </span>
        <span className="block font-body text-[11px] text-text-muted mt-[2px] line-clamp-2">
          {t('subtitle')}
        </span>
      </span>
      <span className="text-text-muted flex-shrink-0">
        <ChevronIcon />
      </span>
    </button>
  );
}
