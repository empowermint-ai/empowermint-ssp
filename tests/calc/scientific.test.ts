import { describe, expect, it } from 'vitest';
import { CalcError, autoClose, evaluate } from '@/lib/calc/expression';
import { formatNumber } from '@/lib/calc/format';
import fixtures from './fixtures/scientific.json';

const close = (a: number, b: number, tol = 1e-12) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

describe('operator precedence and parentheses (reference: Python arithmetic)', () => {
  it('has at least 10 reference expressions', () => {
    expect(fixtures.precedence.length).toBeGreaterThanOrEqual(10);
  });
  for (const c of fixtures.precedence) {
    it(`${c.expr} = ${c.expected}`, () => {
      expect(close(evaluate(c.expr), c.expected)).toBe(true);
    });
  }
  it('2 + 3 × 4 is 14, not 20', () => {
    expect(evaluate('2+3×4')).toBe(14);
  });
  it('supports implicit multiplication and nested functions', () => {
    expect(close(evaluate('2π'), 2 * Math.PI)).toBe(true);
    expect(evaluate('3(4+1)')).toBe(15);
    expect(close(evaluate('2sin(30)'), 1)).toBe(true);
    expect(close(evaluate('√(sin(30)+3.5)'), 2)).toBe(true);
  });
});

describe('scientific functions', () => {
  it('trig at 0, 30, 45, 60, 90 and more degrees matches Python math', () => {
    for (const t of fixtures.trig) {
      expect(close(evaluate(`sin(${t.deg})`, 'deg'), t.sin, 1e-12)).toBe(true);
      expect(close(evaluate(`cos(${t.deg})`, 'deg'), t.cos, 1e-12)).toBe(true);
      if (t.tan !== null) expect(close(evaluate(`tan(${t.deg})`, 'deg'), t.tan, 1e-10)).toBe(true);
    }
  });
  it('exact values show cleanly: sin(30)=0.5, cos(60)=0.5, sin(180)=0, cos(90)=0', () => {
    expect(evaluate('sin(30)')).toBeCloseTo(0.5, 12);
    expect(evaluate('cos(60)')).toBeCloseTo(0.5, 12);
    expect(evaluate('sin(180)')).toBe(0);
    expect(evaluate('cos(90)')).toBe(0);
    expect(evaluate('sin(90)')).toBe(1);
    expect(evaluate('tan(45)')).toBeCloseTo(1, 12);
  });
  it('degree and radian modes give different, both-correct answers', () => {
    expect(evaluate('sin(90)', 'deg')).toBe(1);
    expect(evaluate('sin(90)', 'rad')).toBeCloseTo(0.8939966636005579, 12); // math.sin(90)
    expect(evaluate('sin(π/2)', 'rad')).toBeCloseTo(1, 12);
    expect(evaluate('cos(π)', 'rad')).toBeCloseTo(-1, 12);
    expect(evaluate('sin(π)', 'rad')).toBe(0); // float dust snapped
  });
  it('inverse trig respects the mode', () => {
    expect(evaluate('asin(0.5)', 'deg')).toBeCloseTo(30, 10);
    expect(evaluate('asin(0.5)', 'rad')).toBeCloseTo(Math.PI / 6, 12);
    expect(evaluate('atan(1)', 'deg')).toBeCloseTo(45, 10);
    expect(evaluate('acos(0)', 'deg')).toBeCloseTo(90, 10);
  });
  it('ln, log, sqrt, exponent, pi, percent', () => {
    expect(evaluate('ln(e)')).toBeCloseTo(1, 12);
    expect(evaluate('ln(10)')).toBeCloseTo(2.302585092994046, 12);
    expect(evaluate('log(1000)')).toBeCloseTo(3, 12);
    expect(evaluate('log(2)')).toBeCloseTo(0.3010299956639812, 12);
    expect(evaluate('√(144)')).toBe(12);
    expect(evaluate('2^10')).toBe(1024);
    expect(evaluate('9^0.5')).toBe(3);
    expect(evaluate('π')).toBe(Math.PI);
    expect(evaluate('50%')).toBe(0.5);
    expect(evaluate('200×15%')).toBe(30);
    expect(evaluate('exp(1)')).toBeCloseTo(Math.E, 12);
    expect(evaluate('pow10(3)')).toBe(1000);
  });
});

