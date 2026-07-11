import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import RankSubjectsForm from '@/components/RankSubjectsForm';

export default async function RankSubjectsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, subject_name, confidence_score')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (!subjects || subjects.length === 0) {
    redirect('/subjects');
  }

  return (
    <main className="h-screen flex flex-col px-[38px] py-8 bg-bg overflow-hidden">
      <p className="font-heading font-bold text-[10px] uppercase text-teal">
        BE HONEST — THIS DRIVES YOUR PLAN
      </p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-3">
        How confident are you in each?
      </h1>
      <p className="font-body text-[10px] text-text-muted mb-[18px] mt-1">
        1 = weakest &nbsp;·&nbsp; 5 = strongest
      </p>
      <RankSubjectsForm initialSubjects={subjects} />
    </main>
  );
}
