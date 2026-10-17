import { describe, expect, it } from 'vitest';
import {
  FinancialError,
  TvmInputs,
  TvmVariable,
  irr,
  npv,
  solveTvm,
  tvmResidual,
} from '@/lib/calc/financial';
import fixtures from './fixtures/financial.json';

const base = (o: Partial<TvmInputs>): TvmInputs => ({ N: 0, IY: 0, PV: 0, PMT: 0, FV: 0, ppy: 1, begin: false, ...o });
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

describe('TVM round trip: solve each variable, plug back in, residual ~ 0', () => {
  const VARS: TvmVariable[] = ['N', 'IY', 'PV', 'PMT', 'FV'];
  const scenarios: TvmInputs[] = [
    ...fixtures.tvm,
    base({ N: 5, IY: 6, PV: -1000, PMT: 0, FV: 1338.2255776, ppy: 1 }),
    base({ N: 48, IY: 13.25, PV: 180000, PMT: -4950, FV: 0, ppy: 12 }),
    base({ N: 30, IY: 0, PV: -3000, PMT: 100, FV: 0, ppy: 12 }), // zero-interest case
  ];
  scenarios.forEach((sc, idx) => {
    for (const v of VARS) {
      it(`scenario ${idx + 1}: solve ${v}`, () => {
        // skip combinations that are mathematically degenerate for that scenario
        let solved: number;
        try {
          solved = solveTvm(v, sc);
        } catch (e) {
          expect(e).toBeInstanceOf(FinancialError);
          return;
        }
        const key = v as keyof TvmInputs;
        const withSolved = { ...sc, [key]: solved } as TvmInputs;
        // the solved value must reproduce the original equation: residual ~ 0 relative to size
        const scale = Math.max(1, Math.abs(sc.PV), Math.abs(sc.FV), Math.abs(sc.PMT) * Math.max(1, sc.N));
        expect(Math.abs(tvmResidual(withSolved)) / scale).toBeLessThan(1e-9);
      });
    }
  });
});

describe('TVM answers cross-checked against independent references', () => {
  it('matches the period-by-period recurrence (Python) for every fixture', () => {
    for (const sc of fixtures.tvm) {
      const inputs = sc as TvmInputs;
      expect(near(solveTvm('FV', inputs), sc.FV, 1e-6 * Math.max(1, Math.abs(sc.FV)))).toBe(true);
    }
  });
  it('textbook: R10 000 at 5% a year for 10 years grows to 16 288.95', () => {
    const fv = solveTvm('FV', base({ N: 10, IY: 5, PV: -10000, ppy: 1 }));
    expect(fv).toBeCloseTo(16288.95, 2);
  });
  it('published: R100 000 loan, 12% a year, 60 monthly payments -> 2 224.44', () => {
    const pmt = solveTvm('PMT', base({ N: 60, IY: 12, PV: 100000, FV: 0, ppy: 12 }));
    expect(pmt).toBeCloseTo(-2224.44, 2);
  });
  it('published: R300 000 bond at 6% over 30 years -> 1 798.65 a month', () => {
    const pmt = solveTvm('PMT', base({ N: 360, IY: 6, PV: 300000, FV: 0, ppy: 12 }));
    expect(pmt).toBeCloseTo(-1798.65, 2);
  });
  it('published: PV of R1 000 a year for 5 years at 8% (ordinary annuity) is 3 992.71', () => {
    const pv = solveTvm('PV', base({ N: 5, IY: 8, PMT: -1000, FV: 0, ppy: 1 }));
    expect(pv).toBeCloseTo(3992.71, 2);
  });
  it('published: the same annuity due (payments at the start) is 4 312.13', () => {
    const pv = solveTvm('PV', base({ N: 5, IY: 8, PMT: -1000, FV: 0, ppy: 1, begin: true }));
    expect(pv).toBeCloseTo(4312.13, 2);
  });
  it('rule of 70-ish: doubling at 7% a year takes ln2 / ln1.07 = 10.2448 years', () => {
    const n = solveTvm('N', base({ IY: 7, PV: -1000, FV: 2000, ppy: 1 }));
    expect(n).toBeCloseTo(Math.log(2) / Math.log(1.07), 9);
    expect(n).toBeCloseTo(10.2448, 4);
  });
  it('I/Y: R1 000 growing to R2 000 in 10 years is 7.1773% a year', () => {
    const iy = solveTvm('IY', base({ N: 10, PV: -1000, FV: 2000, ppy: 1 }));
    expect(iy).toBeCloseTo(7.1773, 4);
  });
  it('I/Y of a loan: R100 000, 60 payments of 2 224.44 -> ~12% a year', () => {
    const iy = solveTvm('IY', base({ N: 60, PV: 100000, PMT: -2224.44, FV: 0, ppy: 12 }));
    expect(iy).toBeCloseTo(12, 3);
  });
  it('zero interest is plain arithmetic: PV + PMT·N + FV = 0', () => {
    expect(solveTvm('FV', base({ N: 10, IY: 0, PV: -500, PMT: -100 }))).toBeCloseTo(1500, 9);
    expect(solveTvm('PMT', base({ N: 10, IY: 0, PV: 1000, FV: 0 }))).toBeCloseTo(-100, 9);
    expect(solveTvm('N', base({ IY: 0, PV: 1000, PMT: -100, FV: 0 }))).toBeCloseTo(10, 9);
  });
  it('flags impossible problems instead of guessing', () => {
    // growth can never be negative-time: PV and FV same sign with no payments
    expect(() => solveTvm('N', base({ IY: 5, PV: 1000, FV: 2000, PMT: 0 }))).toThrow(FinancialError);
    expect(() => solveTvm('IY', base({ N: 5, PV: 1000, FV: 2000, PMT: 0 }))).toThrow(FinancialError);
    expect(() => solveTvm('PMT', base({ N: 0, IY: 5, PV: 1000, FV: 0 }))).toThrow(FinancialError);
  });
});

