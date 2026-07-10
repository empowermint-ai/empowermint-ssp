'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/components/AuthCard';
import TextField from '@/components/TextField';
import Button from '@/components/Button';

interface Step1Data {
  username: string;
  mobileNumber: string;
  password: string;
}

export default function RegisterStep2Page() {
  const router = useRouter();
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('registerStep1');
    if (!stored) {
      router.replace('/register');
      return;
    }
    setStep1Data(JSON.parse(stored));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step1Data) return;

    setError(null);
    setLoading(true);

    const { username, mobileNumber, password } = step1Data;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, mobile_number: mobileNumber },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const profileRes = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          username,
          mobile_number: mobileNumber,
          parent_email: email,
        }),
      });

      if (!profileRes.ok) {
        setLoading(false);
        const body = await profileRes.json().catch(() => null);
        setError(body?.error ?? 'That mobile number is already registered.');
        return;
      }
    }

    sessionStorage.removeItem('registerStep1');
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title="Check your email" subtitle="We've sent you a confirmation link.">
        <p className="text-text-body text-sm">
          Click the link in the email to confirm your account. After that, log in using
          your mobile number and password.
        </p>
        <Link href="/login" className="block mt-6 text-teal text-sm font-medium">
          Back to log in
        </Link>
      </AuthCard>
    );
  }

  if (!step1Data) {
    return null;
  }

  return (
    <AuthCard title="Almost done" subtitle="We just need an email to confirm your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="email"
          label="Parent&apos;s email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-text-muted -mt-2">
          Used once to confirm this account. You won&apos;t need it to log in.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
