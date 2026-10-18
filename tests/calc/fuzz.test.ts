// Large randomised cross-checks against INDEPENDENT references (see
// scripts/calc/gen-fuzz.py): Python arithmetic for the scientific calculator,
// 60-digit Decimal replays for the financial one. Regenerate bigger sets with
//   python3 scripts/calc/gen-fuzz.py 50000 <seed> /tmp/fuzz && FUZZ_DIR=/tmp/fuzz npm test
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CalcError, evaluate } from '@/lib/calc/expression';
import { formatNumber } from '@/lib/calc/format';
import { FinancialError, TvmInputs, irr, npv, solveTvm } from '@/lib/calc/financial';
import { SciKey, initialSciState, pressSci, sciMainLine } from '@/lib/calc/scientificState';
import { FinKey, finMainLine, initialFinState, pressFin } from '@/lib/calc/financialState';

const DIR = process.env.FUZZ_DIR ?? path.join(__dirname, 'fixtures');
const sci = JSON.parse(fs.readFileSync(path.join(DIR, 'fuzz-scientific.json'), 'utf8')) as {
  seed: number;
  cases: { expr: string; mode: 'deg' | 'rad'; expected?: number; error?: boolean }[];
};
const fin = JSON.parse(fs.readFileSync(path.join(DIR, 'fuzz-financial.json'), 'utf8')) as {
  seed: number;
  tvm: { N: number; IY: number; PV: number; PMT: number; FV: number; FVs: string; ppy: number; begin: boolean }[];
  cash: { flows: number[]; rate: number; npv: number; irrRoots: number[] }[];
};

const relClose = (a: number, b: number, rel: number, abs = 1e-9) => Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
const report = (title: string, bad: string[], total: number) => {
  // eslint-disable-next-line no-console
  console.log(`${title}: ${total - bad.length}/${total} agree${bad.length ? `; first mismatches:\n  ${bad.slice(0, 12).join('\n  ')}` : ''}`);
};

describe(`scientific vs Python (seed ${sci.seed}, ${sci.cases.length} expressions)`, () => {
  it('every expression agrees: same value, or an error where Python raised one', () => {
    const bad: string[] = [];
    for (const c of sci.cases) {
      let got: number | 'error';
      try {
        got = evaluate(c.expr, c.mode);
      } catch (e) {
        if (!(e instanceof CalcError)) {
          bad.push(`CRASH (${String(e)}) for ${c.expr}`);
          continue;
        }
        got = 'error';
      }
      if (c.error) {
        if (got !== 'error') bad.push(`expected error, got ${got}: ${c.expr} [${c.mode}]`);
      } else if (got === 'error') {
        bad.push(`unexpected error, expected ${c.expected}: ${c.expr} [${c.mode}]`);
      } else if (!relClose(got, c.expected as number, 1e-9)) {
        bad.push(`${c.expr} [${c.mode}] -> ${got}, expected ${c.expected}`);
      }
    }
    report('scientific parser', bad, sci.cases.length);
    expect(bad).toEqual([]);
  });

  it('typing the same expression key by key gives the same displayed answer', () => {
    // skip shift-only functions (asin/acos/atan/exp/e) - they need the shift key
    const keyable = sci.cases.filter((c) => !/asin|acos|atan|exp|(^|[^a-z])e([^a-z]|$)/.test(c.expr));
    const bad: string[] = [];
    let checked = 0;
    for (const c of keyable) {
      const tokens = c.expr.match(/sin|cos|tan|ln|log|√|[0-9]+(?:\.[0-9]+)?|\.|[+−×÷^()%π]/g) ?? [];
      const keys: SciKey[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (['sin', 'cos', 'tan', 'ln', 'log', '√'].includes(t)) {
          keys.push(t as SciKey);
          i++; // the function key types its own "("
        } else if (t === '^') keys.push('x^y');
        else if (/^[0-9.]+$/.test(t)) for (const ch of t) keys.push(ch as SciKey);
        else keys.push(t as SciKey);
      }
      let state = c.mode === 'rad' ? pressSci(initialSciState, 'deg') : initialSciState;
      for (const k of keys) state = pressSci(state, k);
      state = pressSci(state, '=');
      const shown = sciMainLine(state);
      const want = c.error ? 'Error' : formatNumber(c.expected as number);
      checked++;
      // allow the last displayed digit to differ across cancellation (compare numerically)
      const same =
        shown === want ||
        (!c.error && shown !== 'Error' && relClose(Number(shown), Number(want), 1e-9));
      if (!same) bad.push(`${c.expr} [${c.mode}] keys -> ${shown}, expected ${want}`);
    }
    report('scientific key-by-key', bad, checked);
    expect(bad).toEqual([]);
  });
});

