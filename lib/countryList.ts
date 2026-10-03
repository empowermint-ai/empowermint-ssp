import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

export interface CountryOption {
  code: string;
  name: string;
  callingCode: string;
  flag: string;
}

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const cache = new Map<string, CountryOption[]>();

// Country names come from Intl in the active language ("Suid-Afrika" in
// Afrikaans); the order is re-sorted per language, with South Africa first.
export function getCountryOptions(locale = 'en'): CountryOption[] {
  const cached = cache.get(locale);
  if (cached) return cached;

  let regionNames: Intl.DisplayNames;
  try {
    regionNames = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  }

  const options = getCountries().map((code) => ({
    code,
    name: regionNames.of(code) ?? code,
    callingCode: `+${getCountryCallingCode(code)}`,
    flag: flagEmoji(code),
  }));

  options.sort((a, b) => a.name.localeCompare(b.name, locale));

  const zaIndex = options.findIndex((o) => o.code === 'ZA');
  if (zaIndex > -1) {
    const [za] = options.splice(zaIndex, 1);
    options.unshift(za);
  }

  cache.set(locale, options);
  return options;
}
