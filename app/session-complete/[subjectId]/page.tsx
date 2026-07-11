import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export default async function SessionCompletePage({
  params,
}: {
  params: { subjectId: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subject } = await supabase
    .from('subjects')
    .select('subject_name')
    .eq('id', params.subjectId)
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-10 text-center">
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary">
        Session complete
      </h1>
      <p className="font-body text-[14px] text-text-body mt-2 max-w-xs">
        This screen is a placeholder — great work on {subject?.subject_name ?? 'your session'}.
        The real celebration design comes next.
      </p>
      <Link href="/dashboard" className="text-teal text-sm font-medium mt-6">
        Back to today&apos;s plan
      </Link>
    </main>
  );
}
