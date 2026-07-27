'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import NavArrows from '@/components/NavArrows';

const TOTAL_SECONDS = 1500;
const SWEEP_PERIOD_MS = 25000;
const CENTER = 115;

type ColorState = 'green' | 'amber' | 'red';

function getColorState(remainingSeconds: number): ColorState {
  if (remainingSeconds > 600) return 'green';
  if (remainingSeconds >= 120) return 'amber';
  return 'red';
}

const STATE_META: Record<ColorState, { glow: string; label: string }> = {
  green: { glow: 'var(--glow-green)', label: 'REMAINING · PLENTY OF TIME' },
  amber: { glow: 'var(--glow-amber)', label: 'REMAINING · STEADY PACE' },
  red: { glow: 'var(--glow-red)', label: 'REMAINING · ALMOST THERE' },
};

function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function TimerClient({
  subjectId,
  subjectName,
  sessionNumber,
  totalSessions,
  dailyPlanId,
}: {
  subjectId: string;
  subjectName: string;
  sessionNumber: number;
  totalSessions: number;
  dailyPlanId: string;
}) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);

  const minuteHandRef = useRef<SVGGElement>(null);
  const sweepHandRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>();
  const tickRef = useRef<() => void>();
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const colorState = getColorState(remainingSeconds);
  const meta = STATE_META[colorState];

  const finishSession = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    await supabase.from('daily_plans').update({ completed: true }).eq('id', dailyPlanId);
    router.push(`/session-complete/${subjectId}`);
  }, [dailyPlanId, subjectId, router]);

  useEffect(() => {
    if (!started) return;

    function tick() {
      if (pausedAtRef.current !== null || endedRef.current) return;

      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSeconds = elapsedMs / 1000;
      const remaining = Math.max(0, TOTAL_SECONDS - elapsedSeconds);

      const minuteAngle = Math.min(360, (elapsedSeconds / TOTAL_SECONDS) * 360);
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
  }, [started, finishSession]);

  function handleStart() {
    startTimeRef.current = Date.now();
    setStarted(true);
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

  return (
    <main
      className="min-h-dvh bg-bg flex flex-col items-center px-[22px] pt-[38px]"
      style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <div className="self-start mb-2">
        <NavArrows showForward={false} />
      </div>

      <p
        className="font-heading font-bold text-[10px] uppercase tracking-wide transition-colors duration-700"
        style={{ color: meta.glow }}
      >
        FOCUS SESSION · {sessionNumber} OF {totalSessions} TODAY
      </p>

      <h1
        className="font-heading font-bold text-[21px] text-center mt-3 text-text-primary"
        style={{ letterSpacing: '-0.066em' }}
      >
        {subjectName}
      </h1>

      <p className="font-body text-[14px] text-center mt-1 text-orange">Study session</p>

      <div className="relative mt-8" style={{ width: 230, height: 230 }}>
        {/* Ambient background lighting - a soft colored blur bleeding onto the
            white page behind the disc; color/intensity track the state. */}
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
            {/* Colored state ring */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={104}
              fill="none"
              style={{ stroke: meta.glow, transition: 'stroke 0.7s' }}
              strokeWidth={5}
            />

            {/* Recessed inner face */}
            <circle cx={CENTER} cy={CENTER} r={95} style={{ fill: 'var(--neu-shadow-dark)' }} />
            <circle cx={CENTER} cy={CENTER} r={92} style={{ fill: 'var(--color-bg)' }} />

            {/* Dial wordmark */}
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
              {subjectName}
            </text>

            {/* Sweep hand (continuous rotation) */}
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

            {/* Minute hand (tracks remaining time) */}
            <g ref={minuteHandRef}>
              <polygon
                points={`${CENTER - 3.5},${CENTER} ${CENTER + 3.5},${CENTER} ${CENTER + 1.3},${
                  CENTER - 66
                } ${CENTER},${CENTER - 72} ${CENTER - 1.3},${CENTER - 66}`}
                style={{ fill: 'var(--color-text-primary)' }}
              />
            </g>

            {/* Center pin */}
            <circle cx={CENTER} cy={CENTER} r={4} style={{ fill: 'var(--color-text-primary)' }} />
          </svg>
        </div>
      </div>

      <p className="font-heading font-bold text-[22px] mt-6 text-text-primary">
        {formatMMSS(remainingSeconds)}
      </p>
      <p
        className="font-body text-[10px] uppercase mt-1 transition-colors duration-700"
        style={{ color: meta.glow, letterSpacing: '1.5px' }}
      >
        {meta.label}
      </p>

      <div className="flex-1" />

      {started ? (
        <div className="flex gap-[10px] w-full">
          <button
            type="button"
            onClick={togglePause}
            className="neu-raised flex-1 font-heading font-bold text-[13.5px] text-text-primary rounded-neu-md py-[14px] transition-all active:scale-[0.97]"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={finishSession}
            className="neu-raised neu-outline-accent flex-1 font-heading font-bold text-[13.5px] text-text-primary rounded-neu-md py-[14px] transition-all active:scale-[0.97]"
          >
            End session
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          className="neu-raised-accent w-full font-heading font-bold text-[14px] text-white rounded-neu-lg py-[15px] transition-all active:scale-[0.97]"
        >
          Start session
        </button>
      )}

      <p className="font-body text-[10px] text-center mt-4 text-text-muted">
        {started
          ? "Session auto-logs to today's plan when it ends."
          : "Tap Start when you're ready to focus."}
      </p>
    </main>
  );
}
