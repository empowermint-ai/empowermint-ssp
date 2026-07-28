import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import NavArrows from '@/components/NavArrows';
import ManageSubjectsForm from '@/components/ManageSubjectsForm';
import BottomNav, { NAV_HEIGHT } from '@/components/BottomNav';

export default async function ManageSubjectsPage() {
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
    <main
      className="min-h-dvh flex flex-col px-[38px] pt-8 bg-bg"
      style={{ paddingBottom: `calc(${NAV_HEIGHT}px + 32px + env(safe-area-inset-bottom))` }}
    >
      <div className="mb-3">
        <NavArrows showForward={false} />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase text-teal">MANAGE MY PLANNER</p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-3">
        Update your ranking or exam dates
      </h1>

      <ManageSubjectsForm userId={user.id} initialSubjects={subjects} />

      <BottomNav userId={user.id} />
    </main>
  );
}
