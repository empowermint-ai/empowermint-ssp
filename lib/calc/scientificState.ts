// Key-press state machine for the scientific calculator. Pure and UI-free so every
// behaviour (including all error states) is covered by unit tests.

import { AngleMode, CalcError, autoClose, evaluate } from '@/lib/calc/expression';
import { formatNumber } from '@/lib/calc/format';

export interface SciState {
  /** What the learner has typed, using the on-key symbols (× ÷ − √ π). */
  expr: string;
  /** Working value of the last "=" (full precision - never rounded). */
  result: number | null;
  /** True right after "=": the next digit starts fresh, an operator continues from the answer. */
  evaluated: boolean;
  error: boolean;
  angle: AngleMode;
  shift: boolean;
  memory: number;
  /** The expression that produced `result`, shown small above it. */
  lastExpr: string;
}

export const initialSciState: SciState = {
  expr: '',
  result: null,
  evaluated: false,
  error: false,
  angle: 'deg',
  shift: false,
  memory: 0,
  lastExpr: '',
};

export type SciKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.'
  | '+' | '−' | '×' | '÷' | 'x^y' | '(' | ')' | '%' | 'π'
  | 'sin' | 'cos' | 'tan' | 'ln' | 'log' | '√'
  | 'mc' | 'mr' | 'm+' | 'm−'
  | 'deg' | 'shift' | 'AC' | '=';

const OPERATORS = ['+', '−', '×', '÷', '^'];
const isOperator = (ch: string) => OPERATORS.includes(ch);

/** Shift (2nd) functions: inverse trig, e^x, 10^x, x², and the constant e. */
const SHIFT_FUNCTION: Partial<Record<SciKey, string>> = {
  sin: 'asin(',
  cos: 'acos(',
  tan: 'atan(',
  ln: 'exp(',
  log: 'pow10(',
};

function lastChar(expr: string): string {
  return expr.slice(-1);
}

/** Numeric value of what is on screen: the answer after "=", else the expression evaluated. */
function currentValue(state: SciState): number | null {
  if (state.evaluated && state.result !== null) return state.result;
  if (state.expr === '') return state.result;
  try {
    return evaluate(autoClose(state.expr), state.angle);
  } catch {
    return null;
  }
}

function fail(state: SciState): SciState {
  return { ...state, error: true, shift: false };
}

function insert(state: SciState, text: string): SciState {
  // typing after an answer starts a new calculation (digits, functions, constants)
  const base = state.evaluated ? { ...state, expr: '', evaluated: false } : state;
  return { ...base, expr: base.expr + text, shift: false };
}

function pressOperator(state: SciState, op: string): SciState {
  let expr = state.expr;
  if (state.evaluated && state.result !== null) {
    // continue from the previous answer ("Ans")
    expr = formatNumber(state.result);
    if (expr.startsWith('-')) expr = `(${expr})`;
  } else if (expr === '') {
    if (state.result !== null) {
      expr = formatNumber(state.result);
      if (expr.startsWith('-')) expr = `(${expr})`;
    } else if (op === '−') {
      return { ...state, expr: '−', shift: false }; // leading minus is allowed
    } else {
      return state; // an operator on an empty display does nothing
    }
  }
  const last = lastChar(expr);
  if (op === '−') {
    // A minus after an operator is a sign: 5×−3, 2^−3, 5−−3 (typed as written).
  } else {
    if (last === '(') return state; // an operator right after "(" makes no sense
    // a new operator replaces any operators already waiting (including a sign)
    while (expr.length > 0 && isOperator(lastChar(expr))) expr = expr.slice(0, -1);
    if (expr === '') return state;
  }
  return { ...state, expr: expr + op, evaluated: false, shift: false };
}

export function pressSci(state: SciState, key: SciKey): SciState {
  // In the error state only AC does anything - the learner must clear it.
  if (state.error && key !== 'AC') return state;

  switch (key) {
    case 'AC':
      return { ...initialSciState, angle: state.angle, memory: state.memory };

    case 'shift':
      return { ...state, shift: !state.shift };

    case 'deg':
      return { ...state, angle: state.angle === 'deg' ? 'rad' : 'deg', shift: false };

    case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9':
      return insert(state, key);

    case '.': {
      // only one decimal point per number
      const base = state.evaluated ? { ...state, expr: '', evaluated: false } : state;
      const lastNumber = /[0-9.]*$/.exec(base.expr)?.[0] ?? '';
      if (lastNumber.includes('.')) return base;
      return { ...base, expr: base.expr + (lastNumber === '' ? '0.' : '.'), shift: false };
    }

    case '+': case '−': case '×': case '÷':
      return pressOperator(state, key);

    case 'x^y':
      return pressOperator(state, '^');

    case '(':
      return insert(state, '(');

    case ')': {
      const open = (state.expr.match(/\(/g) ?? []).length;
      const close = (state.expr.match(/\)/g) ?? []).length;
      if (open <= close || state.evaluated) return state; // nothing to close
      return { ...state, expr: state.expr + ')', shift: false };
    }

    case '%': {
      if (state.expr === '' || isOperator(lastChar(state.expr)) || lastChar(state.expr) === '(') return state;
      return { ...state, expr: state.expr + '%', evaluated: false, shift: false };
    }

    case 'π':
      if (state.shift) return insert({ ...state, shift: false }, 'e');
      return insert(state, 'π');

    case '√':
      if (state.shift) {
        // x²: square whatever was just typed / the last answer
        const value = currentValue(state);
        if (value === null) return state;
        const text = state.evaluated ? formatNumber(value) : state.expr;
        const wrapped = text.startsWith('-') ? `(${text})` : text;
        return { ...state, expr: `${wrapped}^2`, evaluated: false, shift: false };
      }
      return insert(state, '√(');

    case 'sin': case 'cos': case 'tan': case 'ln': case 'log':
      return insert(state, state.shift ? (SHIFT_FUNCTION[key] as string) : `${key}(`);

    case 'mc':
      return { ...state, memory: 0, shift: false };

    case 'mr': {
      const text = formatNumber(state.memory);
      return insert(state, text.startsWith('-') ? `(${text})` : text);
    }

    case 'm+': case 'm−': {
      if (state.expr === '' && state.result === null) return state; // nothing on screen to store
      const value = currentValue(state);
      if (value === null) return fail(state);
      const next = key === 'm+' ? state.memory + value : state.memory - value;
      if (!Number.isFinite(next)) return fail(state);
      // storing finishes the entry: the shown value becomes the answer
      return {
        ...state,
        memory: next,
        result: value,
        evaluated: true,
        lastExpr: state.evaluated ? state.lastExpr : state.expr,
        shift: false,
      };
    }

    case '=': {
      if (state.expr === '') return state; // "=" on an empty display does nothing
      try {
        const result = evaluate(autoClose(state.expr), state.angle);
        return { ...state, result, evaluated: true, lastExpr: state.expr, expr: state.expr, shift: false };
      } catch (e) {
        if (e instanceof CalcError) return { ...fail(state), lastExpr: state.expr };
        return fail(state);
      }
    }
  }
}

/** Text for the big result line. */
export function sciMainLine(state: SciState): string {
  if (state.error) return 'Error';
  if (state.evaluated && state.result !== null) return formatNumber(state.result);
  return state.expr === '' ? '0' : state.expr;
}

/** Text for the small line above it (the expression that was just evaluated). */
export function sciSmallLine(state: SciState): string {
  if (state.error) return state.lastExpr;
  return state.evaluated ? state.lastExpr : '';
}
