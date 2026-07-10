/**
 * Validates South African mobile number formats: 10 digits starting
 * 06/07/08, or +27 followed by 9 digits (also starting 6/7/8).
 */
export function isValidSAMobile(input: string): boolean {
  const cleaned = input.trim().replace(/[^\d+]/g, '');
  return /^0[678]\d{8}$/.test(cleaned) || /^\+27[678]\d{8}$/.test(cleaned);
}
