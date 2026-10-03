'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthError } from '@/lib/i18n/authErrors';
import { supabase } from '@/lib/supabaseClient';
import TextField from '@/components/TextField';
import Button from '@/components/Button';

export default function ChangePasswordForm() {
  const t = useTranslations('auth.changePassword');
  const authError = useAuthError();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(authError(error.message));
      return;
    }

    setPassword('');
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        id="newPassword"
        label={t('newPassword')}
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-teal">{t('success')}</p>}
      <Button type="submit" loading={loading}>
        {t('update')}
      </Button>
    </form>
  );
}
