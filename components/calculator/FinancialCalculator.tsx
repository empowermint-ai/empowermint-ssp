'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Keypad, { AnswerCard, KeySpec } from '@/components/calculator/Keypad';
import {
  FinKey,
  finInputLine,
  finMainLine,
  initialFinState,
  pressFin,
} from '@/lib/calc/financialState';

export default function FinancialCalculator() {
  const t = useTranslations('calculator');
  const [state, setState] = useState(initialFinState);
  const [helpOpen, setHelpOpen] = useState(false);
  const press = (key: string) => setState((s) => pressFin(s, key as FinKey));

  // 2ND relabels the keys it changes
  const sec = state.second;
  const keys: KeySpec[] = [
    { key: 'N', label: sec ? 'P/Y' : 'N', className: 'calc-key-fn' },
    { key: 'I/Y', className: 'calc-key-fn' },
    { key: 'PV', label: sec ? (state.begin ? 'END' : 'BGN') : 'PV', className: 'calc-key-fn' },
    { key: 'PMT', className: 'calc-key-fn' },
    { key: 'FV', className: 'calc-key-fn' },

    { key: 'CPT', label: sec ? 'CLR' : 'CPT', className: 'calc-key-cpt', active: state.cpt },
    { key: '2ND', className: 'calc-key-fn', active: sec },
    { key: 'CF', label: sec ? 'CLR CF' : 'CF', className: 'calc-key-fn', active: state.cfOpen },
    { key: 'NPV', className: 'calc-key-fn' },
    { key: 'IRR', className: 'calc-key-fn' },

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
    { key: '+/–', label: '+/−', className: 'calc-key-fn' },

    { key: '0', span: 2, className: 'calc-key-num' },
    { key: '.', className: 'calc-key-num' },
    { key: '+', className: 'calc-key-op' },
    { key: '=', className: 'calc-key-op', label: '=' },
  ];
  // the "=" key uses the confirm teal like CPT
  keys[keys.length - 1].className = 'calc-key-eq';

  const hint = state.error
    ? t(`finError.${state.message ?? 'syntax'}`)
    : state.cfOpen
      ? t('cfHint')
      : state.cpt
        ? t('cptHint')
        : undefined;

  return (
    <>
      <AnswerCard
        bare
        small={finInputLine(state)}
        main={finMainLine(state)}
        hint={hint}
        tags={
          <>
            <span>{state.begin ? 'BGN' : 'END'}</span>
            <span>{state.ppy}/yr</span>
            {state.cpt ? <span>CPT</span> : null}
          </>
        }
      >
        <button
          type="button"
          onClick={() => setHelpOpen((o) => !o)}
          aria-expanded={helpOpen}
          aria-label={t('helpToggle')}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-extrabold normal-case"
          style={{ background: 'var(--calc-chip)', color: 'var(--calc-ink)' }}
        >
          i
        </button>
      </AnswerCard>
      {helpOpen ? (
        <div className="mx-5 mb-3 rounded-[14px] px-4 py-3 text-[12.5px] leading-snug" style={{ background: 'var(--calc-fn-bg)' }}>
          <p className="font-bold">{t('signTitle')}</p>
          <p className="mt-1">{t('signBody')}</p>
          <p className="mt-2">{t('ppyBody')}</p>
          <p className="mt-2">{t('flowBody')}</p>
        </div>
      ) : null}
      <div className="min-h-[12px] flex-1" />
      <Keypad keys={keys} onPress={press} />
    </>
  );
}
