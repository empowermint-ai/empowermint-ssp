import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import NavArrows from '@/components/NavArrows';

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
      <div className="w-full pt-6">
        <NavArrows />
      </div>

      <div className="flex-1" />

      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="h-[60px]">
          <Image
            src="/brand/logo-em-power-black.png"
            alt="empower"
            width={84}
            height={60}
            priority
            className="block dark:hidden h-[60px] w-auto"
          />
          <Image
            src="/brand/logo-em-power-white.png"
            alt="empower"
            width={84}
            height={60}
            priority
            className="hidden dark:block h-[60px] w-auto"
          />
        </div>

        <p className="mt-4 font-heading font-bold text-[11px] uppercase tracking-[2px] text-teal text-center">
          SMART STUDY PLANNER
        </p>

        <h1 className="font-heading font-bold text-[30px] leading-[1.1] tracking-[-0.066em] text-center mt-14">
          <span className="text-text-primary">Believe you can.</span>
          <br />
          <span className="text-orange">Plan how you will.</span>
        </h1>

        <p className="font-body text-[14px] text-text-body text-center max-w-[260px] mt-6">
          Tell us your subjects and exam dates. Get a personal study schedule —
          free, in under two minutes.
        </p>

        <Link
          href="/register"
          className="w-full mt-10 bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] text-center"
        >
          Start my planner
        </Link>

        <Link
          href="/login"
          className="mt-5 font-body text-[12px] text-text-muted underline"
        >
          Already have an account? Log in
        </Link>
      </div>

      <div className="flex-1" />

      <div className="pb-10">
        <Image
          src="/brand/logo-empowermint-black.png"
          alt="empowermint"
          width={80}
          height={20}
          className="block dark:hidden h-[20px] w-auto opacity-[0.85]"
        />
        <Image
          src="/brand/logo-empowermint-white.png"
          alt="empowermint"
          width={80}
          height={20}
          className="hidden dark:block h-[20px] w-auto opacity-[0.85]"
        />
      </div>
    </main>
  );
}