describe(`financial vs 60-digit Decimal replay (seed ${fin.seed}, ${fin.tvm.length} TVM problems)`, () => {
  const inputs = (c: (typeof fin.tvm)[number]): TvmInputs => ({
    N: c.N, IY: c.IY, PV: c.PV, PMT: c.PMT, FV: c.FV, ppy: c.ppy, begin: c.begin,
  });

  it('solving FV matches the independent replay', () => {
    const bad: string[] = [];
    for (const c of fin.tvm) {
      const got = solveTvm('FV', inputs(c));
      if (!relClose(got, c.FV, 1e-9, 1e-6)) bad.push(`FV got ${got} expected ${c.FV} (N=${c.N} IY=${c.IY} ppy=${c.ppy})`);
    }
    report('TVM FV', bad, fin.tvm.length);
    expect(bad).toEqual([]);
  });

  it('given the true FV, PV and PMT and N and I/Y are recovered', () => {
    const bad: string[] = [];
    let n = 0;
    for (const c of fin.tvm) {
      const base = inputs(c);
      // PV
      n++;
      const pv = solveTvm('PV', base);
      if (!relClose(pv, c.PV, 1e-7, 1e-4)) bad.push(`PV got ${pv} expected ${c.PV} (N=${c.N} IY=${c.IY} ppy=${c.ppy} begin=${c.begin})`);
      // PMT (only meaningful when there are payments)
      if (c.PMT !== 0) {
        n++;
        const pmt = solveTvm('PMT', base);
        if (!relClose(pmt, c.PMT, 1e-7, 1e-4)) bad.push(`PMT got ${pmt} expected ${c.PMT} (N=${c.N} IY=${c.IY} ppy=${c.ppy} begin=${c.begin})`);
      }
    }
    report('TVM PV/PMT recovery', bad, n);
    expect(bad).toEqual([]);
  });

  it('solved N and I/Y reproduce the target FV when plugged back into the replay', () => {
    // plug the solved value into the closed form residual relative to scale; N/IY roots can be non-unique
    const bad: string[] = [];
    let n = 0;
    for (const c of fin.tvm) {
      const base = inputs(c);
      const scale = Math.max(1, Math.abs(c.PV), Math.abs(c.FV), Math.abs(c.PMT) * c.N);
      try {
        n++;
        const solvedN = solveTvm('N', base);
        const i = c.IY / 100 / c.ppy;
        const k = c.begin ? 1 : 0;
        const af = ((1 + i * k) * (Math.pow(1 + i, solvedN) - 1)) / i;
        const resid = c.PV * Math.pow(1 + i, solvedN) + c.PMT * af + c.FV;
        if (Math.abs(resid) / scale > 1e-8) bad.push(`N=${solvedN} residual ${resid} (scale ${scale})`);
        if (Math.abs(solvedN - c.N) > 1e-6 * Math.max(1, c.N) && c.PMT !== 0) {
          // allowed only if a different N also satisfies the equation (checked above); note it
        }
      } catch (e) {
        if (!(e instanceof FinancialError)) bad.push(`N CRASH ${String(e)}`);
        else bad.push(`N unexpected no-solution (N=${c.N} IY=${c.IY} PV=${c.PV} PMT=${c.PMT} FV=${c.FV} ppy=${c.ppy} begin=${c.begin})`);
      }
      try {
        n++;
        const solvedIY = solveTvm('IY', base);
        const i = solvedIY / 100 / c.ppy;
        const k = c.begin ? 1 : 0;
        const af = Math.abs(i) < 1e-14 ? c.N : ((1 + i * k) * (Math.pow(1 + i, c.N) - 1)) / i;
        const resid = c.PV * Math.pow(1 + i, c.N) + c.PMT * af + c.FV;
        if (Math.abs(resid) / scale > 1e-7) bad.push(`I/Y=${solvedIY} residual ${resid} (scale ${scale}, true ${c.IY})`);
      } catch (e) {
        if (!(e instanceof FinancialError)) bad.push(`I/Y CRASH ${String(e)}`);
        else bad.push(`I/Y unexpected no-solution (N=${c.N} IY=${c.IY} PV=${c.PV} PMT=${c.PMT} FV=${c.FV} ppy=${c.ppy} begin=${c.begin})`);
      }
    }
    report('TVM N and I/Y round trip', bad, n);
    expect(bad).toEqual([]);
  });
});

