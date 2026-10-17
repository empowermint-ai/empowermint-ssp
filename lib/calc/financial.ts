// Time-value-of-money and cash-flow maths for the financial calculator.
//
// Sign convention (same as a TI BA II Plus / HP 12C): money you PAY OUT is
// negative, money you RECEIVE is positive. Borrow R100 000 (PV = +100 000, you
// receive it) and the payment you must make comes out negative (PMT < 0).
//
// The five TVM variables always satisfy, with i the rate per period:
//   PV·(1+i)^N + PMT·(1+i·k)·((1+i)^N − 1)/i + FV = 0
// where k = 1 for payments at the START of each period (BGN) and 0 at the END.
// When i = 0 this becomes PV + PMT·N + FV = 0.

export type TvmVariable = 'N' | 'IY' | 'PV' | 'PMT' | 'FV';

export interface TvmInputs {
  N: number;
  /** Annual rate in percent, e.g. 11.5 for 11.5%. */
  IY: number;
  PV: number;
  PMT: number;
  FV: number;
  /** Payments (compounding periods) per year; 12 = monthly. */
  ppy: number;
  /** true = payments at the beginning of each period (annuity due). */
  begin: boolean;
}

export type FinancialErrorCode = 'no-solution' | 'invalid' | 'missing';

export class FinancialError extends Error {
  code: FinancialErrorCode;
  constructor(code: FinancialErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'FinancialError';
  }
}

export const TOLERANCE = 1e-12;
const MAX_ITER = 200;

const periodRate = (IY: number, ppy: number) => IY / 100 / ppy;

/** (1+i·k)·((1+i)^N − 1)/i, with the i → 0 limit N handled. */
function annuityFactor(i: number, N: number, begin: boolean): number {
  const k = begin ? 1 : 0;
  if (Math.abs(i) < 1e-14) return N;
  return ((1 + i * k) * (Math.pow(1 + i, N) - 1)) / i;
}

/** Residual of the TVM equation: zero when all five variables are consistent. */
export function tvmResidual(v: TvmInputs): number {
  const i = periodRate(v.IY, v.ppy);
  return v.PV * Math.pow(1 + i, v.N) + v.PMT * annuityFactor(i, v.N, v.begin) + v.FV;
}

function finite(x: number): number {
  if (!Number.isFinite(x)) throw new FinancialError('no-solution');
  return x;
}

function requireValid(v: TvmInputs) {
  if (!(v.ppy > 0)) throw new FinancialError('invalid', 'P/Y must be positive');
}

export function solveFV(v: TvmInputs): number {
  requireValid(v);
  const i = periodRate(v.IY, v.ppy);
  return finite(-(v.PV * Math.pow(1 + i, v.N) + v.PMT * annuityFactor(i, v.N, v.begin)));
}

export function solvePV(v: TvmInputs): number {
  requireValid(v);
  const i = periodRate(v.IY, v.ppy);
  return finite(-(v.FV + v.PMT * annuityFactor(i, v.N, v.begin)) / Math.pow(1 + i, v.N));
}

export function solvePMT(v: TvmInputs): number {
  requireValid(v);
  const i = periodRate(v.IY, v.ppy);
  const f = annuityFactor(i, v.N, v.begin);
  if (f === 0) throw new FinancialError('no-solution');
  return finite(-(v.FV + v.PV * Math.pow(1 + i, v.N)) / f);
}

export function solveN(v: TvmInputs): number {
  requireValid(v);
  const i = periodRate(v.IY, v.ppy);
  const c = 1 + (v.begin ? i : 0);
  if (Math.abs(i) < 1e-14) {
    if (v.PMT === 0) throw new FinancialError('no-solution');
    return finite(-(v.PV + v.FV) / v.PMT);
  }
  const numerator = v.PMT * c - v.FV * i;
  const denominator = v.PMT * c + v.PV * i;
  if (denominator === 0 || numerator / denominator <= 0) throw new FinancialError('no-solution');
  return finite(Math.log(numerator / denominator) / Math.log(1 + i));
}

/**
 * Solve for I/Y (annual percent). The equation can have more than one root, so
 * the search brackets a sign change on a grid of per-period rates from -99% to
 * +1000% and keeps the root nearest zero; each bracket is then polished with
 * Newton-Raphson, falling back to bisection if a Newton step leaves the bracket.
 * Convergence tolerance: |residual| < 1e-12 or bracket width < 1e-15.
 */
