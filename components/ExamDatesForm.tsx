'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { priorityScore } from '@/lib/priorityScore';

interface Subject {
  id: string;
  subject_name: string;
  confidence_score: number | null;
  exam_date: string | null;
}

function formatDateChip(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ExamDatesForm({
  initialSubjects,
  userId,
}: {
  initialSubjects: Subject[];
  userId: string;
}) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allDated = subjects.every((s) => s.exam_date !== null);
  const remainingCount = subjects.filter((s) => s.exam_date === null).length;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  function handleDateChange(id: string, value: string) {
    if (!value || value < minDateStr) return;
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, exam_date: value } : s)));
  }

  async function handleGenerate() {
    if (!allDated) return;
    setSaving(true);
    setError(null);

    const updateResults = await Promise.all(
      subjects.map((s) =>
        supabase.from('subjects').update({ exam_date: s.exam_date }).eq('id', s.id)
      )
    );

    if (updateResults.some((r) => r.error)) {
      setSaving(false);
      setError('Could not save exam dates. Try again.');
      return;
    }

    const topThree = [...subjects]
      .sort(
        (a, b) =>
          priorityScore(b.confidence_score, b.exam_date, todayStr) -
          priorityScore(a.confidence_score, a.exam_date, todayStr)
      )
      .slice(0, 3);

    await supabase.from('daily_plans').delete().eq('user_id', userId).eq('plan_date', todayStr);

    const planRows = topThree.map((s, index) => ({
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="relative flex items-center justify-between bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] mb-[10px] cursor-pointer"
          >
            <span className="font-body font-bold text-[13.5px] text-text-primary">
              {subject.subject_name}
            </span>
            <span
              className={`font-body text-xs rounded-[8px] px-[10px] py-[5px] border-[1.3px] ${
                subject.exam_date
                  ? 'text-navy dark:text-text-primary border-navy dark:border-text-primary'
                  : 'text-text-muted border-line'
              }`}
            >
              {subject.exam_date ? formatDateChip(subject.exam_date) : 'Set date ▾'}
            </span>
            <input
              type="date"
              min={minDateStr}
              value={subject.exam_date ?? ''}
              onChange={(e) => handleDateChange(subject.id, e.target.value)}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {error && <p className="text-red-600 text-xs text-center mb-2">{error}</p>}

      {!allDated && !error && (
        <p className="font-body text-xs text-text-muted text-center mb-2">
          {remainingCount} more subject{remainingCount === 1 ? '' : 's'} need{remainingCount === 1 ? 's' : ''} a date.
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
  );
}
