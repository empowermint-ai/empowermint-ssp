// Key-press state machine for the financial calculator (pure, unit tested).
//
// Works like a BA II Plus: type a number then press N / I/Y / PV / PMT / FV to
// STORE it; press CPT then a variable to COMPUTE it from the other four; press a
// variable with nothing typed to RECALL it. CF builds an uneven cash-flow list
// that NPV and IRR then use.

import { autoClose, evaluate } from '@/lib/calc/expression';
import {
  FinancialError,
  TvmInputs,
  TvmVariable,
  irr,
  npv,
  solveTvm,
} from '@/lib/calc/financial';
import {
  formatNumber,
  formatPercent,
  formatPeriods,
  formatRand,
} from '@/lib/calc/format';

export type FinKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.'
  | '+' | '−' | '×' | '÷' | '%' | '+/–' | '=' | 'AC'
  | 'N' | 'I/Y' | 'PV' | 'PMT' | 'FV' | 'CPT' | '2ND' | 'CF' | 'NPV' | 'IRR';

type Reg = TvmVariable;
const REG_FOR_KEY: Partial<Record<FinKey, Reg>> = { N: 'N', 'I/Y': 'IY', PV: 'PV', PMT: 'PMT', FV: 'FV' };
const REG_LABEL: Record<Reg, string> = { N: 'N', IY: 'I/Y', PV: 'PV', PMT: 'PMT', FV: 'FV' };

export const PPY_CHOICES = [12, 1, 2, 4];

export type OutKind = 'rand' | 'percent' | 'periods' | 'number';
export interface FinOut {
  label: string;
  kind: OutKind;
  value: number;
}

export type FinMessage = null | 'missing' | 'no-solution' | 'invalid' | 'syntax';

export interface FinState {
  /** What is being typed: a number or a small expression (× ÷ − + %). */
  buffer: string;
  /** True when `buffer` holds a calculated answer that the next digit replaces. */
  fresh: boolean;
  regs: Record<Reg, number | null>;
  cpt: boolean;
  second: boolean;
  ppy: number;
  begin: boolean;
  flows: number[];
  cfOpen: boolean;
  out: FinOut | null;
  error: boolean;
  /** Why the last action failed (shown as a hint under "Error"). */
  message: FinMessage;
}

export const initialFinState: FinState = {
  buffer: '',
  fresh: false,
  regs: { N: null, IY: null, PV: null, PMT: null, FV: null },
  cpt: false,
  second: false,
  ppy: 12,
  begin: false,
  flows: [],
  cfOpen: false,
  out: null,
  error: false,
  message: null,
};

const isOperatorChar = (c: string) => '+−×÷'.includes(c);

function fail(state: FinState, message: FinMessage): FinState {
  return { ...state, error: true, message, cpt: false, second: false };
}

/** Evaluate the typed buffer to a number; null when empty, throws for bad input. */
function bufferValue(buffer: string): number | null {
  if (buffer === '') return null;
  return evaluate(autoClose(buffer));
}

function toTvmInputs(state: FinState, missing: Reg): TvmInputs | null {
  const r = state.regs;
  const keys: Reg[] = ['N', 'IY', 'PV', 'PMT', 'FV'];
  for (const k of keys) if (k !== missing && r[k] === null) return null;
  return {
    N: r.N ?? 0,
    IY: r.IY ?? 0,
    PV: r.PV ?? 0,
    PMT: r.PMT ?? 0,
    FV: r.FV ?? 0,
    ppy: state.ppy,
    begin: state.begin,
  };
}

function outFor(reg: Reg, value: number): FinOut {
  switch (reg) {
    case 'N':
      return { label: 'N', kind: 'periods', value };
    case 'IY':
      return { label: 'I/Y', kind: 'percent', value };
    default:
      return { label: REG_LABEL[reg], kind: 'rand', value };
  }
}

function negateLastNumber(buffer: string): string {
  if (buffer === '') return '(-';
  const m = /(\(-[0-9.]+\)|[0-9.]+)$/.exec(buffer);
  if (!m) return buffer;
  const seg = m[1];
  const flipped = seg.startsWith('(-') ? seg.slice(2, -1) : `(-${seg})`;
  return buffer.slice(0, m.index) + flipped;
}

