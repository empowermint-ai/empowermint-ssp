'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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

function daysWeight(examDate: string, targetDate: string): number {
  const exam = new Date(`${examDate}T00:00:00Z`).getTime();
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const days = Math.round((exam - target) / 86_400_000);
  if (days > 14) return 1;
  if (days >= 8) return 2;
  if (days >= 4) return 3;
  return 4;
}

function priorityScore(subject: Subject, targetDate: string): number {
  const confidence = subject.confidence_score ?? 3;
  return (6 - confidence) * daysWeight(subject.exam_date!, targetDate);
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
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allDated = subjects.every((s) => s.exam_date !== null);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  function openPicker(id: string) {
    const el = inputRefs.current[id] as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (el?.showPicker) {
      el.showPicker();
    } else {
      el?.focus();
    }
  }

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
      .sort((a, b) => priorityScore(b, todayStr) - priorityScore(a, todayStr))
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
            onClick={() => openPicker(subject.id)}
            className="flex items-center justify-between bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] mb-[10px] cursor-pointer"
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
              ref={(el) => {
                inputRefs.current[subject.id] = el;
              }}
              type="date"
              min={minDateStr}
              value={subject.exam_date ?? ''}
              onChange={(e) => handleDateChange(subject.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {error && <p className="text-red-600 text-xs text-center mb-2">{error}</p>}

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
