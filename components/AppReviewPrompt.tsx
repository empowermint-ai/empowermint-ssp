'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill={filled ? '#F37021' : 'none'}
      stroke={filled ? '#F37021' : '#8A8579'}
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27l-5.8 3.1 1.11-6.47-4.7-4.58 6.49-.94L12 2.5z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AppReviewPrompt({ userId }: { userId: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  if (dismissed || submitted) return null;

  async function handleDismiss() {
    setDismissed(true);
    await supabase
      .from('users')
      .update({ review_prompt_dismissed_at: new Date().toISOString() })
      .eq('id', userId);
  }

  async function handleSubmit() {
    if (submittingRef.current || rating === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('app_reviews')
      .insert({ user_id: userId, rating, comment: comment.trim() || null });

    submittingRef.current = false;
    setSubmitting(false);

    if (insertError) {
      setError('Could not save that. Try again.');
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] mt-5">
      <p className="font-heading font-bold text-[13.5px] text-text-primary">
        How is the SSP working for you so far?
      </p>
      <p className="font-body text-[11px] text-text-muted mt-[2px] mb-[10px]">
        Your feedback helps us make it better.
      </p>

      <div className="flex gap-[6px] mb-[10px]">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <StarIcon filled={n <= rating} />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you would like to share? (optional)"
            rows={3}
            className="w-full rounded-[8px] border-[1.3px] border-card-border bg-bg px-[10px] py-[7px] font-body text-[12px] text-text-primary outline-none focus:border-teal resize-none mb-[10px]"
          />
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="font-body text-xs rounded-[8px] px-[14px] py-[8px] bg-teal text-white font-bold disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        className="block font-body text-[11px] text-text-muted underline mt-[10px]"
      >
        Not now
      </button>
    </div>
  );
}