export function pressFin(state: FinState, key: FinKey): FinState {
  if (state.error && key !== 'AC') return state;

  switch (key) {
    case 'AC':
      return {
        ...state,
        buffer: '',
        fresh: false,
        cpt: false,
        second: false,
        out: null,
        error: false,
        message: null,
      };

    case '2ND':
      return { ...state, second: !state.second, cpt: false };

    case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9': {
      const buffer = state.fresh ? key : state.buffer + key;
      return { ...state, buffer, fresh: false, out: null, cpt: false };
    }

    case '.': {
      const base = state.fresh ? '' : state.buffer;
      const lastNumber = /[0-9.]*$/.exec(base)?.[0] ?? '';
      if (lastNumber.includes('.')) return state;
      return { ...state, buffer: base + (lastNumber === '' ? '0.' : '.'), fresh: false, out: null };
    }

    case '+': case '−': case '×': case '÷': {
      let buffer = state.buffer;
      if (buffer === '' || state.fresh) {
        // continue from the shown answer, or from a recalled register
        const shown = state.out ? state.out.value : null;
        if (buffer === '' && shown === null) return state;
        if (buffer === '' && shown !== null) buffer = formatNumber(shown);
      }
      if (isOperatorChar(buffer.slice(-1))) buffer = buffer.slice(0, -1);
      return { ...state, buffer: buffer + key, fresh: false, out: null };
    }

    case '%': {
      if (state.buffer === '' || isOperatorChar(state.buffer.slice(-1))) return state;
      return { ...state, buffer: state.buffer + '%', fresh: false };
    }

    case '+/–': {
      if (state.fresh) return { ...state, buffer: negateLastNumber(state.buffer), fresh: false };
      return { ...state, buffer: negateLastNumber(state.buffer) };
    }

    case '=': {
      if (state.buffer === '') return state;
      try {
        const value = evaluate(autoClose(state.buffer));
        if (state.cfOpen) {
          return { ...state, flows: [...state.flows, value], buffer: '', fresh: false, out: null };
        }
        return {
          ...state,
          buffer: formatNumber(value),
          fresh: true,
          out: { label: '', kind: 'number', value },
          second: false,
        };
      } catch {
        return fail(state, 'syntax');
      }
    }

    case 'CPT':
      if (state.second) {
        // 2ND + CPT: clear the five TVM variables
        return {
          ...state,
          regs: { N: null, IY: null, PV: null, PMT: null, FV: null },
          second: false,
          cpt: false,
          out: null,
          buffer: '',
          fresh: false,
        };
      }
      return { ...state, cpt: !state.cpt };

    case 'CF':
      if (state.second) return { ...state, flows: [], second: false, cfOpen: false, out: null };
      return { ...state, cfOpen: !state.cfOpen, buffer: '', fresh: false, out: null, cpt: false };

    case 'NPV': {
      if (state.flows.length === 0) return fail(state, 'missing');
      if (state.regs.IY === null) return fail(state, 'missing');
      try {
        const value = npv(state.regs.IY, state.flows);
        return { ...state, out: { label: 'NPV', kind: 'rand', value }, buffer: '', fresh: false };
      } catch (e) {
        return fail(state, e instanceof FinancialError ? e.code : 'invalid');
      }
    }

    case 'IRR': {
      if (state.flows.length < 2) return fail(state, 'missing');
      try {
        const value = irr(state.flows);
        return { ...state, out: { label: 'IRR', kind: 'percent', value }, buffer: '', fresh: false };
      } catch (e) {
        return fail(state, e instanceof FinancialError ? e.code : 'invalid');
      }
    }

    case 'N': case 'I/Y': case 'PV': case 'PMT': case 'FV': {
      const reg = REG_FOR_KEY[key] as Reg;

      // 2ND + N cycles payments per year; 2ND + PV toggles BGN / END
      if (state.second && reg === 'N') {
        const next = PPY_CHOICES[(PPY_CHOICES.indexOf(state.ppy) + 1) % PPY_CHOICES.length];
        return { ...state, ppy: next, second: false };
      }
      if (state.second && reg === 'PV') {
        return { ...state, begin: !state.begin, second: false };
      }

      // CPT + variable: compute it from the other four
      if (state.cpt) {
        const inputs = toTvmInputs(state, reg);
        if (!inputs) return fail(state, 'missing');
        try {
          const value = solveTvm(reg, inputs);
          return {
            ...state,
            regs: { ...state.regs, [reg]: value },
            out: outFor(reg, value),
            cpt: false,
            buffer: '',
            fresh: false,
          };
        } catch (e) {
          return fail(state, e instanceof FinancialError ? e.code : 'invalid');
        }
      }

      // a number is waiting: store it
      if (state.buffer !== '') {
        try {
          const value = bufferValue(state.buffer);
          if (value === null) return state;
          return {
            ...state,
            regs: { ...state.regs, [reg]: value },
            out: outFor(reg, value),
            buffer: '',
            fresh: false,
          };
        } catch {
          return fail(state, 'syntax');
        }
      }

      // nothing typed: recall
      const stored = state.regs[reg];
      return { ...state, out: outFor(reg, stored ?? 0) };
    }
  }
}

/** "N=24  I/Y=11.5  PMT=-850" - the variables that are currently set. */
export function finInputLine(state: FinState): string {
  if (state.cfOpen) {
    const list = state.flows.map((f) => formatNumber(f)).join(', ');
    return `CF: ${list || '—'}`;
  }
  const parts: string[] = [];
  (['N', 'IY', 'PV', 'PMT', 'FV'] as Reg[]).forEach((k) => {
    const v = state.regs[k];
    // 8 significant digits keeps the summary line tidy; the stored value is untouched
    if (v !== null) parts.push(`${REG_LABEL[k]}=${formatNumber(parseFloat(v.toPrecision(8)))}`);
  });
  return parts.join('  ');
}

export function formatFinOut(out: FinOut): string {
  switch (out.kind) {
    case 'rand':
      return `${out.label} = ${formatRand(out.value)}`;
    case 'percent':
      return `${out.label} = ${formatPercent(out.value)}`;
    case 'periods':
      return `${out.label} = ${formatPeriods(out.value)}`;
    default:
      return formatNumber(out.value);
  }
}

/** The big line: an error, a result, the number being typed, or the CF entry prompt. */
export function finMainLine(state: FinState): string {
  if (state.error) return 'Error';
  if (state.out) return formatFinOut(state.out);
  if (state.cfOpen) {
    const n = state.flows.length;
    return `CF${n === 0 ? '0' : n.toString().padStart(2, '0')} = ${state.buffer || '?'}`;
  }
  return state.buffer === '' ? '0' : state.buffer;
}
