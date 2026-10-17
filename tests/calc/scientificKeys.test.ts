import { describe, expect, it } from 'vitest';
import { SciKey, SciState, initialSciState, pressSci, sciMainLine, sciSmallLine } from '@/lib/calc/scientificState';

const press = (keys: SciKey[], from: SciState = initialSciState) => keys.reduce(pressSci, from);

describe('scientific key presses', () => {
  it('2 + 3 × 4 = shows 14', () => {
    const s = press(['2', '+', '3', '×', '4', '=']);
    expect(sciMainLine(s)).toBe('14');
    expect(sciSmallLine(s)).toBe('2+3×4');
  });
  it('sin(45) + √(64)', () => {
    const s = press(['sin', '4', '5', ')', '+', '√', '6', '4', ')', '=']);
    expect(sciMainLine(s)).toBe('8.70710678119');
  });
  it('unclosed parentheses are closed by =', () => {
    expect(sciMainLine(press(['sin', '3', '0', '=']))).toBe('0.5');
  });
  it('continuing from the answer uses it as the first operand', () => {
    const s = press(['9', '×', '9', '=', '÷', '3', '=']);
    expect(sciMainLine(s)).toBe('27');
  });
  it('a digit after = starts a new calculation', () => {
    const s = press(['2', '+', '2', '=', '7']);
    expect(sciMainLine(s)).toBe('7');
  });
  it('0.1 + 0.2 displays 0.3', () => {
    expect(sciMainLine(press(['0', '.', '1', '+', '0', '.', '2', '=']))).toBe('0.3');
  });
  it('only one decimal point per number', () => {
    expect(sciMainLine(press(['1', '.', '.', '5']))).toBe('1.5');
    expect(sciMainLine(press(['1', '.', '5', '+', '2', '.', '5', '.', '5']))).toBe('1.5+2.55');
  });
  it('a second operator replaces the first', () => {
    expect(sciMainLine(press(['5', '+', '×', '3', '=']))).toBe('15');
  });
  it('degree / radian toggle changes the same input\'s answer', () => {
    const deg = press(['sin', '9', '0', '=']);
    expect(deg.angle).toBe('deg');
    expect(sciMainLine(deg)).toBe('1');
    const rad = press(['deg', 'sin', '9', '0', '=']);
    expect(rad.angle).toBe('rad');
    expect(sciMainLine(rad)).toBe('0.893996663601');
  });
  it('shift gives inverse trig: sin⁻¹(0.5) = 30°', () => {
    const s = press(['shift', 'sin', '0', '.', '5', '=']);
    expect(sciMainLine(s)).toBe('30');
  });
  it('shift + √ squares: 7 → 49', () => {
    expect(sciMainLine(press(['7', 'shift', '√', '=']))).toBe('49');
  });
  it('percent: 200 × 15 % = 30', () => {
    expect(sciMainLine(press(['2', '0', '0', '×', '1', '5', '%', '=']))).toBe('30');
  });
  it('π key', () => {
    expect(sciMainLine(press(['π', '×', '2', '=']))).toBe('6.28318530718');
  });
});

describe('memory keys', () => {
  it('m+ adds, m− subtracts, mr recalls, mc clears', () => {
    let s = press(['5', '+', '5', 'm+']); // memory = 10
    expect(s.memory).toBe(10);
    s = press(['AC', '3', 'm−'], s); // memory = 7
    expect(s.memory).toBe(7);
    s = press(['AC', 'mr', '×', '2', '='], s);
    expect(sciMainLine(s)).toBe('14');
    s = press(['mc'], s);
    expect(s.memory).toBe(0);
  });
  it('memory survives AC but angle mode too', () => {
    const s = press(['deg', '8', 'm+', 'AC']);
    expect(s.memory).toBe(8);
    expect(s.angle).toBe('rad');
  });
  it('negative memory recalls in brackets', () => {
    const s = press(['5', 'm−', 'mr', '×', '2', '=']);
    expect(s.memory).toBe(-5);
    expect(sciMainLine(s)).toBe('-10');
  });
});

describe('error states are clean and clearable', () => {
  const errors: [string, SciKey[]][] = [
    ['divide by zero', ['1', '÷', '0', '=']],
    ['sqrt of negative', ['√', '0', '−', '4', ')', '=']],
    ['log of zero', ['log', '0', '=']],
    ['ln of negative', ['ln', '0', '−', '2', ')', '=']],
    ['syntax', ['2', '+', '=']],
    ['overflow', ['9', '9', '9', '9', 'x^y', '9', '9', '9', '9', '=']],
  ];
  for (const [name, keys] of errors) {
    it(`${name}: shows Error, ignores keys, AC recovers`, () => {
      let s = press(keys);
      expect(s.error).toBe(true);
      expect(sciMainLine(s)).toBe('Error');
      s = press(['5', '+', '1', '='], s); // everything but AC is ignored
      expect(sciMainLine(s)).toBe('Error');
      s = press(['AC', '2', '+', '2', '='], s);
      expect(s.error).toBe(false);
      expect(sciMainLine(s)).toBe('4');
    });
  }
  it('= and operators on an empty display do nothing (no crash, no wrong number)', () => {
    expect(sciMainLine(press(['=']))).toBe('0');
    expect(sciMainLine(press(['×']))).toBe('0');
    expect(sciMainLine(press(['÷', '=']))).toBe('0');
    expect(sciMainLine(press(['%']))).toBe('0');
    expect(sciMainLine(press([')']))).toBe('0');
  });
  it('m+ on an empty display does not corrupt memory', () => {
    const s = press(['m+']);
    expect(s.memory).toBe(0);
  });
});
