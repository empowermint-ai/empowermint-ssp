'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthError } from '@/lib/i18n/authErrors';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/components/AuthCard';
import TextField from '@/components/TextField';
import InstitutionField from '@/components/InstitutionField';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Step1Data {
  username: string;
  mobileNumber: string;
  password: string;
}

export default function RegisterStep2Page() {
  const router = useRouter();
  const t = useTranslations('auth.step2');
  const authError = useAuthError();
  const locale = useLocale();
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [grade, setGrade] = useState('');
  const [institutionType, setInstitutionType] = useState<'school' | 'uni' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard');
        return;
      }

      setCheckingAuth(false);

      const stored = sessionStorage.getItem('registerStep1');
      if (!stored) {
        router.replace('/register');
        return;
      }
      setStep1Data(JSON.parse(stored));
    });
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
      setError(authError(error.message));
      return;
    }

    // Supabase does not return an error for an email that is already
    // registered - to avoid leaking which emails exist, it instead returns a
    // user object with an empty identities array and never actually sends a
    // new confirmation email. Catch that here so nobody is left waiting on
    // an email that will never arrive.
    if (data.user && data.user.identities?.length === 0) {
      setLoading(false);
      setError(t('emailTaken'));
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
          institution: institution.trim(),
          grade,
          student_type: institutionType,
          // Saved best-effort by the route; ignored until the column exists.
          preferred_language: locale,
        }),
      });

      if (!profileRes.ok) {
        setLoading(false);
        const body = await profileRes.json().catch(() => null);
        setError(body?.error ? authError(body.error) : t('numberTaken'));
        return;
      }
    }

    sessionStorage.removeItem('registerStep1');
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title={t('checkTitle')} subtitle={t('checkSubtitle')}>
        <p className="text-text-body text-sm">{t('checkBody')}</p>
        <Link href="/login" className="block mt-6 text-teal text-sm font-medium">
          {t('backToLogin')}
        </Link>
      </AuthCard>
    );
  }

  if (checkingAuth || !step1Data) {
    return <LoadingSpinner />;
  }

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="email"
          label={t('emailLabel')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-text-muted -mt-2">
          {t('emailHelp')}
        </p>
        <InstitutionField
          institution={institution}
          grade={grade}
          onInstitutionChange={setInstitution}
          onGradeChange={setGrade}
          onTypeChange={setInstitutionType}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          {t('submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
