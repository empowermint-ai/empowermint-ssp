import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import TimerClient from '@/components/TimerClient';

export default async function TimerPage({ params }: { params: { planId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('id, subject_id, session_order, subjects(subject_name)')
    .eq('user_id', user.id)
    .eq('plan_date', todayStr)
    .order('session_order', { ascending: true });

  const rows = planRows ?? [];
  const currentRow = rows.find((r) => r.id === params.planId);

  if (!currentRow) {
    redirect('/dashboard');
  }

  const subject = Array.isArray(currentRow.subjects) ? currentRow.subjects[0] : currentRow.subjects;

  return (
    <TimerClient
      subjectId={currentRow.subject_id}
      subjectName={subject?.subject_name ?? ''}
      sessionNumber={currentRow.session_order}
      totalSessions={rows.length}
      dailyPlanId={currentRow.id}
    />
  );
}
