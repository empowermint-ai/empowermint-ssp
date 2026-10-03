'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthError } from '@/lib/i18n/authErrors';
import { supabase } from '@/lib/supabaseClient';
import { normalizeMobileNumber } from '@/lib/normalizeMobileNumber';
import AuthCard from '@/components/AuthCard';
import PhoneNumberInput from '@/components/PhoneNumberInput';
import Button from '@/components/Button';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');
  const authError = useAuthError();
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
      setError(t('noAccount'));
      return;
    }

    const { email } = await resolveRes.json();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(authError(error.message));
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title={t('checkTitle')} subtitle={t('checkSubtitle')}>
        <p className="text-text-body text-sm">{t('checkBody')}</p>
        <Link href="/login" className="block mt-6 text-teal text-sm font-medium">
          {t('back')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PhoneNumberInput id="mobileNumber" label={t('mobileLabel')} onChange={setMobileNumber} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          {t('submit')}
        </Button>
      </form>
      <p className="text-center text-sm text-text-muted mt-5">
        <Link href="/login" className="text-teal font-medium">
          {t('back')}
        </Link>
      </p>
    </AuthCard>
  );
}