describe('angle edge cases found by fuzzing', () => {
  it('a tiny negative angle is treated as 0 degrees, not an error', () => {
    expect(evaluate('sin(−1e-17)', 'deg')).toBe(0);
    expect(evaluate('cos(−1e-17)', 'deg')).toBe(1);
    expect(evaluate('tan(−1e-17)', 'deg')).toBe(0);
  });
  it('negative and wrapped angles', () => {
    expect(evaluate('sin(−30)', 'deg')).toBeCloseTo(-0.5, 12);
    expect(evaluate('cos(−60)', 'deg')).toBeCloseTo(0.5, 12);
    expect(evaluate('sin(390)', 'deg')).toBeCloseTo(0.5, 12);
    expect(evaluate('sin(−270)', 'deg')).toBe(1);
  });
});

describe('error cases never crash or return a wrong number', () => {
  const code = (expr: string) => {
    try {
      evaluate(expr);
      return 'no-error';
    } catch (e) {
      return e instanceof CalcError ? e.code : 'crash';
    }
  };
  it('divide by zero', () => {
    expect(code('1÷0')).toBe('divide-by-zero');
    expect(code('5÷(3−3)')).toBe('divide-by-zero');
    expect(code('0^−1')).toBe('divide-by-zero');
  });
  it('sqrt of a negative', () => expect(code('√(−4)')).toBe('domain'));
  it('log / ln of zero or negative', () => {
    expect(code('log(0)')).toBe('domain');
    expect(code('ln(0)')).toBe('domain');
    expect(code('ln(−5)')).toBe('domain');
    expect(code('log(−1)')).toBe('domain');
  });
  it('tan(90°) is undefined', () => expect(code('tan(90)')).toBe('domain'));
  it('inverse trig out of range', () => expect(code('asin(2)')).toBe('domain'));
  it('0^0 and negative^fraction are undefined', () => {
    expect(code('0^0')).toBe('domain');
    expect(code('(−8)^0.5')).toBe('domain');
  });
  it('empty or undefined input', () => {
    expect(code('')).toBe('empty');
    expect(code('   ')).toBe('empty');
  });
  it('malformed input is a syntax error', () => {
    for (const bad of ['2+', '*3', '(2+3', '2+3)', '1..2', 'sin', 'foo(2)', '2 3 +']) {
      expect(['syntax', 'empty']).toContain(code(bad));
    }
  });
  it('numeric overflow', () => {
    expect(code('10^400')).toBe('overflow');
    expect(code('exp(1000)')).toBe('overflow');
  });
  it('autoClose completes open parentheses only', () => {
    expect(autoClose('sin(30')).toBe('sin(30)');
    expect(autoClose('((1+2')).toBe('((1+2))');
    expect(autoClose('1+2')).toBe('1+2');
  });
});

describe('floating point: round only at display time', () => {
  it('0.1 + 0.2 keeps the raw double but displays 0.3', () => {
    const raw = evaluate('0.1+0.2');
    expect(raw).toBe(0.30000000000000004); // working value untouched
    expect(formatNumber(raw)).toBe('0.3');
  });
  it('other classic edge cases display cleanly', () => {
    expect(formatNumber(evaluate('1.1×3'))).toBe('3.3');
    expect(formatNumber(evaluate('0.3−0.1'))).toBe('0.2');
    expect(formatNumber(evaluate('1÷3'))).toBe('0.333333333333');
    expect(formatNumber(evaluate('sin(30)'))).toBe('0.5');
    expect(formatNumber(evaluate('2^0.5'))).toBe('1.41421356237');
  });
  it('chained operations do not compound display rounding', () => {
    // (1/3) * 3 must be exactly 1 in the working value
    expect(evaluate('(1÷3)×3')).toBe(1);
    expect(formatNumber(evaluate('1÷3×3×3÷3'))).toBe('1');
  });
  it('large and small magnitudes use scientific notation', () => {
    expect(formatNumber(1.5e15)).toBe('1.5e+15');
    expect(formatNumber(2.5e-12)).toBe('2.5e-12');
    expect(formatNumber(-123456789012)).toBe('-123456789012');
  });
});
