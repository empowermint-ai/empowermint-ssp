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

export default function TodayPlanClient({
  userId,
  todayStr,
  initialSessions,
  initialAvailable,
}: {
  userId: string;
  todayStr: string;
  initialSessions: Session[];
  initialAvailable: AvailableSubject[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [available, setAvailable] = useState(initialAvailable);
  const [adding, setAdding] = useState(false);

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

  return (
    <>
      <div className="flex-1 overflow-y-auto min-h-0 mt-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => router.push(`/timer/${session.subject_id}`)}
            className={`bg-card rounded-[12px] px-[14px] py-[13px] mb-[10px] cursor-pointer border-l-[5px] ${
              session.confidence_score !== null && session.confidence_score <= 2
                ? 'border-orange'
                : 'border-teal'
            }`}
          >
            <div className="flex items-center justify-between">
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
              Revision · 25 min focus block
            </p>
          </div>
        ))}
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
