import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-dvh bg-bg flex flex-col items-center px-10 text-center">
      <div className="flex-1" />

      <div className="w-full max-w-sm flex flex-col items-center">
        <div
          className="bg-white dark:bg-transparent rounded-full w-[132px] h-[132px] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.07)] dark:shadow-none"
        >
          <Image
            src="/brand/logo-em-power-black.png"
            alt="empower"
            width={70}
            height={50}
            priority
            className="block dark:hidden h-[50px] w-auto"
          />
          <Image
            src="/brand/logo-em-power-white.png"
            alt="empower"
            width={70}
            height={50}
            priority
            className="hidden dark:block h-[50px] w-auto"
          />
        </div>

        <h1 className="font-heading font-bold text-[19px] tracking-[-0.03em] text-center mt-8 text-text-primary uppercase">
          The smart study planner
        </h1>

        <p className="font-heading font-bold text-[14px] text-orange-text text-center mt-2">
          Believe you can, plan how you will
        </p>

        <Link
          href="/register"
          className="neu-raised-accent w-full mt-10 text-black font-heading font-bold text-[14px] rounded-full py-[16px] text-center"
        >
          start my planner
        </Link>

        <Link
          href="/login"
          className="mt-6 font-body text-[13px] text-text-muted underline underline-offset-2"
        >
          Already have an account? Log in here
        </Link>
      </div>

      <div className="flex-1" />

      <div
        className="w-full flex justify-center"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-[12px]">
          <span className="w-10 h-[3px] rounded-full bg-orange flex-shrink-0" aria-hidden="true" />
          <Image
            src="/brand/wordmark-empowermint-black.png"
            alt="empowermint"
            width={96}
            height={22}
            className="block dark:hidden h-[22px] w-auto"
          />
          <Image
            src="/brand/wordmark-empowermint-white.png"
            alt="empowermint"
            width={96}
            height={22}
            className="hidden dark:block h-[22px] w-auto"
          />
        </div>
      </div>
    </main>
  );
}
