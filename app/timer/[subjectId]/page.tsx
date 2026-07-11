import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import TimerClient from '@/components/TimerClient';

export default async function TimerPage({ params }: { params: { subjectId: string } }) {
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

  if (!subject) {
    redirect('/dashboard');
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('id, subject_id, session_order')
    .eq('user_id', user.id)
    .eq('plan_date', todayStr)
    .order('session_order', { ascending: true });

  const rows = planRows ?? [];
  const currentRow = rows.find((r) => r.subject_id === params.subjectId);

  if (!currentRow) {
    redirect('/dashboard');
  }

  return (
    <TimerClient
      subjectId={params.subjectId}
      subjectName={subject.subject_name}
      sessionNumber={currentRow.session_order}
      totalSessions={rows.length}
      dailyPlanId={currentRow.id}
    />
  );
}
