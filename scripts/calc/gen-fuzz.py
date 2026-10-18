#!/usr/bin/env python3
"""Randomised reference cases for the calculator fuzz tests.

  python3 scripts/calc/gen-fuzz.py [N] [SEED] [OUT_DIR]

Scientific: random expression trees are rendered twice - once in the app's key
syntax (× ÷ − √ with MINIMAL parentheses, so the parser's precedence is really
tested) and once as a fully parenthesised Python expression evaluated by Python's
own arithmetic. Anything Python rejects (divide by zero, domain, overflow) must be
an error in the app too.

Financial: TVM truth comes from replaying the account period by period with
50-digit Decimal arithmetic (a different method from the app's closed form);
NPV is evaluated in Decimal; IRR roots are found by an independent dense
bisection scan in Decimal.
"""
import json, math, os, random, sys
from decimal import Decimal, getcontext

getcontext().prec = 60
N = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 20261018
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), '..', '..', 'tests', 'calc', 'fixtures')
rnd = random.Random(SEED)
os.makedirs(OUT, exist_ok=True)

class CalcErr(Exception): pass
class Chaotic(Exception): pass  # trig of an astronomically large angle: last-ulp pow differences make it meaningless

# ---------------- scientific ----------------
PREC = {'+': 1, '-': 1, '*': 2, '/': 2, 'neg': 3, '^': 4, 'leaf': 9, 'fn': 9}

def rand_leaf():
    r = rnd.random()
    if r < 0.45: v = rnd.randint(0, 20)
    elif r < 0.8: v = round(rnd.uniform(0, 100), rnd.choice([1, 2, 3]))
    elif r < 0.9: v = round(rnd.uniform(0, 5000), 2)
    else: v = rnd.choice([0, 1, 2, 10, 45, 90, 180, 30, 60, 0.5, 0.1, 0.2])
    s = f"{v:.6f}".rstrip('0').rstrip('.') if isinstance(v, float) else str(v)
    return ('num', float(s), s)

def build(depth):
    if depth == 0 or rnd.random() < 0.18:
        r = rnd.random()
        if r < 0.1: return ('pi',)
        if r < 0.15: return ('e',)
        if r < 0.22:
            l = rand_leaf(); return ('pct', l)
        return rand_leaf()
    r = rnd.random()
    if r < 0.55:
        return ('bin', rnd.choice(['+', '-', '*', '/', '^']) if rnd.random() > 0.15 else rnd.choice(['*', '/', '+', '-']), build(depth - 1), build(depth - 1))
    if r < 0.68: return ('neg', build(depth - 1))
    return ('fn', rnd.choice(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'exp']), build(depth - 1))

def prec(n):
    if n[0] == 'bin': return PREC[n[1]]
    if n[0] == 'neg': return PREC['neg']
    return PREC['leaf']

def render_app(n, mode):
    k = n[0]
    if k == 'num': return n[2]
    if k == 'pi': return 'π'
    if k == 'e': return 'e'
    if k == 'pct': return render_app(n[1], mode) + '%'
    if k == 'fn':
        name = 'sqrt' if n[1] == 'sqrt' else n[1]
        return ('√' if name == 'sqrt' else name) + '(' + render_app(n[2], mode) + ')'
    if k == 'neg':
        inner = render_app(n[1], mode)
        if prec(n[1]) < PREC['neg']: inner = f'({inner})'
        return '−' + inner
    op, a, b = n[1], n[2], n[3]
    sa, sb = render_app(a, mode), render_app(b, mode)
    p = PREC[op]
    # left operand: needs parens if lower precedence; '^' is right-assoc so an equal-precedence left operand needs them too;
    # a unary minus on the left of '^' must be bracketed too: (-2)^2 is not -2^2
    if prec(a) < p or (op == '^' and prec(a) <= p) or (op == '^' and a[0] == 'neg'): sa = f'({sa})'
    # right operand: left-assoc ops need parens at equal precedence; '^' right-assoc does not
    if op == '^':
        if prec(b) < PREC['neg']: sb = f'({sb})'
        elif b[0] == 'neg': pass
    else:
        if prec(b) < p or prec(b) == p and op in '-/': sb = f'({sb})'
        elif prec(b) < PREC['neg'] : sb = f'({sb})'
    sym = {'+': '+', '-': '−', '*': '×', '/': '÷', '^': '^'}[op]
    return sa + sym + sb

