'use client';

import { useState } from 'react';
import type { PlanPdfExam, PlanPdfSession } from '@/lib/buildPlanPdf';

export default function SharePlanButton({
  studentName,
  dateLabel,
  sessions,
  exams,
}: {
  studentName: string;
  dateLabel: string;
  sessions: PlanPdfSession[];
  exams: PlanPdfExam[];
}) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setError(null);

    try {
      const { buildPlanPdf } = await import('@/lib/buildPlanPdf');
      const blob = await buildPlanPdf({ studentName, dateLabel, sessions, exams });
      const fileName = `${studentName}-study-plan.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${studentName}'s study plan`,
          text: `${studentName}'s study plan for ${dateLabel}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError('Could not create the PDF. Try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="flex items-center gap-[6px] font-body text-[12.5px] font-medium text-teal disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7 1.5V9M7 1.5L4 4.5M7 1.5L10 4.5M2 8V11.5C2 11.7761 2.22386 12 2.5 12H11.5C11.7761 12 12 11.7761 12 11.5V8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {sharing ? 'Preparing…' : 'Share'}
      </button>
      {error && <p className="font-body text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
