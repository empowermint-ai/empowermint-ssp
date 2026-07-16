import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalizes a mobile number to E.164 format (e.g. +27831234567).
 * Expects an already country-coded number (as produced by PhoneNumberInput),
 * but falls back to the raw trimmed input if it can't be parsed.
 */
export function normalizeMobileNumber(input: string): string {
  const phone = parsePhoneNumberFromString(input.startsWith('+') ? input : `+${input}`);
  if (phone) {
    return phone.number;
  }
  return input.trim();
}
