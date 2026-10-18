// Expression evaluator for the scientific (and financial keypad) calculators.
//
// A recursive-descent parser with proper operator precedence and parentheses:
//   1. parentheses / function calls
//   2. postfix percent            50%      -> 0.5
//   3. power (right-assoc)        2^3^2    -> 2^(3^2) = 512
//   4. unary minus / plus         -2^2     -> -(2^2) = -4   (as written in maths)
//   5. multiply / divide, with implicit multiplication (2π, 3(4+1), 2sin(30))
//   6. add / subtract
//
// Everything is IEEE 754 double precision. Nothing here rounds: rounding is a
// display concern (see format.ts) so chained operations never compound error.

export type AngleMode = 'deg' | 'rad';

export type CalcErrorCode =
  | 'syntax'
  | 'divide-by-zero'
  | 'domain'
  | 'overflow'
  | 'empty';

export class CalcError extends Error {
  code: CalcErrorCode;
  constructor(code: CalcErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'CalcError';
  }
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' }
  | { t: 'pct' }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'fn'; v: string }
  | { t: 'const'; v: number };

const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'ln',
  'log',
  'sqrt',
  'exp',
  'pow10',
]);

/** Visible key symbols are normalised to plain ASCII before tokenising. */
function normalise(input: string): string {
  return input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/√/g, 'sqrt')
    .replace(/\s+/g, '');
}

function tokenise(input: string): Token[] {
  const s = normalise(input);
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      let dots = 0;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) {
        if (s[j] === '.') dots++;
        j++;
      }
      // optional exponent part, e.g. 1.5e-7 (only when followed by digits)
      const exp = /^[eE][+-]?\d+/.exec(s.slice(j));
      let text = s.slice(i, j);
      if (exp) {
        text += exp[0];
        j += exp[0].length;
      }
      if (dots > 1 || text === '.') throw new CalcError('syntax');
      tokens.push({ t: 'num', v: Number(text) });
      i = j;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '%') {
      tokens.push({ t: 'pct' });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ t: 'lp' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ t: 'rp' });
      i++;
      continue;
    }
    if (c === 'π') {
      tokens.push({ t: 'const', v: Math.PI });
      i++;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z0-9]/.test(s[j])) {
        // stop before a digit run that is not part of a known name (pow10 is)
        j++;
      }
      const word = s.slice(i, j);
      if (word === 'e') {
        tokens.push({ t: 'const', v: Math.E });
      } else if (word === 'pi') {
        tokens.push({ t: 'const', v: Math.PI });
      } else if (FUNCTIONS.has(word)) {
        tokens.push({ t: 'fn', v: word });
      } else {
        throw new CalcError('syntax');
      }
      i = j;
      continue;
    }
    throw new CalcError('syntax');
  }
  return tokens;
}

const RAD_PER_DEG = Math.PI / 180;

/** Snap float dust such as 1.2246e-16 (sin of a whole π) to an exact 0. */
function snap(x: number): number {
  return Math.abs(x) < 1e-15 ? 0 : x;
}

/** x mod 360 in [0, 360), exact for any size of input (no add-then-mod rounding). */
function reduceDegrees(x: number): number {
  let a = x % 360;
  if (a < 0) a += 360;
  // a tiny negative angle rounds up to exactly 360: that is 0 degrees
  return a >= 360 ? 0 : a;
}

export function sinOf(x: number, mode: AngleMode): number {
  if (mode === 'deg') {
    const a = reduceDegrees(x);
    if (a % 90 === 0) return [0, 1, 0, -1][a / 90];
    return Math.sin(a * RAD_PER_DEG); // reduced angle: exact for huge inputs
  }
  return snap(Math.sin(x));
}

export function cosOf(x: number, mode: AngleMode): number {
  if (mode === 'deg') {
    const a = reduceDegrees(x);
    if (a % 90 === 0) return [1, 0, -1, 0][a / 90];
    return Math.cos(a * RAD_PER_DEG); // reduced angle: exact for huge inputs
  }
  return snap(Math.cos(x));
}

export function tanOf(x: number, mode: AngleMode): number {
  if (mode === 'deg') {
    const a = reduceDegrees(x);
    if (a % 180 === 90) throw new CalcError('domain', 'tan undefined');
    if (a % 180 === 0) return 0;
    return Math.tan(a * RAD_PER_DEG); // reduced angle: exact for huge inputs
  }
  const c = Math.cos(x);
  if (Math.abs(c) < 1e-15) throw new CalcError('domain', 'tan undefined');
  return snap(Math.tan(x));
}

