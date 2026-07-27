'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { recalculateTodayPlan } from '@/lib/recalculateTodayPlan';

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

function sortDates(dates: ExamDate[]): ExamDate[] {
  return [...dates].sort((a, b) => (a.exam_date < b.exam_date ? -1 : 1));
}

function formatDateChip(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ManageSubjectsForm({
  userId,
  initialSubjects,
}: {
  userId: string;
  initialSubjects: Subject[];
}) {
  const [tab, setTab] = useState<'ranking' | 'dates'>('ranking');
  const [subjects, setSubjects] = useState(
    initialSubjects.map((s) => ({ ...s, exam_dates: sortDates(s.exam_dates) }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  async function handleRankChange(subjectId: string, score: number) {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, confidence_score: score } : s))
    );
    setSavingId(subjectId);
    setError(null);

    const { error: updateError } = await supabase
      .from('subjects')
      .update({ confidence_score: score })
      .eq('id', subjectId);

    if (updateError) {
      setSavingId(null);
      setError('Could not save that. Try again.');
      return;
    }

    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
    setSavingId(null);
  }

  async function handleAddDate(subjectId: string, value: string) {
    if (!value || value < minDateStr) return;
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject?.exam_dates.some((d) => d.exam_date === value)) return;

    setAddingId(subjectId);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('exam_dates')
      .insert({ subject_id: subjectId, exam_date: value })
      .select('id, exam_date')
      .single();

    if (insertError || !data) {
      setAddingId(null);
      setError('Could not add that date. Try again.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, exam_dates: sortDates([...s.exam_dates, data]) } : s
      )
    );

    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
    setAddingId(null);
  }

  async function handleRemoveDate(subjectId: string, dateId: string) {
    setError(null);
    const { error: deleteError } = await supabase.from('exam_dates').delete().eq('id', dateId);

    if (deleteError) {
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

    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
  }

  return (
    <div className="flex flex-col flex-1 mt-6">
      <div className="neu-pressed flex rounded-neu-sm p-[4px] mb-5">
        <button
          type="button"
          onClick={() => setTab('ranking')}
          className={`flex-1 font-heading font-bold text-[12.5px] rounded-neu-sm py-[9px] transition-all ${
            tab === 'ranking' ? 'neu-raised-accent text-white' : 'text-text-muted'
          }`}
        >
          Your ranking
        </button>
        <button
          type="button"
          onClick={() => setTab('dates')}
          className={`flex-1 font-heading font-bold text-[12.5px] rounded-neu-sm py-[9px] transition-all ${
            tab === 'dates' ? 'neu-raised-accent text-white' : 'text-text-muted'
          }`}
        >
          Exam dates
        </button>
      </div>

      {error && <p className="text-red-600 text-xs text-center mb-3">{error}</p>}

      {tab === 'ranking' && (
        <div>
          <p className="font-body text-[10px] text-text-muted mb-[14px]">
            1 = weakest &nbsp;·&nbsp; 5 = strongest
          </p>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="neu-raised flex items-center justify-between rounded-neu-sm px-[14px] py-[11px] mb-[10px]"
            >
              <span className="font-body font-bold text-[13.5px] text-text-primary">
                {subject.subject_name}
              </span>
              <div className="flex gap-[5px]">
                {[1, 2, 3, 4, 5].map((score) => {
                  const selected = subject.confidence_score === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      disabled={savingId === subject.id}
                      onClick={() => handleRankChange(subject.id, score)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-heading font-bold text-[10px] disabled:opacity-50 ${
                        selected ? 'neu-pressed-accent-sm text-white' : 'neu-raised text-text-primary'
                      }`}
                      aria-label={`${subject.subject_name}: confidence ${score}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dates' && (
        <div>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="neu-raised rounded-neu-sm px-[14px] py-[11px] mb-[10px]"
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
                    className="accent-orange absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
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
      )}

      {recalculating && (
        <p className="font-body text-[11px] text-text-muted text-center mt-2">
          Updating your plan…
        </p>
      )}
    </div>
  );
}
