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
        <div className="neu-raised rounded-full w-[132px] h-[132px] flex items-center justify-center">
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

        <h1 className="font-heading font-bold text-[19px] tracking-[-0.02em] text-center mt-8 text-text-primary uppercase">
          The smart study planner
        </h1>

        <p className="font-heading font-bold text-[14px] text-orange text-center mt-2">
          Believe you can, plan how you will
        </p>

        <Link
          href="/register"
          className="neu-raised-accent w-full mt-10 text-text-primary font-heading font-bold text-[14px] rounded-neu-lg py-[16px] text-center"
        >
          start my planner
        </Link>

        <Link
          href="/login"
          className="mt-6 font-body text-[13px] text-text-muted underline underline-offset-2"
        >
          Already have an account? Log in here
        </Link>

        <div className="flex mt-9">
          <span className="w-8 h-8 rounded-full bg-purple -mr-2 ring-2 ring-bg" />
          <span className="w-8 h-8 rounded-full bg-navy -mr-2 ring-2 ring-bg" />
          <span className="w-8 h-8 rounded-full bg-teal -mr-2 ring-2 ring-bg" />
          <span className="w-8 h-8 rounded-full bg-cream ring-2 ring-bg" />
        </div>
      </div>

      <div className="flex-1" />

      <div className="pb-10 w-full flex justify-center">
        <div className="w-24 h-[2px] bg-orange" />
      </div>
    </main>
  );
}