function applyFunction(name: string, x: number, mode: AngleMode): number {
  switch (name) {
    case 'sin':
      return sinOf(x, mode);
    case 'cos':
      return cosOf(x, mode);
    case 'tan':
      return tanOf(x, mode);
    case 'asin':
    case 'acos': {
      if (x < -1 || x > 1) throw new CalcError('domain');
      const r = name === 'asin' ? Math.asin(x) : Math.acos(x);
      return mode === 'deg' ? r / RAD_PER_DEG : r;
    }
    case 'atan': {
      const r = Math.atan(x);
      return mode === 'deg' ? r / RAD_PER_DEG : r;
    }
    case 'ln':
      if (x <= 0) throw new CalcError('domain');
      return Math.log(x);
    case 'log':
      if (x <= 0) throw new CalcError('domain');
      return Math.log10(x);
    case 'sqrt':
      if (x < 0) throw new CalcError('domain');
      return Math.sqrt(x);
    case 'exp':
      return Math.exp(x);
    case 'pow10':
      return Math.pow(10, x);
    default:
      throw new CalcError('syntax');
  }
}

export function power(base: number, exponent: number): number {
  if (base === 0 && exponent < 0) throw new CalcError('divide-by-zero');
  if (base === 0 && exponent === 0) throw new CalcError('domain'); // 0^0 undefined
  const r = Math.pow(base, exponent);
  if (Number.isNaN(r)) throw new CalcError('domain'); // negative ^ fraction
  return r;
}

function guard(x: number): number {
  if (Number.isNaN(x)) throw new CalcError('domain');
  if (!Number.isFinite(x)) throw new CalcError('overflow');
  return x;
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private mode: AngleMode
  ) {}

  parse(): number {
    if (this.tokens.length === 0) throw new CalcError('empty');
    const value = this.expression();
    if (this.pos !== this.tokens.length) throw new CalcError('syntax');
    return guard(value);
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expression(): number {
    let left = this.term();
    for (;;) {
      const tk = this.peek();
      if (tk && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
        this.pos++;
        const right = this.term();
        left = guard(tk.v === '+' ? left + right : left - right);
      } else return left;
    }
  }

  private startsOperand(tk: Token | undefined): boolean {
    return !!tk && (tk.t === 'num' || tk.t === 'lp' || tk.t === 'fn' || tk.t === 'const');
  }

  private term(): number {
    let left = this.unary();
    for (;;) {
      const tk = this.peek();
      if (tk && tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        this.pos++;
        const right = this.unary();
        if (tk.v === '/') {
          if (right === 0) throw new CalcError('divide-by-zero');
          left = guard(left / right);
        } else {
          left = guard(left * right);
        }
      } else if (this.startsOperand(tk)) {
        // implicit multiplication: 2π, 3(4+1), 2sin(30)
        const right = this.unary();
        left = guard(left * right);
      } else return left;
    }
  }

  private unary(): number {
    const tk = this.peek();
    if (tk && tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
      this.pos++;
      const v = this.unary();
      return tk.v === '-' ? -v : v;
    }
    return this.power();
  }

  private power(): number {
    const base = this.postfix();
    const tk = this.peek();
    if (tk && tk.t === 'op' && tk.v === '^') {
      this.pos++;
      // right associative; the exponent may carry its own sign: 2^-3
      const exponent = this.unary();
      return guard(power(base, exponent));
    }
    return base;
  }

  private postfix(): number {
    let value = this.primary();
    while (this.peek()?.t === 'pct') {
      this.pos++;
      value = value / 100;
    }
    return value;
  }

  private primary(): number {
    const tk = this.peek();
    if (!tk) throw new CalcError('syntax');
    if (tk.t === 'num') {
      this.pos++;
      return tk.v;
    }
    if (tk.t === 'const') {
      this.pos++;
      return tk.v;
    }
    if (tk.t === 'lp') {
      this.pos++;
      const v = this.expression();
      if (this.peek()?.t !== 'rp') throw new CalcError('syntax');
      this.pos++;
      return v;
    }
    if (tk.t === 'fn') {
      this.pos++;
      if (this.peek()?.t !== 'lp') throw new CalcError('syntax');
      this.pos++;
      const arg = this.expression();
      if (this.peek()?.t !== 'rp') throw new CalcError('syntax');
      this.pos++;
      return guard(applyFunction(tk.v, arg, this.mode));
    }
    throw new CalcError('syntax');
  }
}

/** Evaluate an expression string; throws CalcError for every invalid case. */
export function evaluate(expression: string, mode: AngleMode = 'deg'): number {
  return new Parser(tokenise(expression), mode).parse();
}

/**
 * Close any parentheses the learner left open ("sin(30" -> "sin(30)") so the
 * "=" key behaves like a real calculator. Extra ")" is left to fail as a syntax error.
 */
export function autoClose(expression: string): string {
  let open = 0;
  for (const ch of expression) {
    if (ch === '(') open++;
    else if (ch === ')') open--;
  }
  return open > 0 ? expression + ')'.repeat(open) : expression;
}
