'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSubjectLabel } from '@/lib/i18n/useSubjectLabel';
import {
  ACTIVE_SESSION_KEY,
  ActiveSession,
  elapsedFraction,
  formatClock,
  isFinished,
  loadActiveSession,
  pauseSession,
  remainingSeconds,
  resumeSession,
  saveActiveSession,
} from '@/lib/activeSession';

/**
 * Overlay shown under the header ONLY while a Pomodoro or exam-mock session is
 * running. Nothing renders (and no space is reserved) when there is none, so the
 * calculator's own layout is untouched.
 */
export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      setSession(loadActiveSession());
      setNow(Date.now());
    };
    refresh();
    const id = window.setInterval(refresh, 250);
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_SESSION_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return { session, setSession, now };
}

export default function FocusStrip({
  variant,
  session,
  now,
  onChange,
}: {
  variant: 'scientific' | 'financial';
  session: ActiveSession | null;
  now: number;
  onChange: (next: ActiveSession) => void;
}) {
  const t = useTranslations('calculator.focus');
  const subjectLabel = useSubjectLabel();

  if (!session) return null;

  const finished = isFinished(session, now);
  const paused = session.pausedAt !== null;
  const subject = variant === 'financial' ? t('finance') : subjectLabel(session.label);
  const remaining = remainingSeconds(session, now);
  const unelapsedPct = (1 - elapsedFraction(session, now)) * 100;

  function togglePause() {
    if (!session) return;
    const next = paused ? resumeSession(session) : pauseSession(session);
    saveActiveSession(next);
    onChange(next);
  }

  return (
    <div className="px-6 pt-[14px]" role="timer" aria-live="off">
      <div className="text-[11.5px] font-bold uppercase tracking-[0.4px]" style={{ color: 'var(--calc-muted)' }}>
        {t('label')} · {subject}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <div
          className="font-heading font-extrabold tabular-nums tracking-[1px]"
          style={{ fontSize: variant === 'scientific' ? 38 : 32, direction: 'ltr' }}
        >
          {formatClock(remaining)}
        </div>
        {finished ? (
          <Link href={session.returnPath} className="text-[13px] font-bold" style={{ color: 'var(--calc-accent)' }}>
            {t('finished')}
          </Link>
        ) : (
          <button
            type="button"
            onClick={togglePause}
            className="text-[13px] font-bold"
            style={{ color: 'var(--calc-accent)' }}
          >
            {paused ? `▶ ${t('resume')}` : `⏸ ${t('pause')}`}
          </button>
        )}
      </div>
      {/* Gradient is always full width; a track-coloured cover on the right hides the
          part that has not elapsed yet, so the colour reached shows how urgent it is. */}
      <div
        className="relative mt-[10px] h-[6px] overflow-hidden rounded-full"
        style={{ background: 'var(--calc-track)', direction: 'ltr' }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, #22C55E 0%, #F37021 55%, #E5484D 100%)' }}
        />
        <div
          className="absolute bottom-0 right-0 top-0"
          style={{ width: `${unelapsedPct}%`, background: 'var(--calc-track)' }}
        />
      </div>
    </div>
  );
}
