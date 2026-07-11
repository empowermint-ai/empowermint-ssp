'use client';

import { useState } from 'react';

export default function ParentNotifyForm({
  initialEmail,
  initialConfirmed,
}: {
  initialEmail: string | null;
  initialConfirmed: boolean;
}) {
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
      setError(body?.error ?? 'Something went wrong. Try again.');
      return;
    }

    setSavedEmail(email);
    setConfirmed(false);
    setSuccess(true);
  }

  return (
    <div>
      <h2 className="font-heading text-lg text-navy dark:text-text-primary mb-1">
        Keep your parent in the loop
      </h2>
      <p className="text-text-body text-sm mb-4">
        Add their email and we&apos;ll send a short weekly update on how studying&apos;s
        going — so you don&apos;t have to keep explaining yourself every night at dinner.
      </p>

      {savedEmail && (
        <p className="text-sm mb-4">
          <span className="text-text-body">Current contact: </span>
          <span className="text-text-primary font-medium">{savedEmail}</span>
          {' — '}
          {confirmed ? (
            <span className="text-teal font-medium">confirmed</span>
          ) : (
            <span className="text-orange font-medium">waiting on confirmation</span>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="parent@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:border-teal"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-teal">
            Sent! They&apos;ll get an email to confirm before anything goes out.
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] disabled:opacity-60"
        >
          {loading ? 'Please wait…' : savedEmail ? 'Update email' : 'Add my parent'}
        </button>
      </form>
    </div>
  );
}
