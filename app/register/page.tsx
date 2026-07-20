'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { normalizeMobileNumber } from '@/lib/normalizeMobileNumber';
import { isValidMobileNumber } from '@/lib/validateMobileNumber';
import LoadingSpinner from '@/components/LoadingSpinner';
import NavArrows from '@/components/NavArrows';
import PhoneNumberInput from '@/components/PhoneNumberInput';
import PasswordInput from '@/components/PasswordInput';

interface FieldErrors {
  username?: string;
  mobileNumber?: string;
  password?: string;
}

export default function RegisterStep1Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [takenError, setTakenError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTakenError(false);

    const errors: FieldErrors = {};

    if (!username.trim()) {
      errors.username = 'Please enter a username.';
    }

    if (!mobileNumber.trim()) {
      errors.mobileNumber = 'Please enter your mobile number.';
    } else if (!isValidMobileNumber(mobileNumber)) {
      errors.mobileNumber = 'Enter a valid mobile number for the selected country.';
    }

    if (!password) {
      errors.password = 'Please enter a password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);

    const normalizedMobile = normalizeMobileNumber(mobileNumber);

    const resolveRes = await fetch('/api/resolve-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number: normalizedMobile }),
    });

    setLoading(false);

    if (resolveRes.ok) {
      setTakenError(true);
      return;
    }

    sessionStorage.setItem(
      'registerStep1',
      JSON.stringify({ username, mobileNumber: normalizedMobile, password })
    );

    router.push('/register/step2');
  }

  if (checkingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <main
      className="min-h-dvh bg-bg flex flex-col px-[38px] pt-10"
      style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mb-4">
        <NavArrows />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase tracking-[1.5px] text-teal">
        STEP 1 OF 2
      </p>

      <h1 className="font-heading font-bold text-[26px] tracking-[-0.066em] text-text-primary mt-3">
        Let&apos;s set you up.
      </h1>

      <p className="font-body text-[14px] text-text-body mt-2">
        This is yours. Just the basics to get started.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col flex-1 space-y-4">
        <div>
          <input
            id="username"
            type="text"
            autoComplete="name"
            placeholder="e.g. thabo_m"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:border-teal"
          />
          {fieldErrors.username && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.username}</p>
          )}
        </div>

        <div>
          <PhoneNumberInput id="mobileNumber" onChange={setMobileNumber} />
          {fieldErrors.mobileNumber && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.mobileNumber}</p>
          )}
          {takenError && (
            <p className="text-red-600 text-xs mt-1">
              This number is already registered.{' '}
              <Link href="/login" className="underline font-medium">
                Log in instead
              </Link>
            </p>
          )}
        </div>

        <div>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:border-teal"
          />
          {fieldErrors.password && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Continue'}
        </button>
      </form>

      <p className="font-body text-[10px] text-text-muted text-center mt-6">
        Your mobile number is how you&apos;ll log in from now on.
      </p>
    </main>
  );
}
