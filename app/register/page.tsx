'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('auth.register');
  const tc = useTranslations('common');
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
      errors.username = t('usernameRequired');
    }

    if (!mobileNumber.trim()) {
      errors.mobileNumber = t('mobileRequired');
    } else if (!isValidMobileNumber(mobileNumber)) {
      errors.mobileNumber = t('mobileInvalid');
    }

    if (!password) {
      errors.password = t('passwordRequired');
    } else if (password.length < 6) {
      errors.password = t('passwordShort');
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
        {t('step')}
      </p>

      <h1 className="font-heading font-bold text-[26px] tracking-[-0.025em] text-text-primary mt-3">
        {t('title')}
      </h1>

      <p className="font-body text-[14px] text-text-body mt-2">
        {t('intro')}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col flex-1 space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
          >
            {t('usernameLabel')}
          </label>
          <input
            id="username"
            type="text"
            autoComplete="name"
            placeholder={t('usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="neu-pressed w-full rounded-neu-md px-4 py-3.5 font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
          />
          {fieldErrors.username && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.username}</p>
          )}
        </div>

        <div>
          <PhoneNumberInput id="mobileNumber" label={t('mobileLabel')} onChange={setMobileNumber} />
          {fieldErrors.mobileNumber && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.mobileNumber}</p>
          )}
          {takenError && (
            <p className="text-red-600 text-xs mt-1">
              {t('mobileTaken')}{' '}
              <Link href="/login" className="underline font-medium">
                {t('loginInstead')}
              </Link>
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
          >
            {t('passwordLabel')}
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="neu-pressed w-full rounded-neu-md px-4 py-3.5 font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
          />
          {fieldErrors.password && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={loading}
          className="neu-raised-accent w-full text-black font-heading font-bold text-[14px] rounded-full py-4 transition-all active:scale-[0.97] disabled:opacity-60"
        >
          {loading ? tc('pleaseWait') : t('continue')}
        </button>
      </form>

      <p className="font-body text-[10px] text-text-muted text-center mt-6">
        {t('footnote')}
      </p>
    </main>
  );
}
