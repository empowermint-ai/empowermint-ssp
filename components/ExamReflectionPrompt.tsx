'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useIntlTag } from '@/lib/i18n/intl';
import { useSubjectLabel } from '@/lib/i18n/useSubjectLabel';
import { supabase } from '@/lib/supabaseClient';

interface Reflection {
  examDateId: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  confidenceScore: number;
}

const CHOICES: { key: string; delta: number }[] = [
  { key: 'tougher', delta: -1 },
  { key: 'expected', delta: 0 },
  { key: 'better', delta: 1 },
];

function formatExamDate(dateStr: string, intlTag: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(intlTag, {
    day: 'numeric',
    month: 'short',
  });
}

export default function ExamReflectionPrompt({
  initialReflections,
}: {
  initialReflections: Reflection[];
}) {
  const t = useTranslations('reflection');
  const intlTag = useIntlTag();
  const subjectLabel = useSubjectLabel();
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
      setError(t('saveError'));
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
          className="neu-raised rounded-neu-sm px-[14px] py-[13px] mb-[10px]"
        >
          <p className="font-heading font-bold text-[13.5px] text-text-primary">
            {t('title', { subject: subjectLabel(r.subjectName) })}
          </p>
          <p className="font-body text-[11px] text-text-muted mt-[2px] mb-[10px]">
            {t('subtitle', { date: formatExamDate(r.examDate, intlTag) })}
          </p>
          <div className="flex flex-wrap gap-[8px]">
            {CHOICES.map((choice) => (
              <button
                key={choice.key}
                type="button"
                disabled={submittingId === r.examDateId}
                onClick={() => handleChoice(r, choice.delta)}
                className="font-body text-xs rounded-[8px] px-[10px] py-[7px] border-[1.3px] text-teal border-teal disabled:opacity-50"
              >
                {t(`choices.${choice.key}`)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
