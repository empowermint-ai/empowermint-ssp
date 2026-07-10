'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { normalizeMobileNumber } from '@/lib/normalizeMobileNumber';
import AuthCard from '@/components/AuthCard';
import TextField from '@/components/TextField';
import Button from '@/components/Button';

export default function ForgotPasswordPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
      const body = await resolveRes.json().catch(() => null);
      setError(body?.error ?? 'No account found with that mobile number');
      return;
    }

    const { email } = await resolveRes.json();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title="Check your email" subtitle="We've sent a password reset link.">
        <p className="text-text-body text-sm">
          Click the link in the email to choose a new password.
        </p>
        <Link href="/login" className="block mt-6 text-teal text-sm font-medium">
          Back to log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="We'll send a reset link to the email on file for your account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="mobileNumber"
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          required
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="text-center text-sm text-text-muted mt-5">
        <Link href="/login" className="text-teal font-medium">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
