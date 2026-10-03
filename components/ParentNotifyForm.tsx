'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthError } from '@/lib/i18n/authErrors';

export default function ParentNotifyForm({
  initialEmail,
  initialConfirmed,
}: {
  initialEmail: string | null;
  initialConfirmed: boolean;
}) {
  const t = useTranslations('parentNotify');
  const tc = useTranslations('common');
  const authError = useAuthError();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch('/api/parent-notify/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ? authError(body.error) : t('error'));
      return;
    }

    setSavedEmail(email);
    setConfirmed(false);
    setSuccess(true);
  }

  return (
    <div>
      <h2 className="font-heading text-lg text-text-primary mb-1">
        {t('title')}
      </h2>
      <p className="text-text-body text-sm mb-4">
        {t('intro')}
      </p>

      {savedEmail && (
        <p className="text-sm mb-4">
          <span className="text-text-body">{t('currentContact')} </span>
          <span className="text-text-primary font-medium">{savedEmail}</span>
          {' — '}
          {confirmed ? (
            <span className="text-teal font-medium">{t('confirmed')}</span>
          ) : (
            <span className="text-orange-text font-medium">{t('waiting')}</span>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder={t('placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="neu-pressed w-full rounded-neu-md px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-teal">
            {t('sent')}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="neu-raised-accent w-full text-black font-heading font-bold text-[13.5px] rounded-full py-[14px] disabled:opacity-60"
        >
          {loading ? tc('pleaseWait') : savedEmail ? t('update') : t('add')}
        </button>
      </form>
    </div>
  );
}
