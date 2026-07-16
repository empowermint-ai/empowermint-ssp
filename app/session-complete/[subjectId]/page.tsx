import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import ProgressStrip from '@/components/ProgressStrip';
import NavArrows from '@/components/NavArrows';

const QUOTES = [
  "Effort doesn't need to be perfect to count. It just needs to be repeated.",
  'The plan is not the goal. The plan is what gets you to the goal.',
  "Confidence isn't something you wait for. It's built session by session.",
  "You don't need to feel ready. You need to show up.",
  "Every hour you put in now is a mark you don't have to worry about later.",
  'The learner who plans beats the learner who panics — every time.',
  'Progress is not always visible. But it is always real.',
  'You are closer than you think.',
];

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

  if (!subject) {
    redirect('/dashboard');
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('id, subject_id, session_order, completed, subjects(subject_name)')
    .eq('user_id', user.id)
    .eq('plan_date', todayStr)
    .order('session_order', { ascending: true });

  const rows = (planRows ?? []).map((row) => {
    const s = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    return {
      id: row.id,
      subject_id: row.subject_id,
      session_order: row.session_order,
      completed: row.completed,
      subject_name: s?.subject_name ?? '',
    };
  });

  const allCompleted = rows.length > 0 && rows.every((r) => r.completed);
  const nextSession = rows.find((r) => !r.completed);
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center px-[22px] pt-[38px] pb-[18px]">
      <div className="w-full">
        <NavArrows />
      </div>

      <div className="w-[54px] h-[54px] rounded-full bg-teal flex items-center justify-center mt-[6px] mb-[18px]">
        <span className="font-heading font-bold text-[24px] text-white">✓</span>
      </div>

      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary text-center">
        Nice work.
        <br />
        Session complete.
      </h1>

      <p className="font-body text-[14px] text-text-body text-center mt-2">
        25 minutes logged on <span className="font-bold">{subject.subject_name}</span>.
      </p>

      <div className="w-full mt-2 mb-[22px]">
        <ProgressStrip completedFlags={rows.map((r) => r.completed)} />
      </div>

      {allCompleted && (
        <div className="bg-card border-[1.5px] border-card-border rounded-[12px] px-[16px] py-[18px] w-full">
          <span className="font-heading font-bold text-[34px] text-purple leading-none">
            &quot;
          </span>
          <p className="font-body text-[14px] italic text-text-primary mt-1">{quote}</p>
          <p className="font-heading font-bold text-[10.5px] text-text-muted mt-3">
            — Mastering Your Studies
          </p>
        </div>
      )}

      <div className="flex-1" />

      <p className="font-heading font-bold text-[10.5px] uppercase text-text-primary text-center mb-3">
        What&apos;s next?
      </p>

      {nextSession ? (
        <Link
          href={`/timer/${nextSession.subject_id}`}
          className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] text-center"
        >
          Start next: {nextSession.subject_name}
        </Link>
      ) : (
        <p className="font-body text-[14px] text-text-body text-center">
          You&apos;re done for today. Well done!
        </p>
      )}

      <Link
        href="/dashboard"
        className="w-full border-[1.5px] border-text-primary text-text-primary font-heading font-bold text-[13.5px] rounded-[10px] py-[13px] text-center mt-[10px]"
      >
        Back to Today&apos;s Plan
      </Link>

      <p className="font-body text-[10px] text-text-muted text-center mt-3">
        Your call — there&apos;s no penalty either way.
      </p>
    </main>
  );
}
