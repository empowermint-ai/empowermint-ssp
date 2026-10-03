'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { normalizeMobileNumber } from '@/lib/normalizeMobileNumber';
import LoadingSpinner from '@/components/LoadingSpinner';
import NavArrows from '@/components/NavArrows';
import PhoneNumberInput from '@/components/PhoneNumberInput';
import PasswordInput from '@/components/PasswordInput';
import LanguageGlobeButton from '@/components/i18n/LanguageGlobeButton';
import { syncLanguageAfterLogin } from '@/lib/i18n/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.login');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error'));
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
    setError(null);
    setLoading(true);

    const resolveRes = await fetch('/api/resolve-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number: normalizeMobileNumber(mobileNumber) }),
    });

    if (!resolveRes.ok) {
      setLoading(false);
      setError(t('invalid'));
      return;
    }

    const { email } = await resolveRes.json();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(t('invalid'));
      return;
    }

    // A saved profile language follows the learner to this device (unless they
    // just picked one here, in which case that choice is saved instead).
    await syncLanguageAfterLogin(locale);

    router.push('/dashboard');
    router.refresh();
  }

  if (checkingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col px-[38px]">
      <div className="flex items-center justify-between pt-6">
        <NavArrows />
        <LanguageGlobeButton />
      </div>

      <div className="flex-1" />

      <h1 className="font-heading font-bold text-[26px] tracking-[-0.025em] leading-[1.1] text-center text-text-primary whitespace-pre-line text-balance">
        {t('title')}
      </h1>

      <p className="font-body text-[14px] text-text-body text-center mt-2">
        {t('subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="mobileNumber"
            className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
          >
            {t('mobileLabel')}
          </label>
          <PhoneNumberInput id="mobileNumber" onChange={setMobileNumber} required />
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
            autoComplete="current-password"
            required
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="neu-pressed w-full rounded-neu-md px-4 py-3.5 font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="neu-raised-accent w-full text-black font-heading font-bold text-[14px] rounded-full py-4 transition-all active:scale-[0.97] disabled:opacity-60"
        >
          {loading ? tc('pleaseWait') : t('submit')}
        </button>

        {error && (
          <p className="font-body text-[11px] text-red-600 text-center">{error}</p>
        )}
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link href="/forgot-password" className="block text-teal text-sm font-medium">
          {t('forgot')}
        </Link>
        <Link
          href="/register"
          className="block text-text-muted text-sm underline underline-offset-2"
        >
          {t('newHere')}
        </Link>
      </div>

      <div className="flex-1" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
