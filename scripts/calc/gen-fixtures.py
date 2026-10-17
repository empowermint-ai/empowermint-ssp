#!/usr/bin/env python3
"""Generates the reference answers the calculator tests are checked against.

Scientific expressions are evaluated by Python's own arithmetic (independent of
the app's parser); trig is evaluated with math.sin/cos/tan on radians. The TVM
reference does NOT use the closed-form formula the app uses: it replays the loan
period by period (balance recurrence), so it is a genuinely separate method.
Run:  python3 scripts/calc/gen-fixtures.py
"""
import json, math, os

out = os.path.join(os.path.dirname(__file__), '..', '..', 'tests', 'calc', 'fixtures')

# (expression as typed on the calculator, python equivalent)
exprs = [
    ("2+3×4", "2+3*4"),
    ("(2+3)×4", "(2+3)*4"),
    ("10−2−3", "10-2-3"),
    ("100÷4÷5", "100/4/5"),
    ("2^3^2", "2**3**2"),
    ("−2^2", "-(2**2)"),
    ("2^−3", "2**-3"),
    ("8÷2×(2+2)", "8/2*(2+2)"),
    ("3+4×2÷(1−5)^2", "3+4*2/(1-5)**2"),
    ("((1+2)×(3+4))÷7", "((1+2)*(3+4))/7"),
    ("1.5×4+0.25", "1.5*4+0.25"),
    ("7−(2−(3−4))", "7-(2-(3-4))"),
    ("2×3^2", "2*3**2"),
    ("100−10×(2+3)^2÷5", "100-10*(2+3)**2/5"),
    ("50%×200", "(50/100)*200"),
]
prec = [{"expr": a, "expected": eval(b)} for a, b in exprs]

trig = []
for deg in [0, 30, 45, 60, 90, 120, 135, 150, 180, 270, 360]:
    r = math.radians(deg)
    trig.append({"deg": deg, "sin": math.sin(r), "cos": math.cos(r),
                 "tan": None if deg % 180 == 90 else math.tan(r)})

def fv_by_recurrence(n, iy, pv, pmt, ppy, begin):
    """Replay the account period by period (independent of the closed form).
    bal is PV rolled forward with each payment; the calculator equation is
    bal + FV = 0, so FV = -bal."""
    i = iy / 100 / ppy
    bal = pv
    for _ in range(int(n)):
        if begin:
            bal = (bal + pmt) * (1 + i)
        else:
            bal = bal * (1 + i) + pmt
    return -bal

tvm = []
for n, iy, pv, pmt, ppy, begin in [
    (10, 5, -10000, 0, 1, False),
    (60, 12, 100000, None, 12, False),
    (360, 6, 300000, None, 12, False),
    (5, 8, 0, -1000, 1, False),
    (5, 8, 0, -1000, 1, True),
    (24, 11.5, 0, -850, 12, False),
    (36, 9, -25000, -400, 12, False),
    (20, 7.25, 15000, 600, 4, False),
]:
    if pmt is None:
        # payment that brings the balance to exactly 0 (FV = 0): use bisection on the recurrence
        lo, hi = -1e7, 1e7
        for _ in range(200):
            mid = (lo + hi) / 2
            if fv_by_recurrence(n, iy, pv, mid, ppy, begin) < 0: hi = mid   # bal > 0 -> pay more negative
            else: lo = mid
        pmt = (lo + hi) / 2
    fv = fv_by_recurrence(n, iy, pv, pmt, ppy, begin)
    tvm.append({"N": n, "IY": iy, "PV": pv, "PMT": pmt, "FV": fv, "ppy": ppy, "begin": begin})

def npv(r, flows):
    return sum(f / (1 + r / 100) ** j for j, f in enumerate(flows))

npv_cases = [
    {"rate": 10, "flows": [-1000, 500, 400, 300, 100], "expected": npv(10, [-1000, 500, 400, 300, 100])},
    {"rate": 8, "flows": [-5000, 1500, 1500, 1500, 1500], "expected": npv(8, [-5000, 1500, 1500, 1500, 1500])},
    {"rate": 12, "flows": [-250000, 80000, 90000, 100000, 110000], "expected": npv(12, [-250000, 80000, 90000, 100000, 110000])},
]

json.dump({"precedence": prec, "trig": trig}, open(os.path.join(out, 'scientific.json'), 'w'), indent=2)
json.dump({"tvm": tvm, "npv": npv_cases}, open(os.path.join(out, 'financial.json'), 'w'), indent=2)
print("fixtures written:", len(prec), "expressions,", len(tvm), "TVM scenarios,", len(npv_cases), "NPV cases")
