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

let cached: CountryOption[] | null = null;

export function getCountryOptions(): CountryOption[] {
  if (cached) return cached;

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

  const options = getCountries().map((code) => ({
    code,
    name: regionNames.of(code) ?? code,
    callingCode: `+${getCountryCallingCode(code)}`,
    flag: flagEmoji(code),
  }));

  options.sort((a, b) => a.name.localeCompare(b.name));

  const zaIndex = options.findIndex((o) => o.code === 'ZA');
  if (zaIndex > -1) {
    const [za] = options.splice(zaIndex, 1);
    options.unshift(za);
  }

  cached = options;
  return options;
}
