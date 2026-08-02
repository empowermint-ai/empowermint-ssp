'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ExamsSheet from '@/components/ExamsSheet';

function HouseIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 11.5L12 4l8 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v8.5a1 1 0 001 1h10a1 1 0 001-1V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ManageIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 3.5h6l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1v-16a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 15.3h6M9 8.7h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ExamsIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 3.5h9l3 3v13.5a1 1 0 01-1 1H6a1 1 0 01-1-1V4.5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.3 10.9l1.2 1.2 2.3-2.5M8.3 15.9l1.2 1.2 2.3-2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.6 10.4h2.9M13.6 15.4h2.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function BottomNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [examsOpen, setExamsOpen] = useState(false);

  const isPlan = pathname === '/dashboard' && !examsOpen;
  const isCalendar = pathname.startsWith('/calendar') && !examsOpen;
  const isManage = pathname.startsWith('/subjects/manage') && !examsOpen;

  function tabClass(active: boolean) {
    return `flex flex-col items-center justify-center gap-[3px] flex-1 py-[11px] ${
      active ? 'text-orange' : 'text-text-muted'
    }`;
  }

  return (
    <>
      <nav
        className="neu-raised fixed bottom-0 inset-x-0 z-30 flex rounded-t-neu-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <Link href="/dashboard" className={tabClass(isPlan)}>
          <HouseIcon />
          <span className="font-heading font-bold text-[10px]">Plan</span>
        </Link>
        <Link href="/calendar" className={tabClass(isCalendar)}>
          <CalendarIcon />
          <span className="font-heading font-bold text-[10px]">Calendar</span>
        </Link>
        <Link href="/subjects/manage" className={tabClass(isManage)}>
          <ManageIcon />
          <span className="font-heading font-bold text-[10px]">Manage</span>
        </Link>
        <button type="button" onClick={() => setExamsOpen(true)} className={tabClass(examsOpen)}>
          <ExamsIcon />
          <span className="font-heading font-bold text-[10px]">Exams</span>
        </button>
      </nav>

      {examsOpen && <ExamsSheet userId={userId} onClose={() => setExamsOpen(false)} />}
    </>
  );
}
