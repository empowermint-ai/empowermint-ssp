'use client';

import { useMemo, useState } from 'react';
import { getCountryOptions } from '@/lib/countryList';

export default function PhoneNumberInput({
  id,
  label,
  onChange,
  required,
}: {
  id?: string;
  label?: string;
  onChange: (e164: string) => void;
  required?: boolean;
}) {
  const countries = useMemo(() => getCountryOptions(), []);
  const [countryCode, setCountryCode] = useState('ZA');
  const [nationalNumber, setNationalNumber] = useState('');

  function emit(nextCountryCode: string, nextNationalNumber: string) {
    const country = countries.find((c) => c.code === nextCountryCode);
    if (!country) return;

    const digits = nextNationalNumber.replace(/\D/g, '');
    if (!digits) {
      onChange('');
      return;
    }

    // Strip a leading 0 - that's a local trunk prefix, not part of the number itself.
    const trimmed = digits.replace(/^0+/, '');
    onChange(`${country.callingCode}${trimmed}`);
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCountryCode(e.target.value);
    emit(e.target.value, nationalNumber);
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNationalNumber(e.target.value);
    emit(countryCode, e.target.value);
  }

  return (
    <div className="text-left">
      {label && (
        <label
          htmlFor={id}
          className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={handleCountryChange}
          aria-label="Country"
          className="neu-pressed w-[112px] truncate rounded-neu-md px-2 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.callingCode} {c.name}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="83 123 4567"
          required={required}
          value={nationalNumber}
          onChange={handleNumberChange}
          className="neu-pressed flex-1 min-w-0 rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
        />
      </div>
    </div>
  );
}
