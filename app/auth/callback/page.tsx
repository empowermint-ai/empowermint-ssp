'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/components/AuthCard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  // Confirms the link automatically, with no extra tap required - click the
  // link and you are in, same as before. Supabase issues these links as a
  // hash fragment (#access_token=...&refresh_token=...) rather than a query
  // param, so this can only be read here, client-side.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      const hash = window.location.hash;

      if (hash.includes('error=')) {
        setError('This link has expired or already been used.');
        return;
      }

      let authError: Error | null = null;

      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const result = await supabase.auth.setSession({ access_token, refresh_token });
          authError = result.error;
        } else {
          authError = new Error('Missing token');
        }
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        authError = result.error;
      } else {
        authError = new Error('Missing token');
      }

      if (authError) {
        // The Supabase client can also establish a session from this same
        // URL entirely on its own, the instant it initializes - if our own
        // attempt above lost that race and failed, check for that before
        // concluding the link is actually dead.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = next;
          return;
        }
        setError('This link has expired or already been used.');
        return;
      }

      window.location.href = next;
    }

    run();
  }, [code, next]);

  if (error) {
    return (
      <AuthCard title="Link expired" subtitle="This link is invalid or has already been used.">
        <Link href="/forgot-password" className="block text-teal text-sm font-medium">
          Request a new reset link
        </Link>
      </AuthCard>
    );
  }

  return <LoadingSpinner />;
}
