'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/components/AuthCard';
import TextField from '@/components/TextField';
import Button from '@/components/Button';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          mobile_number: mobileNumber,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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

  return (
    <AuthCard title="Create your account" subtitle="Start planning smarter with empowermint.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="username"
          label="Student username"
          type="text"
          autoComplete="name"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          id="mobileNumber"
          label="Student mobile number"
          type="tel"
          autoComplete="tel"
          required
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
        />
        <p className="text-xs text-text-muted -mt-2">
          You&apos;ll use this mobile number to log in from now on.
        </p>
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
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="text-center text-sm text-text-muted mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-teal font-medium">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
