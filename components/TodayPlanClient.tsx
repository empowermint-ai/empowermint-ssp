'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { priorityScore } from '@/lib/priorityScore';
import ProgressStrip from '@/components/ProgressStrip';

interface Session {
  id: string;
  subject_id: string;
  subject_name: string;
  confidence_score: number | null;
  suggested_start_time: string | null;
  completed: boolean;
  session_order: number;
}

interface AvailableSubject {
  id: string;
  subject_name: string;
  confidence_score: number | null;
  exam_date: string | null;
}

interface NeedsNewDateSubject {
  id: string;
  subject_name: string;
}

export default function TodayPlanClient({
  userId,
  todayStr,
  initialSessions,
  initialAvailable,
  initialNeedsNewDate,
}: {
  userId: string;
  todayStr: string;
  initialSessions: Session[];
  initialAvailable: AvailableSubject[];
  initialNeedsNewDate: NeedsNewDateSubject[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [available, setAvailable] = useState(initialAvailable);
  const [needsNewDate, setNeedsNewDate] = useState(initialNeedsNewDate);
  const [adding, setAdding] = useState(false);
  const [addingDateId, setAddingDateId] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  async function handleAddSession() {
    if (available.length === 0 || adding) return;
    setAdding(true);

    const best = [...available].sort(
      (a, b) =>
        priorityScore(b.confidence_score, b.exam_date, todayStr) -
        priorityScore(a.confidence_score, a.exam_date, todayStr)
    )[0];

    const nextOrder =
      sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_order)) + 1 : 1;

    const { data, error } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        subject_id: best.id,
        plan_date: todayStr,
        session_order: nextOrder,
      })
      .select('id, session_order, completed, suggested_start_time')
      .single();

    setAdding(false);

    if (error || !data) return;

    setSessions((prev) => [
      ...prev,
      {
        id: data.id,
        subject_id: best.id,
        subject_name: best.subject_name,
        confidence_score: best.confidence_score,
        suggested_start_time: data.suggested_start_time,
        completed: data.completed,
        session_order: data.session_order,
      },
    ]);
    setAvailable((prev) => prev.filter((s) => s.id !== best.id));
  }

  async function handleAddDate(subjectId: string, value: string) {
    if (!value || value < minDateStr) return;
    setAddingDateId(subjectId);

    const { error } = await supabase
      .from('exam_dates')
      .insert({ subject_id: subjectId, exam_date: value });

    setAddingDateId(null);

    if (error) return;

    setNeedsNewDate((prev) => prev.filter((s) => s.id !== subjectId));
    router.refresh();
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto min-h-0 mt-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => router.push(`/timer/${session.subject_id}`)}
            className={`flex items-center justify-between gap-3 bg-card rounded-[12px] px-[14px] py-[13px] mb-[10px] cursor-pointer border-l-[5px] ${
              session.confidence_score !== null && session.confidence_score <= 2
                ? 'border-orange'
                : 'border-teal'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-[13.5px] text-text-primary">
                  {session.subject_name}
                </span>
                {session.suggested_start_time && (
                  <span className="font-body text-[11px] text-text-muted">
                    {session.suggested_start_time}
                  </span>
                )}
              </div>
              <p className="font-body text-[12px] text-text-body mt-1">
                Study session · 25 min focus block
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-orange text-white text-[11px] flex-shrink-0"
            >
              ▶
            </span>
          </div>
        ))}

        {needsNewDate.length > 0 && (
          <div className="mt-2">
            <p className="font-heading font-bold text-[10.5px] uppercase text-text-muted mb-2">
              Exam done — add your next date
            </p>
            {needsNewDate.map((subject) => (
              <div
                key={subject.id}
                className="relative flex items-center justify-between bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] mb-[10px]"
              >
                <span className="font-body font-bold text-[13.5px] text-text-primary">
                  {subject.subject_name}
                </span>
                <span className="font-body text-xs rounded-[8px] px-[10px] py-[5px] border-[1.3px] text-orange border-orange whitespace-nowrap">
                  {addingDateId === subject.id ? 'Adding…' : '+ Add date'}
                </span>
                <input
                  type="date"
                  min={minDateStr}
                  value=""
                  onChange={(e) => handleAddDate(subject.id, e.target.value)}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {available.length > 0 && (
        <button
          type="button"
          onClick={handleAddSession}
          disabled={adding}
          className="font-body text-sm text-teal font-medium text-center mb-4 disabled:opacity-60"
        >
          {adding ? 'Adding…' : '+ Add another session'}
        </button>
      )}

      <ProgressStrip completedFlags={sessions.map((s) => s.completed)} />
    </>
  );
}
