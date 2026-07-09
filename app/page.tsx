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
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-3xl text-navy mb-2">empowermint</h1>
      <p className="text-text-body mb-10">Smart Study Planner</p>
      <div className="w-full max-w-sm space-y-3">
        <Link
          href="/signup"
          className="block w-full rounded-xl bg-orange text-white font-medium py-3.5"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="block w-full rounded-xl border border-card-border text-text-primary font-medium py-3.5"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
