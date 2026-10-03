'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavArrows from '@/components/NavArrows';
import { logActivity } from '@/lib/logActivity';
import { useTranslations } from 'next-intl';
import { formatExamDuration } from '@/lib/i18n/duration';
import { useSubjectLabel } from '@/lib/i18n/useSubjectLabel';
import { getExamTimerColorState, type ExamTimerColorState } from '@/lib/examTimerColorState';

const SWEEP_PERIOD_MS = 25000;
const CENTER = 115;

const STATE_META: Record<ExamTimerColorState, { glow: string }> = {
  green: { glow: 'var(--glow-green)' },
  amber: { glow: 'var(--glow-amber)' },
  red: { glow: 'var(--glow-red)' },
};

function formatRemaining(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

function ThumbsUpIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4.5-8a2 2 0 013.8 1l-.9 5.5H18a2 2 0 012 2.3l-1.2 6A2 2 0 0116.8 20H10a3 3 0 01-3-3v-6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 13V4h3a1 1 0 011 1v7a1 1 0 01-1 1h-3zm0 0l-4.5 8a2 2 0 01-3.8-1l.9-5.5H6a2 2 0 01-2-2.3l1.2-6A2 2 0 017.2 4H14a3 3 0 013 3v6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExamTimerSessionClient({
  learnerId,
  subjectName,
  durationMinutes,
}: {
  learnerId: string;
  subjectName: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const t = useTranslations('examTimer');
  const subjectLabel = useSubjectLabel();
  // subjectName stays the stored (English) name for activity logging; only the
  // text shown on screen is translated.
  const displaySubject = subjectLabel(subjectName);
  const totalSeconds = durationMinutes * 60;
  const durationLabel = formatExamDuration(t, durationMinutes);

  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const minuteHandRef = useRef<SVGGElement>(null);
  const sweepHandRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>();
  const tickRef = useRef<() => void>();
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const elapsedSeconds = totalSeconds - remainingSeconds;
  const colorState = getExamTimerColorState(elapsedSeconds, totalSeconds);
  const meta = STATE_META[colorState];

  const finishSession = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setCompleted(true);
    await logActivity(learnerId, 'exam_timer_completed', {
      subject: subjectName,
      durationMinutes,
      endedEarly: false,
    });
  }, [learnerId, subjectName, durationMinutes]);

  useEffect(() => {
    if (!started || completed) return;

    function tick() {
      if (pausedAtRef.current !== null || endedRef.current) return;

      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedS = elapsedMs / 1000;
      const remaining = Math.max(0, totalSeconds - elapsedS);

      const minuteAngle = Math.min(360, (elapsedS / totalSeconds) * 360);
      minuteHandRef.current?.setAttribute('transform', `rotate(${minuteAngle} ${CENTER} ${CENTER})`);

      const sweepAngle = ((elapsedMs % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS) * 360;
      sweepHandRef.current?.setAttribute('transform', `rotate(${sweepAngle} ${CENTER} ${CENTER})`);

      setRemainingSeconds((prev) => {
        const next = Math.ceil(remaining);
        return next !== prev ? next : prev;
      });

      if (remaining <= 0) {
        finishSession();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    tickRef.current = tick;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [started, completed, totalSeconds, finishSession]);

  function handleStart() {
    startTimeRef.current = Date.now();
    setStarted(true);
    logActivity(learnerId, 'exam_timer_started', { subject: subjectName, durationMinutes });
  }

  function togglePause() {
    if (isPaused) {
      if (pausedAtRef.current !== null) {
        startTimeRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      setIsPaused(false);
      if (tickRef.current) {
        rafRef.current = requestAnimationFrame(tickRef.current);
      }
    } else {
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  }

  async function handleEndEarly() {
    if (endedRef.current) return;
    endedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    await logActivity(learnerId, 'exam_timer_completed', {
      subject: subjectName,
      durationMinutes,
      endedEarly: true,
    });
    router.push('/dashboard');
  }

  function handleFeedback(rating: 'up' | 'down') {
    if (feedback !== null) return;
    setFeedback(rating);
    logActivity(learnerId, 'exam_timer_feedback', { subject: subjectName, durationMinutes, rating });
  }

  return (
    <main
      className="min-h-dvh bg-bg flex flex-col items-center px-[22px] pt-[38px]"
      style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <div className="w-full">
        <NavArrows showForward={false} />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase tracking-wide text-teal text-center mt-4">
        {t('session.eyebrow')}
      </p>

      <div className="w-full mt-4">
        <div className="flex justify-between items-baseline">
          <span className="font-heading font-bold text-[10px] uppercase tracking-wide text-text-muted">
            {t('session.subject')}
          </span>
          <span className="font-body text-[13px] text-text-primary">{displaySubject}</span>
        </div>
        <div className="flex justify-between items-baseline mt-1">
          <span className="font-heading font-bold text-[10px] uppercase tracking-wide text-text-muted">
            {t('session.duration')}
          </span>
          <span className="font-body text-[13px] text-text-primary">{durationLabel}</span>
        </div>
        <div className="w-full h-[1.5px] bg-orange mt-3" />
      </div>

      <h1
        className="font-heading font-bold text-[21px] text-center mt-4 text-text-primary"
        style={{ letterSpacing: '-0.025em' }}
      >
        {displaySubject}
      </h1>
      <p className="font-body text-[14px] text-center mt-1 text-orange-text">{t('session.studySession')}</p>

      <div className="relative mt-6" style={{ width: 230, height: 230 }}>
        <div
          className="absolute rounded-full transition-[background-color,opacity] duration-700"
          style={{
            inset: '-32px',
            backgroundColor: meta.glow,
            filter: colorState === 'red' ? 'blur(48px)' : 'blur(38px)',
            opacity: colorState === 'red' ? 0.55 : colorState === 'amber' ? 0.4 : 0.3,
          }}
        />

        <div className="neu-raised relative rounded-full w-full h-full flex items-center justify-center">
          <svg width={230} height={230} viewBox="0 0 230 230">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={104}
              fill="none"
              style={{ stroke: meta.glow, transition: 'stroke 0.7s' }}
              strokeWidth={5}
            />

            {/* Recessed dial face */}
            <circle cx={CENTER} cy={CENTER} r={95} style={{ fill: 'var(--neu-shadow-dark)' }} />
            <circle cx={CENTER} cy={CENTER} r={92} style={{ fill: 'var(--color-bg)' }} />

            <text
              x={CENTER}
              y={CENTER + 24}
              textAnchor="middle"
              className="font-heading font-bold"
              style={{ fill: 'var(--color-text-muted)', fontSize: 8, letterSpacing: '2px' }}
            >
              empowermint
            </text>
            <text
              x={CENTER}
              y={CENTER + 35}
              textAnchor="middle"
              className="font-body"
              style={{ fill: 'var(--color-text-muted)', fontSize: 7.5 }}
            >
              {displaySubject}
            </text>

            <g ref={sweepHandRef}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={CENTER - 70}
                style={{ stroke: meta.glow }}
                strokeWidth={1.4}
              />
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={CENTER + 14}
                style={{ stroke: meta.glow }}
                strokeWidth={1.4}
              />
              <circle cx={CENTER} cy={CENTER + 14} r={3.5} style={{ fill: meta.glow }} />
            </g>

            <g ref={minuteHandRef}>
              <polygon
                points={`${CENTER - 3.5},${CENTER} ${CENTER + 3.5},${CENTER} ${CENTER + 1.3},${
                  CENTER - 66
                } ${CENTER},${CENTER - 72} ${CENTER - 1.3},${CENTER - 66}`}
                style={{ fill: 'var(--color-text-primary)' }}
              />
            </g>

            <circle cx={CENTER} cy={CENTER} r={4} style={{ fill: 'var(--color-text-primary)' }} />
          </svg>
        </div>
      </div>

      {!completed ? (
        <>
          <p className="font-heading font-bold text-[22px] mt-6 text-text-primary">
            {started ? formatRemaining(remainingSeconds) : t('session.minutes', { minutes: durationMinutes })}
          </p>
          <p
            className="font-body text-[10px] uppercase mt-1 transition-colors duration-700"
            style={{ color: meta.glow, letterSpacing: '1.5px' }}
          >
            {t(`status.${colorState}`)}
          </p>

          <div className="flex-1" />

          {!started ? (
            <button
              type="button"
              onClick={handleStart}
              className="neu-raised-accent w-full font-heading font-bold text-[14px] text-black rounded-full py-[15px] transition-all active:scale-[0.97]"
            >
              {t('session.start')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={togglePause}
                className="neu-raised w-full font-heading font-bold text-[13.5px] text-text-primary rounded-neu-md py-[14px] transition-all active:scale-[0.97]"
              >
                {isPaused ? t('session.resume') : t('session.pause')}
              </button>
              <button
                type="button"
                onClick={handleEndEarly}
                className="font-body text-[12px] text-text-muted underline text-center mt-3"
              >
                {t('session.endEarly')}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <h2
            className="font-heading font-bold text-[21px] text-center mt-6 text-text-primary"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('session.timesUp')}
          </h2>
          <p className="font-heading font-bold text-[12px] uppercase tracking-wide text-center mt-1 text-text-muted">
            {t('session.howDidItGo')}
          </p>

          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              type="button"
              disabled={feedback !== null}
              onClick={() => handleFeedback('up')}
              aria-label={t('session.thumbsUp')}
              className={`flex items-center justify-center w-[60px] h-[60px] rounded-full transition-all disabled:opacity-40 ${
                feedback === 'up' ? 'neu-pressed-accent text-black' : 'neu-raised text-text-primary'
              }`}
            >
              <ThumbsUpIcon />
            </button>
            <button
              type="button"
              disabled={feedback !== null}
              onClick={() => handleFeedback('down')}
              aria-label={t('session.thumbsDown')}
              className={`flex items-center justify-center w-[60px] h-[60px] rounded-full transition-all disabled:opacity-40 ${
                feedback === 'down' ? 'neu-pressed-accent text-black' : 'neu-raised text-text-primary'
              }`}
            >
              <ThumbsDownIcon />
            </button>
          </div>

          {feedback && (
            <p className="font-body text-[11px] text-teal text-center mt-2">{t('session.thanks')}</p>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="neu-raised-accent w-full font-heading font-bold text-[14px] text-black rounded-full py-[15px] transition-all active:scale-[0.97]"
          >
            {t('session.back')}
          </button>
        </>
      )}
    </main>
  );
}
