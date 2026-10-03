'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatExamDuration } from '@/lib/i18n/duration';
import { useSubjectLabel } from '@/lib/i18n/useSubjectLabel';
import NavArrows from '@/components/NavArrows';
import { EXAM_TIMER_DURATIONS } from '@/lib/examTimerDurations';

export default function ExamTimerSetupClient({
  subjects,
}: {
  subjects: { id: string; subject_name: string }[];
}) {
  const router = useRouter();
  const t = useTranslations('examTimer');
  const subjectLabel = useSubjectLabel();
  const [subjectId, setSubjectId] = useState('');
  const [minutes, setMinutes] = useState('');

  const canProceed = subjectId !== '' && minutes !== '';

  function handleGo() {
    if (!canProceed) return;
    router.push(`/exam-timer/session?subjectId=${subjectId}&minutes=${minutes}`);
  }

  return (
    <main
      className="min-h-dvh bg-bg flex flex-col items-center px-[22px] pt-[38px]"
      style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <div className="w-full">
        <NavArrows showForward={false} />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase tracking-wide text-teal text-center mt-4">
        {t('setup.eyebrow')}
      </p>

      <p className="font-body text-[13px] text-text-body text-center mt-3">
        {t('setup.intro')}
      </p>

      <div className="w-full mt-6">
        <label
          htmlFor="examTimerSubject"
          className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
        >
          {t('setup.subjectLabel')}
        </label>
        <select
          id="examTimerSubject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="neu-pressed w-full rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
        >
          <option value="" disabled>
            {t('setup.select')}
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {subjectLabel(s.subject_name)}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full mt-4">
        <label
          htmlFor="examTimerDuration"
          className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
        >
          {t('setup.timeLabel')}
        </label>
        <select
          id="examTimerDuration"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="neu-pressed w-full rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
        >
          <option value="" disabled>
            {t('setup.select')}
          </option>
          {EXAM_TIMER_DURATIONS.map((d) => (
            <option key={d.minutes} value={d.minutes}>
              {formatExamDuration(t, d.minutes)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        disabled={!canProceed}
        onClick={handleGo}
        className="neu-raised-accent w-full font-heading font-bold text-[14px] text-black rounded-full py-[15px] transition-all active:scale-[0.97] disabled:opacity-40"
      >
        {t('setup.go')}
      </button>
    </main>
  );
}
