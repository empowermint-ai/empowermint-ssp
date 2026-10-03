'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useIntlTag } from '@/lib/i18n/intl';
import { useSubjectLabel } from '@/lib/i18n/useSubjectLabel';
import type { PlanPdfExam, PlanPdfSession } from '@/lib/buildPlanPdf';

export default function SharePlanButton({
  studentName,
  dateLabel,
  sessions,
  exams,
  iconOnly = false,
}: {
  studentName: string;
  dateLabel: string;
  sessions: PlanPdfSession[];
  exams: PlanPdfExam[];
  iconOnly?: boolean;
}) {
  const t = useTranslations('share');
  const intlTag = useIntlTag();
  const subjectLabel = useSubjectLabel();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setError(null);

    try {
      const { buildPlanPdf } = await import('@/lib/buildPlanPdf');
      const firstName = studentName.split(' ')[0];
      const blob = await buildPlanPdf({
        dateLabel,
        sessions: sessions.map((s) => ({ ...s, subject_name: subjectLabel(s.subject_name) })),
        exams: exams.map((e) => ({ ...e, subjectName: subjectLabel(e.subjectName) })),
        intlTag,
        labels: {
          title: t('pdf.title'),
          forName: t('pdf.forName', { name: studentName }),
          empty: t('pdf.empty'),
          done: t('pdf.done'),
          pending: t('pdf.pending'),
          upcoming: t('pdf.upcoming'),
          when: (days: number) => t('pdf.when', { days }),
          eyebrow: t('pdf.eyebrow'),
          headline: t('pdf.headline', { name: firstName }),
          cta: t('pdf.cta'),
          scan: t('pdf.scan'),
          micro: t('pdf.micro'),
        },
      });
      const fileName = `${studentName}-study-plan.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('shareTitle', { name: studentName }),
          text: t('shareText', { name: studentName, date: dateLabel }),
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
      setError(t('error'));
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        aria-label={sharing ? t('preparingAria') : t('shareAria')}
        className={
          iconOnly
            ? 'flex items-center justify-center text-teal disabled:opacity-60'
            : 'flex items-center gap-[6px] font-body text-[12.5px] font-medium text-teal disabled:opacity-60'
        }
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
        {!iconOnly && (sharing ? t('preparing') : t('share'))}
      </button>
      {error && <p className="font-body text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
