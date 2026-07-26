'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/components/AuthCard';
import Button from '@/components/Button';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hashTokens, setHashTokens] = useState<{ access_token: string; refresh_token: string } | null>(
    null
  );

  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  // Supabase issues recovery/confirmation links as a hash fragment
  // (#access_token=...&refresh_token=...), not a query param - hash fragments
  // never reach the server, so this can only be read here, client-side.
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes('error=')) {
      setError('This link has expired or already been used.');
      setReady(true);
      return;
    }

    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        setHashTokens({ access_token, refresh_token });
      }
    }

    setReady(true);
  }, []);

  async function handleContinue() {
    setLoading(true);
    setError(null);

    const { error: authError } = hashTokens
      ? await supabase.auth.setSession(hashTokens)
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error('Missing token') };

    setLoading(false);

    if (authError) {
      setError('This link has expired or already been used.');
      return;
    }

    router.replace(next);
  }

  if (!ready) {
    return null;
  }

  if (error || (!code && !hashTokens)) {
    return (
      <AuthCard title="Link expired" subtitle="This link is invalid or has already been used.">
        <Link href="/forgot-password" className="block text-teal text-sm font-medium">
          Request a new reset link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Almost there" subtitle="Tap continue to confirm it is really you.">
      <Button onClick={handleContinue} loading={loading}>
        Continue
      </Button>
    </AuthCard>
  );
}
