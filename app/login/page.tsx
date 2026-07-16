'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { normalizeMobileNumber } from '@/lib/normalizeMobileNumber';
import LoadingSpinner from '@/components/LoadingSpinner';
import NavArrows from '@/components/NavArrows';
import PhoneNumberInput from '@/components/PhoneNumberInput';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      setError('Username or password incorrect. Try again.');
      return;
    }

    const { email } = await resolveRes.json();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError('Username or password incorrect. Try again.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (checkingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col px-[38px]">
      <div className="pt-6">
        <NavArrows />
      </div>

      <div className="flex-1" />

      <h1 className="font-heading font-bold text-[26px] tracking-[-0.066em] leading-[1.1] text-center text-text-primary">
        Welcome
        <br />
        back.
      </h1>

      <p className="font-body text-[14px] text-text-body text-center mt-2">
        Good to see you again.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="mobileNumber"
            className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
          >
            Mobile number
          </label>
          <PhoneNumberInput id="mobileNumber" onChange={setMobileNumber} required />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:border-teal"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Log in'}
        </button>

        {error && (
          <p className="font-body text-[11px] text-red-600 text-center">{error}</p>
        )}
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link href="/forgot-password" className="block text-teal text-sm font-medium">
          Forgot password?
        </Link>
        <Link
          href="/register"
          className="block text-text-muted text-sm underline underline-offset-2"
        >
          New here? Start my planner
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
