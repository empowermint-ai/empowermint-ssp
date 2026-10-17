'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Keypad, { AnswerCard, KeySpec } from '@/components/calculator/Keypad';
import {
  SciKey,
  initialSciState,
  pressSci,
  sciMainLine,
  sciSmallLine,
} from '@/lib/calc/scientificState';

export default function ScientificCalculator({ stripActive }: { stripActive: boolean }) {
  const t = useTranslations('calculator');
  const [state, setState] = useState(initialSciState);
  const press = (key: string) => setState((s) => pressSci(s, key as SciKey));

  // Shift (2nd) relabels the keys it changes; function names are never translated.
  const sh = state.shift;
  const keys: KeySpec[] = [
    { key: 'shift', className: 'calc-key-fn', active: sh },
    { key: 'deg', label: state.angle, className: 'calc-key-fn' },
    { key: 'sin', label: sh ? 'sin⁻¹' : 'sin', className: 'calc-key-fn' },
    { key: 'cos', label: sh ? 'cos⁻¹' : 'cos', className: 'calc-key-fn' },
    { key: 'tan', label: sh ? 'tan⁻¹' : 'tan', className: 'calc-key-fn' },

    { key: 'ln', label: sh ? 'eˣ' : 'ln', className: 'calc-key-fn' },
    { key: 'log', label: sh ? '10ˣ' : 'log', className: 'calc-key-fn' },
    { key: '(', className: 'calc-key-fn' },
    { key: ')', className: 'calc-key-fn' },
    { key: 'x^y', className: 'calc-key-fn' },

    { key: 'mc', className: 'calc-key-fn' },
    { key: 'mr', className: 'calc-key-fn' },
    { key: 'm+', className: 'calc-key-fn' },
    { key: 'm−', className: 'calc-key-fn' },
    { key: '√', label: sh ? 'x²' : '√', className: 'calc-key-fn' },

    { key: '7', className: 'calc-key-num' },
    { key: '8', className: 'calc-key-num' },
    { key: '9', className: 'calc-key-num' },
    { key: '÷', className: 'calc-key-op' },
    { key: 'AC', className: 'calc-key-ac', ariaLabel: t('clear') },

    { key: '4', className: 'calc-key-num' },
    { key: '5', className: 'calc-key-num' },
    { key: '6', className: 'calc-key-num' },
    { key: '×', className: 'calc-key-op' },
    { key: '%', className: 'calc-key-fn' },

    { key: '1', className: 'calc-key-num' },
    { key: '2', className: 'calc-key-num' },
    { key: '3', className: 'calc-key-num' },
    { key: '−', className: 'calc-key-op' },
    { key: 'π', label: sh ? 'e' : 'π', className: 'calc-key-fn' },

    { key: '0', span: 2, className: 'calc-key-num' },
    { key: '.', className: 'calc-key-num' },
    { key: '+', className: 'calc-key-op' },
    { key: '=', className: 'calc-key-eq' },
  ];

  return (
    <>
      <div className="min-h-[8px] flex-1" />
      <AnswerCard
        small={sciSmallLine(state)}
        main={sciMainLine(state)}
        hint={state.error ? t('clearHint') : undefined}
        tags={
          <>
            <span aria-label={t('angleMode')}>{state.angle.toUpperCase()}</span>
            {state.shift ? <span>SHIFT</span> : null}
            {state.memory !== 0 ? <span>M</span> : null}
          </>
        }
      />
      {/* Base layout: the display floats centred between header and keypad. While the
          focus strip is showing it sits just above the keypad instead. */}
      {stripActive ? null : <div className="min-h-[8px] flex-1" />}
      <Keypad keys={keys} onPress={press} />
    </>
  );
}
