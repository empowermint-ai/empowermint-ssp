import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import TodayPlanClient from '@/components/TodayPlanClient';
import SettingsMenu from '@/components/SettingsMenu';
import { nextExamDate } from '@/lib/nextExamDate';

const GREETINGS: ((name: string) => string)[] = [
  () => 'Welcome back, champ!',
  (name) => `Good to see you again, ${name}!`,
  (name) => `Let's go again, ${name}!`,
  (name) => `You showed up. That is already a win, ${name}.`,
  (name) => `Ready when you are, ${name}.`,
];

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const username = profile?.username ?? 'there';
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)](username);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekday = today.toLocaleDateString('en-GB', { weekday: 'long' });
  const dayMonth = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const todayFormatted = `${weekday}, ${dayMonth}`;

  const { data: activeSubjects } = await supabase
    .from('subjects')
    .select('id, subject_name, confidence_score, exam_dates(exam_date)')
    .eq('user_id', user.id)
    .is('archived_at', null);

  const subjects = activeSubjects ?? [];

  if (subjects.length === 0) {
    redirect('/subjects');
  }
  if (subjects.some((s) => s.confidence_score === null)) {
    redirect('/subjects/rank');
  }
  if (subjects.some((s) => s.exam_dates.length === 0)) {
    redirect('/subjects/dates');
  }

  const rankedCount = subjects.filter((s) => s.confidence_score !== null).length;

  const subjectsWithNextExam = subjects.map((s) => ({
    ...s,
    nextExam: nextExamDate(s.exam_dates, todayStr),
  }));

  const needsNewDate = subjectsWithNextExam
    .filter((s) => s.nextExam === null)
    .map((s) => ({ id: s.id, subject_name: s.subject_name }));

  const upcomingExams = subjectsWithNextExam
    .filter((s) => s.nextExam !== null)
    .sort((a, b) => (a.nextExam! < b.nextExam! ? -1 : 1));

  let examBanner: { subjectName: string; daysUntil: number } | null = null;
  if (upcomingExams.length > 0) {
    const closest = upcomingExams[0];
    const examMs = new Date(`${closest.nextExam}T00:00:00Z`).getTime();
    const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
    const daysUntil = Math.round((examMs - todayMs) / 86_400_000);
    if (daysUntil <= 14) {
      examBanner = { subjectName: closest.subject_name, daysUntil };
    }
  }

  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('id, subject_id, session_order, completed, suggested_start_time, subjects(subject_name, confidence_score)')
    .eq('user_id', user.id)
    .eq('plan_date', todayStr)
    .order('session_order', { ascending: true });

  const sessions = (planRows ?? []).map((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    return {
      id: row.id,
      subject_id: row.subject_id,
      subject_name: subject?.subject_name ?? '',
      confidence_score: subject?.confidence_score ?? null,
      suggested_start_time: row.suggested_start_time,
      completed: row.completed,
      session_order: row.session_order,
    };
  });

  const plannedSubjectIds = new Set(sessions.map((s) => s.subject_id));
  const available = subjectsWithNextExam
    .filter((s) => !plannedSubjectIds.has(s.id) && s.confidence_score !== null && s.nextExam !== null)
    .map((s) => ({
      id: s.id,
      subject_name: s.subject_name,
      confidence_score: s.confidence_score,
      exam_date: s.nextExam,
    }));

  return (
    <main className="h-screen flex flex-col px-[22px] pt-[38px] pb-[18px] bg-bg overflow-hidden">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-heading font-bold text-[19px] tracking-[-0.066em] text-text-primary">
            {greeting}
          </h1>
          <p className="font-body text-[11px] text-text-muted mt-1">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-purple text-white font-heading font-bold text-[10.5px] rounded-[20px] px-[10px] py-[5px] whitespace-nowrap">
            {rankedCount} ranked
          </span>
          <SettingsMenu />
        </div>
      </div>

      {examBanner && (
        <div className="flex items-center justify-between bg-navy rounded-[10px] px-[14px] py-[12px] mt-4">
          <span className="font-body font-bold text-[11.5px] text-white">
            {examBanner.subjectName} exam in
          </span>
          <span className="font-heading font-bold text-[16px] text-white">
            {examBanner.daysUntil} days
          </span>
        </div>
      )}

      <div className="mt-5">
        <p className="font-heading font-bold text-[15px] uppercase tracking-[0.6px] text-teal">
          Today&apos;s plan
        </p>
        <p className="font-body text-[12px] text-text-muted mt-[2px]">
          Here&apos;s what to study today, in order.
        </p>
      </div>

      <TodayPlanClient
        userId={user.id}
        todayStr={todayStr}
        initialSessions={sessions}
        initialAvailable={available}
        initialNeedsNewDate={needsNewDate}
      />

      <Link
        href="/account"
        className="font-body text-xs text-text-muted text-center underline mt-4"
      >
        Account settings
      </Link>
    </main>
  );
}
