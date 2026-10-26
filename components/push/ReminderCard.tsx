'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import ReminderSheet from '@/components/push/ReminderSheet';
import { fetchReminderSettings, pushSupported } from '@/lib/push/client';

// "Not now" snoozes the card rather than hiding it for good, so a learner who
// said no on a busy day is asked again later. Each spot keeps its own snooze.
const SNOOZE_DAYS = { plan: 5, complete: 2 } as const;
const snoozeKey = (variant: Variant) => `ssp_push_card_snoozed_${variant}`;

type Variant = keyof typeof SNOOZE_DAYS;

function isSnoozed(variant: Variant): boolean {
  try {
    const until = Number(localStorage.getItem(snoozeKey(variant)));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Invitation to turn on the daily reminder. Shown on Today's Plan and again right
 * after a finished session. Hidden once reminders are on, or while snoozed.
 */
export default function ReminderCard({ variant = 'plan' }: { variant?: Variant }) {
  const t = useTranslations('push');
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!pushSupported() || Notification.permission === 'denied') return;
      if (isSnoozed(variant)) return;
      const settings = await fetchReminderSettings();
      if (!cancelled && settings && !settings.enabled) setVisible(true);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [variant]);

  function dismiss() {
    try {
      localStorage.setItem(snoozeKey(variant), String(Date.now() + SNOOZE_DAYS[variant] * 86_400_000));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className={`neu-raised rounded-neu-md px-[14px] py-[13px] ${variant === 'plan' ? 'mt-4' : 'w-full mb-[22px]'}`}>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex items-center justify-center w-[34px] h-[34px] rounded-[9px] bg-orange/15 text-orange-text flex-shrink-0"
          >
            <BellIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-[13px] text-text-primary">{t('cardTitle')}</p>
            <p className="font-body text-[11.5px] text-text-muted mt-[2px]">{t('cardBody')}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-[10px]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="neu-raised-accent flex-1 font-heading font-bold text-[12.5px] text-black rounded-neu-sm py-[9px]"
          >
            {t('enable')}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="neu-raised flex-1 font-heading font-bold text-[12.5px] text-text-primary rounded-neu-sm py-[9px]"
          >
            {t('notNow')}
          </button>
        </div>
      </div>
      {open && (
        <ReminderSheet
          onClose={() => {
            setOpen(false);
            setVisible(false);
          }}
        />
      )}
    </>
  );
}
