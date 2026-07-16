import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import CalendarGrid from '@/components/CalendarGrid';
import NavArrows from '@/components/NavArrows';

export default async function CalendarPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, subject_name, exam_dates(exam_date)')
    .eq('user_id', user.id)
    .is('archived_at', null);

  const exams = (subjects ?? []).flatMap((s) =>
    s.exam_dates.map((d) => ({ date: d.exam_date, subject_name: s.subject_name }))
  );

  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('plan_date, completed, subjects(subject_name)')
    .eq('user_id', user.id);

  const sessions = (planRows ?? []).map((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    return {
      date: row.plan_date,
      subject_name: subject?.subject_name ?? '',
      completed: row.completed,
    };
  });

  return (
    <main className="min-h-dvh flex flex-col px-[22px] pt-[38px] pb-[18px] bg-bg">
      <div className="flex items-center gap-3">
        <NavArrows />
        <div>
          <p className="font-heading font-bold text-[15px] uppercase tracking-[0.6px] text-teal">
            Calendar view
          </p>
          <p className="font-body text-[12px] text-text-muted mt-[2px]">
            Tap a date to see what&apos;s on.
          </p>
        </div>
      </div>

      <CalendarGrid exams={exams} sessions={sessions} />
    </main>
  );
}
