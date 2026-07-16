import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Validates a mobile number in E.164 format (e.g. +27831234567) against
 * that country's real numbering rules, not just a fixed digit count.
 */
export function isValidMobileNumber(input: string): boolean {
  const phone = parsePhoneNumberFromString(input.startsWith('+') ? input : `+${input}`);
  return !!phone && phone.isValid();
}