export function solveIY(v: TvmInputs): number {
  requireValid(v);
  if (v.N <= 0) throw new FinancialError('invalid', 'N must be positive');
  const f = (i: number) =>
    v.PV * Math.pow(1 + i, v.N) + v.PMT * annuityFactor(i, v.N, v.begin) + v.FV;

  const grid: number[] = [];
  for (let x = -0.99; x < -0.001; x += 0.01) grid.push(x);
  for (let e = -6; e <= 1; e += 0.05) grid.push(Math.pow(10, e) * 1); // 1e-6 .. 10 (positive)
  grid.sort((a, b) => a - b);
  // include i = 0 neighbourhood explicitly
  grid.push(0);
  grid.sort((a, b) => a - b);

  const roots: number[] = [];
  for (let k = 0; k < grid.length - 1; k++) {
    const lo = grid[k];
    const hi = grid[k + 1];
    const flo = f(lo);
    const fhi = f(hi);
    if (!Number.isFinite(flo) || !Number.isFinite(fhi)) continue;
    if (flo === 0) roots.push(lo);
    else if (flo * fhi < 0) roots.push(refineRoot(f, lo, hi));
  }
  if (roots.length === 0) throw new FinancialError('no-solution');
  roots.sort((a, b) => Math.abs(a) - Math.abs(b));
  return roots[0] * v.ppy * 100;
}

function refineRoot(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  let fa = f(a);
  let x = (a + b) / 2;
  for (let n = 0; n < MAX_ITER; n++) {
    const fx = f(x);
    if (Math.abs(fx) < TOLERANCE || (b - a) / 2 < 1e-15) return x;
    if (fa * fx < 0) b = x;
    else {
      a = x;
      fa = fx;
    }
    // Newton step from x using a numeric derivative; keep it only if it stays inside [a, b]
    const h = Math.max(1e-9, Math.abs(x) * 1e-7);
    const d = (f(x + h) - f(x - h)) / (2 * h);
    const nx = d !== 0 && Number.isFinite(d) ? x - fx / d : NaN;
    x = nx > a && nx < b ? nx : (a + b) / 2;
  }
  return x;
}

export function solveTvm(variable: TvmVariable, v: TvmInputs): number {
  switch (variable) {
    case 'N':
      return solveN(v);
    case 'IY':
      return solveIY(v);
    case 'PV':
      return solvePV(v);
    case 'PMT':
      return solvePMT(v);
    case 'FV':
      return solveFV(v);
  }
}

// ---- cash flows ---------------------------------------------------------

/** NPV = CF0 + Σ CFj / (1 + r)^j, r = rate per period in percent. */
export function npv(ratePercent: number, flows: number[]): number {
  if (flows.length === 0) throw new FinancialError('missing');
  const r = ratePercent / 100;
  if (r <= -1) throw new FinancialError('invalid', 'rate must be above -100%');
  let total = 0;
  for (let j = 0; j < flows.length; j++) total += flows[j] / Math.pow(1 + r, j);
  return finite(total);
}

/**
 * IRR (percent per period): the rate where NPV = 0. Needs at least one inflow and
 * one outflow, otherwise no real IRR exists. Brackets sign changes of NPV between
 * -99% and +10 000%, keeps the root nearest zero, refines with Newton-Raphson and
 * a bisection fallback (tolerance 1e-12). Cash-flow series with several sign
 * changes can have several IRRs - the one nearest 0% is returned.
 */
export function irr(flows: number[]): number {
  if (flows.length < 2) throw new FinancialError('missing');
  const hasPos = flows.some((x) => x > 0);
  const hasNeg = flows.some((x) => x < 0);
  if (!hasPos || !hasNeg) throw new FinancialError('no-solution');
  const f = (r: number) => {
    let t = 0;
    for (let j = 0; j < flows.length; j++) t += flows[j] / Math.pow(1 + r, j);
    return t;
  };
  const grid: number[] = [];
  for (let x = -0.99; x < 0; x += 0.01) grid.push(x);
  for (let e = -6; e <= 2; e += 0.05) grid.push(Math.pow(10, e));
  grid.push(0);
  grid.sort((a, b) => a - b);
  const roots: number[] = [];
  for (let k = 0; k < grid.length - 1; k++) {
    const flo = f(grid[k]);
    const fhi = f(grid[k + 1]);
    if (!Number.isFinite(flo) || !Number.isFinite(fhi)) continue;
    if (flo === 0) roots.push(grid[k]);
    else if (flo * fhi < 0) roots.push(refineRoot(f, grid[k], grid[k + 1]));
  }
  if (roots.length === 0) throw new FinancialError('no-solution');
  roots.sort((a, b) => Math.abs(a) - Math.abs(b));
  return roots[0] * 100;
}
