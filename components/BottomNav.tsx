'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

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

function CalculatorIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="3" width="14" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="8" y="6" width="8" height="3.4" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const isPlan = pathname === '/dashboard';
  const isCalendar = pathname.startsWith('/calendar');
  const isCalculator = pathname.startsWith('/calculator');
  const isManage = pathname.startsWith('/subjects/manage');

  function tabClass(active: boolean) {
    return `flex flex-col items-center justify-center gap-[3px] flex-1 py-[11px] ${
      active ? 'text-orange-text' : 'text-text-muted'
    }`;
  }

  return (
    <>
      <nav
        className="neu-raised fixed bottom-0 inset-x-0 z-30 flex rounded-t-neu-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t('primary')}
      >
        <Link href="/dashboard" className={tabClass(isPlan)}>
          <HouseIcon />
          <span className="font-heading font-bold text-[10px]">{t('plan')}</span>
        </Link>
        <Link href="/calendar" className={tabClass(isCalendar)}>
          <CalendarIcon />
          <span className="font-heading font-bold text-[10px]">{t('calendar')}</span>
        </Link>
        <Link href="/subjects/manage" className={tabClass(isManage)}>
          <ManageIcon />
          <span className="font-heading font-bold text-[10px]">{t('manage')}</span>
        </Link>
        {/* One entry point: /calculator picks the scientific or financial calculator
            from the learner's stored education level. */}
        <Link href="/calculator" className={tabClass(isCalculator)}>
          <CalculatorIcon />
          <span className="font-heading font-bold text-[10px]">{t('calculator')}</span>
        </Link>
      </nav>

    </>
  );
}
