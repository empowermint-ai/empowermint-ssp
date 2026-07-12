'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCodeHandler() {
  const router = useRouter();

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        router.replace('/dashboard');
        router.refresh();
      });
      return;
    }

    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).finally(() => {
          router.replace('/dashboard');
          router.refresh();
        });
      }
    }
  }, [router]);

  return null;
}
