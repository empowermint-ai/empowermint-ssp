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

const STATE_META: Record<ColorState, { hex: string; label: string; labelColor: string }> = {
  green: { hex: '#0A7968', label: 'REMAINING · PLENTY OF TIME', labelColor: '#5e9e8d' },
  amber: { hex: '#F37021', label: 'REMAINING · STEADY PACE', labelColor: '#e08c3e' },
  red: { hex: '#C0392B', label: 'REMAINING · ALMOST THERE', labelColor: '#d9756a' },
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: round2(CENTER + radius * Math.sin(rad)),
    y: round2(CENTER - radius * Math.cos(rad)),
  };
}

const MAJOR_NUMERALS = [
  { angle: 0, label: '25' },
  { angle: 72, label: '20' },
  { angle: 144, label: '15' },
  { angle: 216, label: '10' },
  { angle: 288, label: '5' },
];

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

  const dateWindowText = subjectName.slice(0, 3).toUpperCase();

  return (
    <main
      className="h-screen flex flex-col items-center px-[22px] pt-[38px] pb-[18px]"
      style={{ backgroundColor: '#0d0d0d' }}
    >
      <div className="self-start mb-2">
        <NavArrows dark showForward={false} />
      </div>

      <p
        className="font-heading font-bold text-[10px] uppercase tracking-wide"
        style={{ color: meta.hex }}
      >
        FOCUS SESSION · {sessionNumber} OF {totalSessions} TODAY
      </p>

      <h1
        className="font-heading font-bold text-[21px] text-center mt-3"
        style={{ color: '#f1efe7', letterSpacing: '-0.066em' }}
      >
        {subjectName}
      </h1>

      <p className="font-body text-[14px] text-center mt-1" style={{ color: '#a89e88' }}>
        Study session
      </p>

      <div
        className="mt-8"
        style={
          colorState === 'red'
            ? { filter: 'drop-shadow(0 0 14px rgba(192, 57, 43, 0.65))' }
            : undefined
        }
      >
        <svg width={230} height={230} viewBox="0 0 230 230">
          <defs>
            <linearGradient id="bezelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f6e7b4" />
              <stop offset="25%" stopColor="#caa44a" />
              <stop offset="50%" stopColor="#8a6b2c" />
              <stop offset="75%" stopColor="#e7cd86" />
              <stop offset="100%" stopColor="#a9842f" />
            </linearGradient>
            <radialGradient id="dialGradient" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#232323" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <linearGradient id="handGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f6e7b4" />
              <stop offset="100%" stopColor="#8a6b2c" />
            </linearGradient>
          </defs>

          {/* Bezel */}
          <circle cx={CENTER} cy={CENTER} r={112} fill="url(#bezelGradient)" />
          {/* Crown */}
          <rect x={222} y={104} width={10} height={20} rx={2} fill="#c9a646" />
          {/* Inner ring border */}
          <circle cx={CENTER} cy={CENTER} r={100} fill="#0a0a0a" />
          {/* Dial */}
          <circle cx={CENTER} cy={CENTER} r={96} fill="url(#dialGradient)" />

          {/* Tick marks */}
          {Array.from({ length: 25 }).map((_, i) => {
            const angle = i * 14.4;
            const isMajor = i % 5 === 0;
            const outer = polar(angle, 90);
            const inner = polar(angle, isMajor ? 80 : 84);
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={isMajor ? '#c9a646' : '#7d6a3c'}
                strokeWidth={isMajor ? 3.5 : 1.6}
                strokeLinecap="round"
              />
            );
          })}

          {/* Numerals */}
          {MAJOR_NUMERALS.map(({ angle, label }) => {
            const pos = polar(angle, 66);
            return (
              <text
                key={label}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-heading font-bold"
                style={{ fill: '#d9b65a', fontSize: 15 }}
              >
                {label}
              </text>
            );
          })}

          {/* Dial text */}
          <text
            x={CENTER}
            y={CENTER - 32}
            textAnchor="middle"
            className="font-heading font-bold"
            style={{ fill: '#e3c878', fontSize: 9.5, letterSpacing: '2.5px' }}
          >
            empowermint
          </text>
          <text
            x={CENTER}
            y={CENTER - 20}
            textAnchor="middle"
            className="font-body"
            style={{ fill: '#8d7a45', fontSize: 8 }}
          >
            FOCUS · AUTOMATIC
          </text>

          {/* Date window */}
          <rect
            x={CENTER + 26}
            y={CENTER - 8}
            width={26}
            height={16}
            rx={2}
            fill="#0a0a0a"
            stroke="#c9a646"
            strokeWidth={1.2}
          />
          <text
            x={CENTER + 39}
            y={CENTER + 3.5}
            textAnchor="middle"
            className="font-heading font-bold"
            style={{ fill: '#d9b65a', fontSize: 8.5 }}
          >
            {dateWindowText}
          </text>

          {/* Sweep hand (continuous rotation) */}
          <g ref={sweepHandRef}>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER}
              y2={CENTER - 88}
              stroke={meta.hex}
              strokeWidth={1.4}
            />
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER}
              y2={CENTER + 16}
              stroke={meta.hex}
              strokeWidth={1.4}
            />
            <circle cx={CENTER} cy={CENTER + 16} r={4} fill={meta.hex} />
          </g>

          {/* Minute hand (tracks remaining time) */}
          <g ref={minuteHandRef}>
            <polygon
              points={`${CENTER - 4},${CENTER} ${CENTER + 4},${CENTER} ${CENTER + 1.5},${
                CENTER - 74
              } ${CENTER},${CENTER - 80} ${CENTER - 1.5},${CENTER - 74}`}
              fill="url(#handGradient)"
            />
          </g>

          {/* Center pin */}
          <circle cx={CENTER} cy={CENTER} r={4.5} fill="#c9a646" />
        </svg>
      </div>

      <p
        className="font-heading font-bold text-[22px] mt-6"
        style={{ color: '#f1efe7' }}
      >
        {formatMMSS(remainingSeconds)}
      </p>
      <p
        className="font-body text-[10px] uppercase mt-1"
        style={{ color: meta.labelColor, letterSpacing: '1.5px' }}
      >
        {meta.label}
      </p>

      <div className="flex-1" />

      {started ? (
        <div className="flex gap-[10px] w-full">
          <button
            type="button"
            onClick={togglePause}
            className="flex-1 font-heading font-bold text-[13.5px] rounded-[10px] py-[14px]"
            style={{ border: '1.5px solid #f1efe7', color: '#f1efe7', backgroundColor: 'transparent' }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={finishSession}
            className="flex-1 font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] text-white"
            style={{ backgroundColor: '#F37021' }}
          >
            End session
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          className="w-full font-heading font-bold text-[14px] rounded-[10px] py-[15px] text-white"
          style={{ backgroundColor: '#F37021' }}
        >
          Start session
        </button>
      )}

      <p className="font-body text-[10px] text-center mt-4" style={{ color: '#6b6557' }}>
        {started
          ? "Session auto-logs to today's plan when it ends."
          : "Tap Start when you're ready to focus."}
      </p>
    </main>
  );
}
