import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center px-6 pt-20 pb-10 text-center">
      <div className="w-40">
        <Image
          src="/brand/logo-em-power-black.png"
          alt="empower"
          width={375}
          height={268}
          priority
          className="block dark:hidden w-full h-auto"
        />
        <Image
          src="/brand/logo-em-power-white.png"
          alt="empower"
          width={375}
          height={268}
          priority
          className="hidden dark:block w-full h-auto"
        />
      </div>
      <p className="mt-4 text-sm font-semibold tracking-[0.2em] text-teal">
        SMART STUDY PLANNER
      </p>

      <h1 className="font-heading text-4xl font-extrabold leading-tight mt-10 text-text-primary">
        Believe you can.
        <br />
        <span className="text-orange">Plan how you will.</span>
      </h1>

      <p className="text-text-body mt-6 max-w-xs">
        Tell us your subjects and exam dates. Get a personal study schedule —
        free, in under two minutes.
      </p>

      <div className="w-full max-w-sm mt-10">
        <Link
          href="/signup"
          className="block w-full rounded-full bg-orange text-white font-semibold py-4"
        >
          Start my planner
        </Link>
      </div>

      <Link
        href="/login"
        className="mt-5 text-sm text-text-muted underline underline-offset-2"
      >
        Already have an account? Log in
      </Link>

      <div className="flex-1" />

      <div className="w-32">
        <Image
          src="/brand/logo-empowermint-black.png"
          alt="empowermint"
          width={421}
          height={105}
          className="block dark:hidden w-full h-auto"
        />
        <Image
          src="/brand/logo-empowermint-white.png"
          alt="empowermint"
          width={421}
          height={105}
          className="hidden dark:block w-full h-auto"
        />
      </div>
    </main>
  );
}