def ev(n, mode):
    k = n[0]
    if k == 'num': return n[1]
    if k == 'pi': return math.pi
    if k == 'e': return math.e
    if k == 'pct': return ev(n[1], mode) / 100
    if k == 'neg': return -ev(n[1], mode)
    if k == 'fn':
        x = ev(n[2], mode); f = n[1]
        if f in ('sin', 'cos', 'tan'):
            if abs(x) > 1e6: raise Chaotic()  # ill-conditioned: a 1-ulp difference in the input changes the answer
            if mode == 'deg':
                a = x % 360
                if a >= 360: a = 0.0
                if a % 90 == 0:
                    if f == 'tan':
                        if a % 180 == 90: raise CalcErr()
                        return 0.0
                    return {'sin': [0, 1, 0, -1], 'cos': [1, 0, -1, 0]}[f][int(a // 90)]
                x = math.radians(a)  # angle reduced exactly first (fmod), like the app
            else:
                if f == 'tan' and abs(math.cos(x)) < 1e-15: raise CalcErr()
            r = getattr(math, f)(x)
            return 0.0 if (mode == 'rad' and abs(r) < 1e-15) else r
        if f in ('asin', 'acos'):
            if x < -1 or x > 1: raise CalcErr()
            r = getattr(math, f)(x); return math.degrees(r) if mode == 'deg' else r
        if f == 'atan':
            r = math.atan(x); return math.degrees(r) if mode == 'deg' else r
        if f == 'ln':
            if x <= 0: raise CalcErr()
            return math.log(x)
        if f == 'log':
            if x <= 0: raise CalcErr()
            return math.log10(x)
        if f == 'sqrt':
            if x < 0: raise CalcErr()
            return math.sqrt(x)
        if f == 'exp':
            try: return math.exp(x)
            except OverflowError: raise CalcErr()
    a, b = ev(n[2], mode), ev(n[3], mode)
    op = n[1]
    if op == '+': r = a + b
    elif op == '-': r = a - b
    elif op == '*': r = a * b
    elif op == '/':
        if b == 0: raise CalcErr()
        r = a / b
    else:
        if a == 0 and b <= 0: raise CalcErr()
        try: r = a ** b
        except (OverflowError, ZeroDivisionError): raise CalcErr()
        if isinstance(r, complex): raise CalcErr()
    if r != r or r in (math.inf, -math.inf): raise CalcErr()
    return r

sci = []
for _ in range(N):
    tree = build(rnd.choice([1, 2, 2, 3, 3, 4]))
    mode = rnd.choice(['deg', 'rad'])
    text = render_app(tree, mode)
    try:
        v = ev(tree, mode)
        if v != v or v in (math.inf, -math.inf): raise CalcErr()
        sci.append({'expr': text, 'mode': mode, 'expected': v})
    except CalcErr:
        sci.append({'expr': text, 'mode': mode, 'error': True})
    except Chaotic:
        continue
    except (ValueError, OverflowError, ZeroDivisionError):
        sci.append({'expr': text, 'mode': mode, 'error': True})

# ---------------- financial ----------------
D = Decimal
def dec(x): return D(repr(x))

def fv_truth(n, iy, pv, pmt, ppy, begin):
    i = dec(iy) / 100 / ppy
    bal = dec(pv)
    for _ in range(n):
        bal = (bal + dec(pmt)) * (1 + i) if begin else bal * (1 + i) + dec(pmt)
    return -bal

tvm = []
FIN_N = int(os.environ.get('FIN_N', max(200, N // 10)))
for _ in range(FIN_N):
    n = rnd.randint(1, 360)
    iy = round(rnd.uniform(0.5, 40), rnd.choice([1, 2, 3]))
    ppy = rnd.choice([12, 1, 2, 4, 12, 12])
    pv = round(rnd.choice([-1, 1]) * rnd.uniform(100, 2_000_000), 2)
    pmt = round(rnd.choice([-1, 1, -1]) * rnd.uniform(0, 20000), 2) if rnd.random() < 0.85 else 0
    begin = rnd.random() < 0.3
    fv = fv_truth(n, iy, pv, pmt, ppy, begin)
    tvm.append({'N': n, 'IY': iy, 'PV': pv, 'PMT': pmt, 'FV': float(fv), 'FVs': str(fv), 'ppy': ppy, 'begin': begin})

def npv_dec(rate, flows):
    r = dec(rate) / 100
    return sum(dec(f) / (1 + r) ** j for j, f in enumerate(flows))

def irr_roots(flows):
    """Independent: scan NPV on a dense grid in Decimal, bisect each sign change."""
    f = lambda r: sum(dec(x) / (1 + r) ** j for j, x in enumerate(flows))
    grid = [D('-0.99') + D('0.005') * k for k in range(0, 200)] + [D('0.001') * (D('1.01') ** k) for k in range(0, 1500)]
    grid = sorted(set(grid))
    roots = []
    for a, b in zip(grid, grid[1:]):
        fa, fb = f(a), f(b)
        if fa == 0: roots.append(a)
        elif fa * fb < 0:
            lo, hi = a, b
            for _ in range(80):
                mid = (lo + hi) / 2
                if f(lo) * f(mid) <= 0: hi = mid
                else: lo = mid
            roots.append((lo + hi) / 2)
    return [float(r * 100) for r in roots]

cash = []
for _ in range(FIN_N):
    k = rnd.randint(2, 8)
    flows = [round(-rnd.uniform(500, 100000), 2)] + [round(rnd.uniform(-20000, 60000), 2) for _ in range(k - 1)]
    rate = round(rnd.uniform(0, 30), 2)
    cash.append({'flows': flows, 'rate': rate, 'npv': float(npv_dec(rate, flows)), 'irrRoots': irr_roots(flows)})

json.dump({'seed': SEED, 'cases': sci}, open(os.path.join(OUT, 'fuzz-scientific.json'), 'w'))
json.dump({'seed': SEED, 'tvm': tvm, 'cash': cash}, open(os.path.join(OUT, 'fuzz-financial.json'), 'w'))
errs = sum(1 for c in sci if c.get('error'))
print(f'seed {SEED}: {len(sci)} scientific cases ({errs} expected errors), {len(tvm)} TVM, {len(cash)} cash-flow')
