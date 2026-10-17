// Display formatting. This is the ONLY place a working value is rounded, and the
// result is a string: the stored number is never changed by showing it.

/**
 * Up to 12 significant digits, so float dust (0.1 + 0.2 = 0.30000000000000004)
 * shows as 0.3. Very large / small values switch to scientific notation.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e12 || abs < 1e-9) {
    const [mantissa, exp] = value.toExponential(9).split('e');
    const m = parseFloat(mantissa).toString();
    return `${m}e${exp.startsWith('-') ? '-' : '+'}${exp.replace(/^[+-]/, '')}`;
  }
  const rounded = parseFloat(value.toPrecision(12));
  return rounded.toString();
}

/** Group thousands with commas: 18432.5 -> "18,432.5" (digits stay Western everywhere). */
export function groupThousands(plain: string): string {
  const neg = plain.startsWith('-');
  const body = neg ? plain.slice(1) : plain;
  const [int, frac] = body.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${grouped}${frac !== undefined ? `.${frac}` : ''}`;
}

/** Rand amount for the financial calculator: "R 18,432.50" / "-R 850.00". */
export function formatRand(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  const fixed = Math.abs(value).toFixed(2);
  const text = `R ${groupThousands(fixed)}`;
  // never show "-R 0.00" for a value that rounds to zero
  return value < 0 && Number(fixed) !== 0 ? `-${text}` : text;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return `${groupThousands(value.toFixed(2))}%`;
}

/** Counts of periods (N) show without trailing zeros, up to 4 decimals. */
export function formatPeriods(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return groupThousands(parseFloat(value.toFixed(4)).toString());
}
