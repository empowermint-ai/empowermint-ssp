'use client';

import { useState } from 'react';

interface ExamEntry {
  subjectName: string;
  daysUntil: number;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
    >
      <path
        d="M3 5L7 9L11 5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function UpcomingExamsPanel({ exams }: { exams: ExamEntry[] }) {
  const [open, setOpen] = useState(false);

  if (exams.length === 0) return null;

  return (
    <div className="bg-navy rounded-[10px] mt-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-[14px] py-[12px]"
      >
        <span className="font-heading font-bold text-[11px] uppercase tracking-[0.6px] text-white">
          Upcoming exam dates
        </span>
        <span className="flex items-center gap-2">
          {!open && (
            <span className="font-body text-[11px] text-white/70">{exams.length}</span>
          )}
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div className="px-[14px] pb-[6px] divide-y divide-white/15">
          {exams.map((e) => (
            <div key={e.subjectName} className="flex items-center justify-between gap-3 py-[8px]">
              <span className="font-body font-bold text-[11.5px] text-white">
                {e.subjectName} exam in
              </span>
              <span className="font-heading font-bold text-[16px] text-white whitespace-nowrap">
                {e.daysUntil} days
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
