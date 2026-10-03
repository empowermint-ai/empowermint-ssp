'use client';

import { useTranslations } from 'next-intl';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors');
  return (
    <main className="h-screen bg-bg flex flex-col items-center justify-center px-10 text-center">
      <p className="font-body text-[14px] text-text-body">
        {t('generic')}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="neu-raised-accent mt-4 text-black font-heading font-bold text-[13.5px] rounded-full px-6 py-3"
      >
        {t('retry')}
      </button>
    </main>
  );
}
