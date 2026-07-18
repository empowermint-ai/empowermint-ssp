'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProgressStrip from '@/components/ProgressStrip';
import SharePlanButton from '@/components/SharePlanButton';
import type { PlanPdfExam } from '@/lib/buildPlanPdf';

interface Session {
  id: string;
  subject_id: string;
  subject_name: string;
  confidence_score: number | null;
  exam_date: string | null;
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
  studentName,
  dateLabel,
  initialSessions,
  initialAvailable,
  initialNeedsNewDate,
  exams,
}: {
  userId: string;
  todayStr: string;
  studentName: string;
  dateLabel: string;
  initialSessions: Session[];
  initialAvailable: AvailableSubject[];
  initialNeedsNewDate: NeedsNewDateSubject[];
  exams: PlanPdfExam[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [needsNewDate, setNeedsNewDate] = useState(initialNeedsNewDate);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [addingDateId, setAddingDateId] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  async function handleAddSession(subject: AvailableSubject) {
    if (adding) return;
    setAdding(true);

    const nextOrder =
      sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_order)) + 1 : 1;

    const { data, error } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        subject_id: subject.id,
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
        subject_id: subject.id,
        subject_name: subject.subject_name,
        confidence_score: subject.confidence_score,
        exam_date: subject.exam_date,
        suggested_start_time: data.suggested_start_time,
        completed: data.completed,
        session_order: data.session_order,
      },
    ]);
    setPicking(false);
  }

  async function handleRemoveSession(session: Session) {
    const { error } = await supabase.from('daily_plans').delete().eq('id', session.id);
    if (error) return;

    setSessions((prev) => prev.filter((s) => s.id !== session.id));
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
      <SharePlanButton
        studentName={studentName}
        dateLabel={dateLabel}
        sessions={sessions.map((s) => ({ subject_name: s.subject_name, completed: s.completed }))}
        exams={exams}
      />

      <div className="mt-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => router.push(`/timer/${session.id}`)}
            className={`flex items-center justify-between gap-3 bg-card rounded-[12px] px-[14px] py-[13px] mb-[10px] cursor-pointer border-l-[5px] ${
              session.completed ? 'border-teal' : 'border-orange'
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
              className={`flex items-center justify-center w-[34px] h-[34px] rounded-full flex-shrink-0 ${
                session.completed ? 'bg-teal' : 'bg-orange'
              }`}
            >
              {session.completed ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7.5L5.5 10L11 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 1.2L10.5 6L2 10.8V1.2Z" fill="white" />
                </svg>
              )}
            </span>
            {!session.completed && (
              <button
                type="button"
                aria-label={`Remove ${session.subject_name} session`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSession(session);
                }}
                className="flex items-center justify-center w-[22px] h-[22px] flex-shrink-0 text-text-muted"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 1L10 10M10 1L1 10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
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

      {initialAvailable.length > 0 && (
        <>
          {picking ? (
            <div className="flex flex-wrap gap-[8px] mb-4">
              {initialAvailable.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  disabled={adding}
                  onClick={() => handleAddSession(subject)}
                  className="font-body text-xs rounded-[8px] px-[10px] py-[7px] border-[1.3px] text-teal border-teal disabled:opacity-50"
                >
                  {subject.subject_name}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="font-body text-sm text-teal font-medium text-center mb-4"
            >
              + Add another session
            </button>
          )}
        </>
      )}

      <ProgressStrip completedFlags={sessions.map((s) => s.completed)} />
    </>
  );
}
