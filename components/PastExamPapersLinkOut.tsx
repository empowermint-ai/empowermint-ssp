'use client';

import NavArrows from '@/components/NavArrows';
import BottomNav from '@/components/BottomNav';
import { logActivity } from '@/lib/logActivity';
import { EXAM_BOARDS } from '@/lib/examBoards';
import { NAV_HEIGHT } from '@/lib/layout';

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 6h9v9M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PastExamPapersLinkOut({
  learnerId,
  grade,
}: {
  learnerId: string;
  grade: string | null;
}) {
  return (
    <main
      className="min-h-dvh bg-bg flex flex-col px-[22px] pt-[38px]"
      style={{ paddingBottom: `calc(${NAV_HEIGHT}px + 18px + env(safe-area-inset-bottom))` }}
    >
      <NavArrows showForward={false} />

      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-4">
        Past Exam Papers
      </h1>
      <p className="font-body text-[13px] text-text-muted mt-2">
        Pick your board to go straight to the official papers and marking guidelines.
      </p>

      <div className="mt-6">
        {EXAM_BOARDS.map((board) => (
          <a
            key={board.id}
            href={board.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logActivity(learnerId, 'past_papers_link_opened', { grade, board: board.id })}
            className="neu-raised w-full flex items-center justify-between gap-3 rounded-neu-sm border-l-[4px] border-orange px-[14px] py-[13px] mb-[10px] text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-heading font-bold text-[14px] text-text-primary">
                {board.label}
              </span>
              <span className="block font-body text-[11.5px] text-text-muted mt-[2px]">{board.helper}</span>
            </span>
            <span className="text-text-muted flex-shrink-0">
              <ExternalLinkIcon />
            </span>
          </a>
        ))}
      </div>

      <p className="font-body text-[10.5px] text-text-muted text-center mt-4">
        Memos are a marking guideline, not a definitive answer key — used to guide, not to override, your
        own working.
      </p>

      <BottomNav userId={learnerId} />
    </main>
  );
}
