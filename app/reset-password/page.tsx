'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthError } from '@/lib/i18n/authErrors';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/components/AuthCard';
import TextField from '@/components/TextField';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth.reset');
  const authError = useAuthError();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user);
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(authError(error.message));
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (checkingSession) {
    return <LoadingSpinner />;
  }

  if (!hasSession) {
    return (
      <AuthCard title={t('expiredTitle')} subtitle={t('expiredSubtitle')}>
        <Link href="/forgot-password" className="block text-teal text-sm font-medium">
          {t('requestNew')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="password"
          label={t('newPassword')}
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          {t('submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