describe('sign convention: outflows negative, inflows positive', () => {
  it('borrowing (PV positive, money in) means a negative payment (money out)', () => {
    const pmt = solveTvm('PMT', base({ N: 12, IY: 10, PV: 5000, FV: 0, ppy: 12 }));
    expect(pmt).toBeLessThan(0);
  });
  it('investing (PV negative, money out) grows to a positive FV (money back)', () => {
    const fv = solveTvm('FV', base({ N: 12, IY: 10, PV: -5000, PMT: 0, ppy: 12 }));
    expect(fv).toBeGreaterThan(5000);
  });
  it('saving every month (PMT negative) builds a positive FV', () => {
    const fv = solveTvm('FV', base({ N: 24, IY: 8, PV: 0, PMT: -500, ppy: 12 }));
    expect(fv).toBeGreaterThan(500 * 24);
  });
  it('flipping every sign flips the answer and nothing else', () => {
    const a = solveTvm('PMT', base({ N: 36, IY: 9, PV: 20000, FV: 0, ppy: 12 }));
    const b = solveTvm('PMT', base({ N: 36, IY: 9, PV: -20000, FV: 0, ppy: 12 }));
    expect(a).toBeCloseTo(-b, 9);
  });
});

describe('NPV and IRR (published / worked examples)', () => {
  it('NPV: -1000 then 500, 400, 300, 100 at 10% = 78.82', () => {
    expect(npv(10, [-1000, 500, 400, 300, 100])).toBeCloseTo(78.82, 2);
  });
  it('NPV: -100 then 110 at 10% is exactly 0', () => {
    expect(npv(10, [-100, 110])).toBeCloseTo(0, 10);
  });
  it('NPV matches Python for every fixture', () => {
    for (const c of fixtures.npv) expect(npv(c.rate, c.flows)).toBeCloseTo(c.expected, 6);
  });
  it('NPV at 0% is just the sum', () => {
    expect(npv(0, [-100, 30, 40, 50])).toBeCloseTo(20, 10);
  });
  it('IRR: -100 then 110 is 10%', () => {
    expect(irr([-100, 110])).toBeCloseTo(10, 8);
  });
  it('IRR (Excel documentation example): -70 000, 12 000, 15 000, 18 000, 21 000, 26 000 is 8.66%', () => {
    expect(irr([-70000, 12000, 15000, 18000, 21000, 26000])).toBeCloseTo(8.66, 2);
  });
  it('IRR (Excel documentation example): after four years the IRR is -2.12%', () => {
    expect(irr([-70000, 12000, 15000, 18000, 21000])).toBeCloseTo(-2.12, 2);
  });
  it('IRR makes NPV zero', () => {
    const flows = [-5000, 1500, 1800, 2200, 1400];
    expect(npv(irr(flows), flows)).toBeCloseTo(0, 6);
  });
  it('IRR is flagged, not guessed, when no real solution exists', () => {
    expect(() => irr([100, 200, 300])).toThrow(FinancialError); // no outflow
    expect(() => irr([-100, -200])).toThrow(FinancialError); // no inflow
    expect(() => irr([-100])).toThrow(FinancialError); // too short
    expect(() => irr([-100, 10, 10])).not.toThrow(); // valid (negative IRR)
    expect(irr([-100, 10, 10])).toBeLessThan(0);
  });
  it('NPV needs cash flows and a sane rate', () => {
    expect(() => npv(10, [])).toThrow(FinancialError);
    expect(() => npv(-100, [-1, 2])).toThrow(FinancialError);
  });
});
