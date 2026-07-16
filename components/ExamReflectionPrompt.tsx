'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Reflection {
  examDateId: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  confidenceScore: number;
}

const CHOICES: { label: string; delta: number }[] = [
  { label: 'Tougher than expected', delta: -1 },
  { label: 'About what I expected', delta: 0 },
  { label: 'Better than expected', delta: 1 },
];

function formatExamDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export default function ExamReflectionPrompt({
  initialReflections,
}: {
  initialReflections: Reflection[];
}) {
  const [reflections, setReflections] = useState(initialReflections);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef<string | null>(null);
  const confidenceRef = useRef<Map<string, number>>(
    (() => {
      const map = new Map<string, number>();
      for (const r of initialReflections) {
        if (!map.has(r.subjectId)) map.set(r.subjectId, r.confidenceScore);
      }
      return map;
    })()
  );

  async function handleChoice(reflection: Reflection, delta: number) {
    if (submittingRef.current) return;
    submittingRef.current = reflection.examDateId;
    setSubmittingId(reflection.examDateId);
    setError(null);

    const { error: dateError } = await supabase
      .from('exam_dates')
      .update({ reflected_at: new Date().toISOString() })
      .eq('id', reflection.examDateId);

    if (dateError) {
      submittingRef.current = null;
      setSubmittingId(null);
      setError('Could not save that. Try again.');
      return;
    }

    if (delta !== 0) {
      const currentScore = confidenceRef.current.get(reflection.subjectId) ?? reflection.confidenceScore;
      const nextScore = Math.min(5, Math.max(1, currentScore + delta));
      await supabase.from('subjects').update({ confidence_score: nextScore }).eq('id', reflection.subjectId);
      confidenceRef.current.set(reflection.subjectId, nextScore);
    }

    submittingRef.current = null;
    setSubmittingId(null);
    setReflections((prev) => prev.filter((r) => r.examDateId !== reflection.examDateId));
  }

  if (reflections.length === 0) return null;

  return (
    <div className="mt-5">
      {error && <p className="text-red-600 text-xs text-center mb-2">{error}</p>}
      {reflections.map((r) => (
        <div
          key={r.examDateId}
          className="bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] mb-[10px]"
        >
          <p className="font-heading font-bold text-[13.5px] text-text-primary">
            How did your {r.subjectName} exam go?
          </p>
          <p className="font-body text-[11px] text-text-muted mt-[2px] mb-[10px]">
            {formatExamDate(r.examDate)} — this helps us plan your next sessions.
          </p>
          <div className="flex flex-wrap gap-[8px]">
            {CHOICES.map((choice) => (
              <button
                key={choice.label}
                type="button"
                disabled={submittingId === r.examDateId}
                onClick={() => handleChoice(r, choice.delta)}
                className="font-body text-xs rounded-[8px] px-[10px] py-[7px] border-[1.3px] text-teal border-teal disabled:opacity-50"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
