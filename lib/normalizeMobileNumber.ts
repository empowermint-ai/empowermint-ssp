/**
 * Normalizes a South African mobile number to E.164 format (+27...).
 * Accepts local (0xx...), international with or without +, and strips
 * spaces/dashes, so "079 529 4902", "0795294902", "27795294902", and
 * "+27795294902" all resolve to the same stored/lookup value.
 */
export function normalizeMobileNumber(input: string): string {
  const cleaned = input.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return `+27${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('27')) {
    return `+${cleaned}`;
  }
  return `+27${cleaned}`;
}
