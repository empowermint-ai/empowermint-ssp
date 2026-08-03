'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { recalculateTodayPlan } from '@/lib/recalculateTodayPlan';
import { nextExamDate } from '@/lib/nextExamDate';
import { NAV_HEIGHT } from '@/lib/layout';

interface ExamDate {
  id: string;
  exam_date: string;
}

interface Subject {
  id: string;
  subject_name: string;
  exam_dates: ExamDate[];
}

function sortDates(dates: ExamDate[]): ExamDate[] {
  return [...dates].sort((a, b) => (a.exam_date < b.exam_date ? -1 : 1));
}

function formatDateChip(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ExamsSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('subjects')
        .select('id, subject_name, exam_dates(id, exam_date)')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('created_at', { ascending: true });

      if (!cancelled && data) {
        setSubjects(data.map((s) => ({ ...s, exam_dates: sortDates(s.exam_dates) })));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 200);
  }

  async function handleAddDate(subjectId: string, value: string) {
    if (!value || !subjects) return;
    if (value < minDateStr) {
      setError('Exam dates must be at least tomorrow - please pick a later date.');
      return;
    }
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
      prev
        ? prev.map((s) =>
            s.id === subjectId ? { ...s, exam_dates: sortDates([...s.exam_dates, data]) } : s
          )
        : prev
    );
    setAddingId(null);
    await recalculateTodayPlan(userId);
  }

  async function handleRemoveDate(subjectId: string, dateId: string) {
    setError(null);
    const { error: deleteError } = await supabase.from('exam_dates').delete().eq('id', dateId);

    if (deleteError) {
      setError('Could not remove that date. Try again.');
      return;
    }

    setSubjects((prev) =>
      prev
        ? prev.map((s) =>
            s.id === subjectId
              ? { ...s, exam_dates: s.exam_dates.filter((d) => d.id !== dateId) }
              : s
          )
        : prev
    );
    await recalculateTodayPlan(userId);
  }

  // Nearest upcoming exam across all subjects gets the orange emphasis badge -
  // accent is reserved for that, not used to color-code subjects generally.
  const daysUntilBySubject = new Map<string, number>();
  if (subjects) {
    for (const s of subjects) {
      const next = nextExamDate(s.exam_dates, todayStr);
      if (next) {
        const days = Math.round(
          (new Date(`${next}T00:00:00Z`).getTime() - new Date(`${todayStr}T00:00:00Z`).getTime()) /
            86_400_000
        );
        daysUntilBySubject.set(s.id, days);
      }
    }
  }
  let soonestSubjectId: string | null = null;
  let soonestDays = Infinity;
  for (const [id, days] of Array.from(daysUntilBySubject.entries())) {
    if (days >= 0 && days < soonestDays) {
      soonestDays = days;
      soonestSubjectId = id;
    }
  }

  function handleHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  }
  function handleHandlePointerUp() {
    if (dragOffset > 90) {
      handleClose();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
  }

  const bottomOffset = `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`;
  const translateY = closing || !entered ? '100%' : `${dragOffset}px`;

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-40 bg-black/40 transition-opacity duration-200"
        style={{ bottom: bottomOffset, opacity: closing || !entered ? 0 : 1 }}
        onClick={handleClose}
      />
      <div
        className="neu-raised fixed inset-x-0 z-50 rounded-t-neu-lg px-[22px] pt-2 max-h-[70vh] overflow-y-auto transition-transform duration-200"
        style={{ bottom: bottomOffset, transform: `translateY(${translateY})` }}
      >
        <div
          className="flex justify-center py-3 cursor-grab touch-none"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
        >
          <span className="w-10 h-[4px] rounded-full bg-line" />
        </div>

        <div className="flex items-center justify-between mb-4 pb-1">
          <h2 className="font-heading font-bold text-[16px] text-text-primary">Exam dates</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-text-muted text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {error && <p className="text-red-600 text-xs text-center mb-3">{error}</p>}

        {subjects === null ? (
          <p className="font-body text-[13px] text-text-muted text-center py-6">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="font-body text-[13px] text-text-muted text-center py-6">No subjects yet.</p>
        ) : (
          <div className="pb-6">
            {subjects.map((subject) => {
              const days = daysUntilBySubject.get(subject.id);
              const isSoonest = subject.id === soonestSubjectId;
              return (
                <div
                  key={subject.id}
                  className="neu-raised rounded-neu-sm px-[14px] py-[11px] mb-[10px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-body font-bold text-[13.5px] text-text-primary truncate">
                        {subject.subject_name}
                      </span>
                      {isSoonest && days !== undefined && (
                        <span className="neu-raised-accent text-white font-heading font-bold text-[9.5px] rounded-full px-[8px] py-[2px] whitespace-nowrap">
                          {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
                        </span>
                      )}
                    </div>
                    <div className="relative flex-shrink-0">
                      <span className="font-body text-xs rounded-[8px] px-[10px] py-[5px] border-[1.3px] text-orange border-orange whitespace-nowrap">
                        {addingId === subject.id ? 'Adding…' : '+ Add date'}
                      </span>
                      <input
                        type="date"
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
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
