import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import ExamDatesForm from '@/components/ExamDatesForm';
import NavArrows from '@/components/NavArrows';

export default async function SubjectDatesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, subject_name, confidence_score, exam_dates(id, exam_date)')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (!subjects || subjects.length === 0) {
    redirect('/subjects');
  }

  return (
    <main className="min-h-dvh flex flex-col px-[38px] py-8 bg-bg">
      <div className="mb-3">
        <NavArrows />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase text-teal">LAST STEP</p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-3">
        When is each exam?
      </h1>
      <p className="font-body text-[14px] text-text-body mt-2 mb-6">
        Tap a subject to add an exam date. You can add more than one, like a
        term test and the final.
      </p>
      <ExamDatesForm initialSubjects={subjects} userId={user.id} />
    </main>
  );
}
