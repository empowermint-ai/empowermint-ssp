import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import NavArrows from '@/components/NavArrows';

export default async function ParentUnsubscribedPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ok = searchParams.status === 'ok';
  const t = await getTranslations('auth.parentUnsubscribed');

  return (
    <main className="relative min-h-screen bg-bg flex flex-col items-center justify-center px-10 text-center">
      <div className="absolute top-6 left-6">
        <NavArrows />
      </div>

      <div className="w-24">
        <Image
          src="/brand/logo-em-power-black.png"
          alt="empower"
          width={84}
          height={60}
          className="block dark:hidden w-full h-auto"
        />
        <Image
          src="/brand/logo-em-power-white.png"
          alt="empower"
          width={84}
          height={60}
          className="hidden dark:block w-full h-auto"
        />
      </div>

      <h1 className="font-heading font-bold text-[22px] tracking-[-0.025em] text-text-primary mt-8">
        {ok ? t('okTitle') : t('expiredTitle')}
      </h1>

      <p className="font-body text-[14px] text-text-body mt-2 max-w-xs">
        {ok ? t('okBody') : t('expiredBody')}
      </p>
    </main>
  );
}
