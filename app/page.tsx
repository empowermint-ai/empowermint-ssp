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
      <div className="flex flex-col items-center">
        <span className="font-heading text-5xl font-extrabold leading-[0.85] text-text-primary">
          em
        </span>
        <span className="w-14 h-[3px] bg-orange my-1.5" />
        <span className="font-heading text-3xl font-extrabold leading-[0.85] text-text-primary">
          power
        </span>
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

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 mb-1">
          <span className="w-2 h-2 rounded-full bg-navy" />
          <span className="w-2 h-2 rounded-full bg-teal" />
          <span className="w-2 h-2 rounded-full bg-purple" />
        </div>
        <span className="font-heading text-sm font-bold text-text-primary">
          empowermint
        </span>
        <span className="w-16 h-[2px] bg-orange mt-1" />
      </div>
    </main>
  );
}
