import { describe, expect, it } from 'vitest';
import { FinKey, FinState, finInputLine, finMainLine, initialFinState, pressFin } from '@/lib/calc/financialState';

const press = (keys: FinKey[], from: FinState = initialFinState) => keys.reduce(pressFin, from);

describe('financial key presses', () => {
  it('store three, compute PV (BA II Plus flow)', () => {
    const s = press(['2', '4', 'N', '1', '1', '.', '5', 'I/Y', '+/–', '8', '5', '0', 'PMT', '0', 'FV', 'CPT', 'PV']);
    expect(finInputLine({ ...s, regs: { ...s.regs, PV: null } })).toBe('N=24  I/Y=11.5  PMT=-850  FV=0');
    expect(s.regs.PV).toBeGreaterThan(0); // receiving the loan amount is positive
    expect(finMainLine(s)).toMatch(/^PV = R [\d,]+\.\d{2}$/);
  });
  it('the +/- key makes a typed number negative and back', () => {
    expect(press(['8', '5', '0', '+/–']).buffer).toBe('(-850)');
    expect(press(['8', '5', '0', '+/–', '+/–']).buffer).toBe('850');
  });
  it('recalls a stored variable', () => {
    const s = press(['2', '4', 'N', 'AC', 'N']);
    expect(finMainLine(s)).toBe('N = 24');
  });
  it('CPT with a missing input is a clear error, cleared with AC', () => {
    let s = press(['2', '4', 'N', 'CPT', 'PV']);
    expect(s.error).toBe(true);
    expect(s.message).toBe('missing');
    expect(finMainLine(s)).toBe('Error');
    s = press(['AC'], s);
    expect(s.error).toBe(false);
  });
  it('stores an expression result: 6 × 4 N', () => {
    expect(press(['6', '×', '4', 'N']).regs.N).toBe(24);
  });
  it('2ND + N cycles payments per year, 2ND + PV toggles BGN', () => {
    let s = press(['2ND', 'N']);
    expect(s.ppy).toBe(1);
    s = press(['2ND', 'PV'], s);
    expect(s.begin).toBe(true);
  });
  it('2ND + CPT clears the TVM registers', () => {
    const s = press(['5', 'N', '2ND', 'CPT']);
    expect(s.regs.N).toBeNull();
  });
  it('cash flows: build CF list then NPV and IRR', () => {
    let s = press(['CF', '1', '0', '0', '0', '+/–', '=', '5', '0', '0', '=', '4', '0', '0', '=', '3', '0', '0', '=', '1', '0', '0', '=']);
    expect(s.flows).toEqual([-1000, 500, 400, 300, 100]);
    s = press(['CF', '1', '0', 'I/Y', 'NPV'], s);
    expect(s.out?.label).toBe('NPV');
    expect(s.out?.value).toBeCloseTo(78.82, 2);
    s = press(['IRR'], s);
    expect(s.out?.label).toBe('IRR');
    expect(s.out?.value).toBeGreaterThan(10);
  });
  it('NPV without cash flows or a rate is an error, IRR without a sign change is an error', () => {
    expect(press(['NPV']).message).toBe('missing');
    const onlyPositive = press(['CF', '1', '0', '0', '=', '2', '0', '0', '=', 'CF', 'IRR']);
    expect(onlyPositive.error).toBe(true);
    expect(onlyPositive.message).toBe('no-solution');
  });
  it('2ND + CF clears the cash-flow list', () => {
    const s = press(['CF', '5', '=', '2ND', 'CF']);
    expect(s.flows).toEqual([]);
  });
  it('bad arithmetic (divide by zero) is an error, not a wrong number', () => {
    const s = press(['5', '÷', '0', '=']);
    expect(s.error).toBe(true);
  });
  it('keys are ignored in the error state until AC', () => {
    let s = press(['5', '÷', '0', '=']);
    s = press(['2', '+', '2', '='], s);
    expect(finMainLine(s)).toBe('Error');
    s = press(['AC', '2', '+', '2', '='], s);
    expect(finMainLine(s)).toBe('4');
  });
});
