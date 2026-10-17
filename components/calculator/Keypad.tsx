'use client';

import { ReactNode } from 'react';

export interface KeySpec {
  key: string;
  label?: ReactNode;
  className: string;
  span?: number;
  active?: boolean;
  ariaLabel?: string;
}

/**
 * The key grid. It is ALWAYS left-to-right, even in Arabic: calculator layout is
 * a learned motor pattern (7-8-9 stays top-left), so only the chrome mirrors.
 */
export default function Keypad({ keys, onPress }: { keys: KeySpec[]; onPress: (key: string) => void }) {
  return (
    <div dir="ltr" className="grid grid-cols-5 gap-[9px] px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
      {keys.map((k) => (
        <button
          key={k.key}
          type="button"
          onClick={() => onPress(k.key)}
          aria-label={k.ariaLabel}
          className={`calc-key ${k.className} ${k.active ? 'calc-key-active' : ''}`}
          style={k.span ? { gridColumn: `span ${k.span}` } : undefined}
        >
          {k.label ?? k.key}
        </button>
      ))}
    </div>
  );
}

export function AnswerCard({
  small,
  main,
  tags,
  hint,
  bare = false,
  children,
}: {
  small: string;
  main: string;
  tags?: ReactNode;
  hint?: string;
  /** No card around the lines (the financial calculator's mockup shows two bare lines). */
  bare?: boolean;
  children?: ReactNode;
}) {
  const size = main.length > 26 ? 18 : main.length > 18 ? 24 : main.length > 12 ? 30 : bare ? 40 : 38;
  return (
    <div className={bare ? 'px-6 pb-2 pt-3' : 'px-5 pb-[14px]'}>
      <div
        className={
          bare
            ? 'flex flex-col items-end gap-2'
            : 'flex flex-col items-end gap-[6px] rounded-[18px] px-[18px] py-[14px]'
        }
        style={bare ? undefined : { border: '1.5px solid var(--calc-display-border)', background: 'var(--calc-display-bg)' }}
        dir="ltr"
      >
        <div className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.4px]" style={{ color: 'var(--calc-muted)' }}>
          <span className="flex items-center gap-2">{tags}</span>
          {children}
        </div>
        <div
          className="min-h-[20px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-end text-[14px] font-semibold"
          style={{ color: 'var(--calc-muted)' }}
        >
          {small}
        </div>
        <div
          className="font-heading w-full overflow-hidden whitespace-nowrap text-end font-extrabold tracking-[-1px]"
          style={{ fontSize: size, color: 'var(--calc-ink)', lineHeight: 1.1 }}
          aria-live="polite"
        >
          {main}
        </div>
        {hint ? (
          <div className="w-full text-end text-[11.5px] font-semibold" style={{ color: 'var(--calc-muted)' }}>
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}
