'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logActivity } from '@/lib/logActivity';

function PaperIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 3.5h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1v-16a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.5 12h5M9.5 15.3h5M9.5 8.7h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7.5a4 4 0 018 0V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 1L7 7L1 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PastExamPapersCard({
  learnerId,
  grade,
}: {
  learnerId: string;
  grade: string | null;
}) {
  const router = useRouter();
  const isGrade12 = grade === 'Grade 12';
  const [toast, setToast] = useState(false);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logActivity(learnerId, 'past_papers_card_viewed', { grade, locked: !isGrade12 });
  }, [learnerId, grade, isGrade12]);

  function handleClick() {
    if (isGrade12) {
      router.push('/past-papers');
      return;
    }
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={`neu-raised w-full flex items-center gap-3 rounded-neu-sm px-[12px] py-[9px] mb-[8px] text-left ${
          isGrade12 ? '' : 'opacity-70'
        }`}
      >
        <span
          className={`flex items-center justify-center w-[36px] h-[36px] rounded-full flex-shrink-0 ${
            isGrade12 ? 'bg-orange text-black' : 'neu-pressed text-text-muted'
          }`}
        >
          <PaperIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-[6px]">
            <span
              className={`font-heading font-bold text-[13.5px] ${
                isGrade12 ? 'text-text-primary' : 'text-text-muted'
              }`}
            >
              Past Exam Papers
            </span>
            {!isGrade12 && (
              <span className="text-text-muted flex-shrink-0">
                <LockIcon />
              </span>
            )}
          </span>
          <span className="block font-body text-[11px] text-text-muted mt-[2px] truncate">
            {isGrade12 ? 'Official NSC & IEB papers and memos.' : 'Unlocks in Grade 12'}
          </span>
        </span>
        {isGrade12 && (
          <span className="text-text-muted flex-shrink-0">
            <ChevronIcon />
          </span>
        )}
      </button>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 neu-raised rounded-neu-sm px-[12px] py-[8px] whitespace-nowrap">
          <span className="font-body text-[11px] text-text-primary">
            This unlocks once you&apos;re in Grade 12.
          </span>
        </div>
      )}
    </div>
  );
}
