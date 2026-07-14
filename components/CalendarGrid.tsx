'use client';

import { useMemo, useState } from 'react';

interface ExamEntry {
  date: string;
  subject_name: string;
}

interface SessionEntry {
  date: string;
  subject_name: string;
  completed: boolean;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarGrid({
  exams,
  sessions,
}: {
  exams: ExamEntry[];
  sessions: SessionEntry[];
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(`${todayStr}T00:00:00`);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const byDate = useMemo(() => {
    const map = new Map<string, { exams: string[]; sessions: SessionEntry[] }>();
    for (const e of exams) {
      const entry = map.get(e.date) ?? { exams: [], sessions: [] };
      entry.exams.push(e.subject_name);
      map.set(e.date, entry);
    }
    for (const s of sessions) {
      const entry = map.get(s.date) ?? { exams: [], sessions: [] };
      entry.sessions.push(s);
      map.set(s.date, entry);
    }
    return map;
  }, [exams, sessions]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const selected = byDate.get(selectedDate);
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Previous month"
          className="text-text-primary text-[19px] leading-none p-2"
        >
          ‹
        </button>
        <p className="font-heading font-bold text-[15px] text-text-primary">{monthLabel}</p>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Next month"
          className="text-text-primary text-[19px] leading-none p-2"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mt-3 text-center">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="font-body text-[10px] text-text-muted uppercase">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 mt-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;

          const day = Number(dateStr.slice(-2));
          const entry = byDate.get(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isExam = Boolean(entry?.exams.length);
          const hasMissed = entry?.sessions.some((s) => !s.completed && s.date < todayStr);
          const hasStudy = entry?.sessions.length;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className="flex flex-col items-center justify-center py-[4px]"
            >
              <span
                className={`flex items-center justify-center w-[26px] h-[26px] rounded-full font-body text-[12px] ${
                  isSelected
                    ? 'bg-navy text-white'
                    : isExam
                      ? 'bg-orange text-white'
                      : isToday
                        ? 'border-[1.5px] border-purple text-text-primary'
                        : 'text-text-primary'
                }`}
              >
                {day}
              </span>
              <span className="flex gap-[3px] mt-[3px] h-[5px]">
                {hasMissed ? (
                  <span className="w-[5px] h-[5px] rounded-full bg-red-600" />
                ) : hasStudy ? (
                  <span className="w-[5px] h-[5px] rounded-full bg-teal" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <span className="flex items-center gap-[6px] font-body text-[11px] text-text-muted">
          <span className="w-[7px] h-[7px] rounded-full bg-orange" /> Exam day
        </span>
        <span className="flex items-center gap-[6px] font-body text-[11px] text-text-muted">
          <span className="w-[7px] h-[7px] rounded-full border-[1.5px] border-purple" /> Today
        </span>
        <span className="flex items-center gap-[6px] font-body text-[11px] text-text-muted">
          <span className="w-[7px] h-[7px] rounded-full bg-teal" /> Study session
        </span>
        <span className="flex items-center gap-[6px] font-body text-[11px] text-text-muted">
          <span className="w-[7px] h-[7px] rounded-full bg-red-600" /> Missed
        </span>
      </div>

      <div className="mt-5 bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[14px] flex-1">
        <p className="font-heading font-bold text-[13px] text-text-primary mb-2">{selectedLabel}</p>

        {!selected || (selected.exams.length === 0 && selected.sessions.length === 0) ? (
          <p className="font-body text-[12px] text-text-muted">Nothing on file for this day.</p>
        ) : (
          <div className="space-y-2">
            {selected.exams.map((name, i) => (
              <div key={`exam-${i}`} className="flex items-center gap-2">
                <span className="w-[8px] h-[8px] rounded-full bg-orange flex-shrink-0" />
                <span className="font-body text-[13px] text-text-primary">{name} exam</span>
              </div>
            ))}
            {selected.sessions.map((s, i) => {
              const missed = !s.completed && s.date < todayStr;
              return (
                <div key={`session-${i}`} className="flex items-center gap-2">
                  <span
                    className={`w-[8px] h-[8px] rounded-full flex-shrink-0 ${
                      missed ? 'bg-red-600' : 'bg-teal'
                    }`}
                  />
                  <span className="font-body text-[13px] text-text-primary">
                    {s.subject_name} study session
                    {s.completed ? ' · done' : missed ? ' · missed' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
