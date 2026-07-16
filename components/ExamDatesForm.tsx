'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { priorityScore } from '@/lib/priorityScore';
import { nextExamDate } from '@/lib/nextExamDate';
import { MAX_DAILY_SESSIONS } from '@/lib/dailyPlanLimits';

interface ExamDate {
  id: string;
  exam_date: string;
}

interface Subject {
  id: string;
  subject_name: string;
  confidence_score: number | null;
  exam_dates: ExamDate[];
}

function formatDateChip(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function sortDates(dates: ExamDate[]): ExamDate[] {
  return [...dates].sort((a, b) => (a.exam_date < b.exam_date ? -1 : 1));
}

export default function ExamDatesForm({
  initialSubjects,
  userId,
}: {
  initialSubjects: Subject[];
  userId: string;
}) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(
    initialSubjects.map((s) => ({ ...s, exam_dates: sortDates(s.exam_dates) }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const allDated = subjects.every((s) => s.exam_dates.length > 0);
  const missingSubjects = subjects.filter((s) => s.exam_dates.length === 0);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  async function handleAddDate(subjectId: string, value: string) {
    if (!value || value < minDateStr) return;

    const subject = subjects.find((s) => s.id === subjectId);
    if (subject?.exam_dates.some((d) => d.exam_date === value)) return;

    setAddingId(subjectId);
    setError(null);

    const { data, error } = await supabase
      .from('exam_dates')
      .insert({ subject_id: subjectId, exam_date: value })
      .select('id, exam_date')
      .single();

    setAddingId(null);

    if (error || !data) {
      setError('Could not add that date. Try again.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, exam_dates: sortDates([...s.exam_dates, data]) } : s
      )
    );
  }

  async function handleRemoveDate(subjectId: string, dateId: string) {
    const { error } = await supabase.from('exam_dates').delete().eq('id', dateId);

    if (error) {
      setError('Could not remove that date. Try again.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, exam_dates: s.exam_dates.filter((d) => d.id !== dateId) }
          : s
      )
    );
  }

  async function handleGenerate() {
    if (!allDated) return;
    setSaving(true);
    setError(null);

    const ranked = [...subjects]
      .sort((a, b) => {
        const aNext = nextExamDate(a.exam_dates, todayStr);
        const bNext = nextExamDate(b.exam_dates, todayStr);
        return (
          priorityScore(b.confidence_score, bNext, todayStr) -
          priorityScore(a.confidence_score, aNext, todayStr)
        );
      })
      .slice(0, MAX_DAILY_SESSIONS);

    await supabase.from('daily_plans').delete().eq('user_id', userId).eq('plan_date', todayStr);

    const planRows = ranked.map((s, index) => ({
      user_id: userId,
      subject_id: s.id,
      plan_date: todayStr,
      session_order: index + 1,
    }));

    const { error: insertError } = await supabase.from('daily_plans').insert(planRows);

    setSaving(false);

    if (insertError) {
      setError('Could not generate your plan. Try again.');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col flex-1">
      <div>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] mb-[10px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-body font-bold text-[13.5px] text-text-primary">
                {subject.subject_name}
              </span>
              <div className="relative">
                <span className="font-body text-xs rounded-[8px] px-[10px] py-[5px] border-[1.3px] text-orange border-orange whitespace-nowrap">
                  {addingId === subject.id ? 'Adding…' : '+ Add date'}
                </span>
                <input
                  type="date"
                  min={minDateStr}
                  value=""
                  onChange={(e) => handleAddDate(subject.id, e.target.value)}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
              </div>
            </div>

            {subject.exam_dates.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mt-[10px]">
                {subject.exam_dates.map((d) => (
                  <span
                    key={d.id}
                    className="flex items-center gap-1 font-body text-xs rounded-[8px] pl-[10px] pr-[6px] py-[5px] border-[1.3px] text-navy dark:text-text-primary border-navy dark:border-text-primary"
                  >
                    {formatDateChip(d.exam_date)}
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(subject.id, d.id)}
                      aria-label={`Remove ${formatDateChip(d.exam_date)} for ${subject.subject_name}`}
                      className="text-text-muted leading-none"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        {error && <p className="text-red-600 text-xs text-center mb-2">{error}</p>}

        {!allDated && !error && (
          <p className="font-body text-xs text-text-muted text-center mb-2">
            Still need{missingSubjects.length === 1 ? 's' : ''} a date:{' '}
            {missingSubjects.map((s) => s.subject_name).join(', ')}.
          </p>
        )}

        <button
          type="button"
          disabled={!allDated || saving}
          onClick={handleGenerate}
          className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] disabled:opacity-40"
        >
          {saving ? 'Generating…' : 'Generate my plan'}
        </button>

        <p className="font-body text-[10px] text-text-muted text-center mt-3">
          Your schedule builds instantly and updates every day.
        </p>
      </div>
    </div>
  );
}
