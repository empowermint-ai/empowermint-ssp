import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import ExamTimerSessionClient from '@/components/ExamTimerSessionClient';
import { EXAM_TIMER_DURATIONS } from '@/lib/examTimerDurations';

export default async function ExamTimerSessionPage({
  searchParams,
}: {
  searchParams: { subjectId?: string; minutes?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const minutes = Number(searchParams.minutes);
  const validDuration = EXAM_TIMER_DURATIONS.some((d) => d.minutes === minutes);

  if (!searchParams.subjectId || !validDuration) {
    redirect('/exam-timer/setup');
  }

  const { data: subject } = await supabase
    .from('subjects')
    .select('id, subject_name')
    .eq('id', searchParams.subjectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subject) {
    redirect('/exam-timer/setup');
  }

  return (
    <ExamTimerSessionClient learnerId={user.id} subjectName={subject.subject_name} durationMinutes={minutes} />
  );
}