describe(`NPV / IRR vs Decimal (${fin.cash.length} cash-flow problems)`, () => {
  it('NPV matches the Decimal evaluation', () => {
    const bad: string[] = [];
    for (const c of fin.cash) {
      const got = npv(c.rate, c.flows);
      const scale = c.flows.reduce((s, x) => s + Math.abs(x), 0);
      if (Math.abs(got - c.npv) > 1e-9 * scale) bad.push(`NPV got ${got} expected ${c.npv}`);
    }
    report('NPV', bad, fin.cash.length);
    expect(bad).toEqual([]);
  });

  it('IRR finds the independent root nearest 0% - or flags no solution when there is none', () => {
    const bad: string[] = [];
    for (const c of fin.cash) {
      // the app searches -99% .. +10 000% per period; roots outside that are not meaningful rates
      const inRange = c.irrRoots.filter((r) => r > -99 && r < 10000);
      const want = inRange.length ? [...inRange].sort((a, b) => Math.abs(a) - Math.abs(b))[0] : null;
      try {
        const got = irr(c.flows);
        if (want === null) bad.push(`IRR returned ${got} but the independent scan found none: ${JSON.stringify(c.flows)}`);
        else if (Math.abs(got - want) > 1e-6 * Math.max(1, Math.abs(want))) bad.push(`IRR got ${got} expected ${want}: ${JSON.stringify(c.flows)}`);
        // whatever it returns must really make NPV ~ 0
        const resid = Math.abs(npv(got, c.flows));
        // judge the leftover against the size of the discounted terms (huge near -100%)
        const scale = c.flows.reduce((s, x, j) => s + Math.abs(x) / Math.pow(1 + got / 100, j), 0);
        if (resid > 1e-7 * scale) bad.push(`IRR ${got} leaves NPV ${resid}`);
      } catch (e) {
        if (!(e instanceof FinancialError)) bad.push(`IRR CRASH ${String(e)}`);
        else if (want !== null) bad.push(`IRR flagged no-solution but a root ${want} exists: ${JSON.stringify(c.flows)}`);
      }
    }
    report('IRR', bad, fin.cash.length);
    expect(bad).toEqual([]);
  });
});

describe('random key mashing never crashes or shows a bogus number', () => {
  // small deterministic PRNG so failures reproduce
  let seed = 123456789;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
  const bogus = /NaN|Infinity|undefined|null|\[object/;

  it('scientific: 40 000 random key presses across 2 000 sessions', () => {
    const keys: SciKey[] = ['0','1','2','3','4','5','6','7','8','9','.','+','−','×','÷','x^y','(',')','%','π','sin','cos','tan','ln','log','√','mc','mr','m+','m−','deg','shift','AC','=','=','='];
    const problems: string[] = [];
    for (let s = 0; s < 2000; s++) {
      let state = initialSciState;
      const trail: string[] = [];
      for (let i = 0; i < 20; i++) {
        const k = pick(keys);
        trail.push(k);
        try {
          state = pressSci(state, k);
          if (bogus.test(sciMainLine(state)) || (state.error && sciMainLine(state) !== 'Error')) problems.push(`bad display "${sciMainLine(state)}" after ${trail.join(' ')}`);
          if (!Number.isFinite(state.memory)) problems.push(`memory ${state.memory} after ${trail.join(' ')}`);
        } catch (e) {
          problems.push(`CRASH ${String(e)} after ${trail.join(' ')}`);
          break;
        }
      }
    }
    report('scientific key mashing', problems, 2000);
    expect(problems).toEqual([]);
  });

  it('financial: 60 000 random key presses across 2 000 sessions', () => {
    const keys: FinKey[] = ['0','1','2','3','4','5','6','7','8','9','.','+','−','×','÷','%','+/–','=','AC','N','I/Y','PV','PMT','FV','CPT','2ND','CF','NPV','IRR','N','PV','CPT','CPT','='];
    const problems: string[] = [];
    for (let s = 0; s < 2000; s++) {
      let state = initialFinState;
      const trail: string[] = [];
      for (let i = 0; i < 30; i++) {
        const k = pick(keys);
        trail.push(k);
        try {
          state = pressFin(state, k);
          const main = finMainLine(state);
          if (bogus.test(main) || (state.error && main !== 'Error')) problems.push(`bad display "${main}" after ${trail.join(' ')}`);
          for (const v of Object.values(state.regs)) if (v !== null && !Number.isFinite(v)) problems.push(`register ${v} after ${trail.join(' ')}`);
        } catch (e) {
          problems.push(`CRASH ${String(e)} after ${trail.join(' ')}`);
          break;
        }
      }
    }
    report('financial key mashing', problems, 2000);
    expect(problems).toEqual([]);
  });
});
