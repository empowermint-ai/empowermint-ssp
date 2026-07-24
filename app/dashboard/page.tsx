import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import TodayPlanClient from '@/components/TodayPlanClient';
import SettingsMenu from '@/components/SettingsMenu';
import InstallAppBanner from '@/components/InstallAppBanner';
import UpcomingExamsPanel from '@/components/UpcomingExamsPanel';
import ExamReflectionPrompt from '@/components/ExamReflectionPrompt';
import AppReviewPrompt from '@/components/AppReviewPrompt';
import { nextExamDate } from '@/lib/nextExamDate';
import { priorityScore } from '@/lib/priorityScore';
import { allocateSessions } from '@/lib/allocateSessions';
import { MAX_DAILY_SESSIONS } from '@/lib/dailyPlanLimits';

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
    .select('username, review_prompt_dismissed_at')
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
    .select('id, subject_name, confidence_score, exam_dates(id, exam_date, reflected_at)')
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

  const subjectsWithNextExam = subjects.map((s) => ({
    ...s,
    nextExam: nextExamDate(s.exam_dates, todayStr),
  }));

  const needsNewDate = subjectsWithNextExam
    .filter((s) => s.nextExam === null)
    .map((s) => ({ id: s.id, subject_name: s.subject_name }));

  const pendingReflections = subjects.flatMap((s) =>
    s.exam_dates
      .filter((d) => d.exam_date < todayStr && d.reflected_at === null)
      .map((d) => ({
        examDateId: d.id,
        subjectId: s.id,
        subjectName: s.subject_name,
        examDate: d.exam_date,
        confidenceScore: s.confidence_score ?? 3,
      }))
  );

  const upcomingExams = subjectsWithNextExam
    .filter((s) => s.nextExam !== null)
    .sort((a, b) => (a.nextExam! < b.nextExam! ? -1 : 1));

  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const allUpcomingExams = upcomingExams
    .map((s) => {
      const examMs = new Date(`${s.nextExam}T00:00:00Z`).getTime();
      const daysUntil = Math.round((examMs - todayMs) / 86_400_000);
      return { subjectName: s.subject_name, examDate: s.nextExam!, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  let { data: planRows } = await supabase
    .from('daily_plans')
    .select('id, subject_id, session_order, completed, suggested_start_time, topic, topic_completed, subjects(subject_name, confidence_score)')
    .eq('user_id', user.id)
    .eq('plan_date', todayStr)
    .order('session_order', { ascending: true });

  // Safety net: if the nightly job ever misses a run (or this is a brand new
  // day for an existing account), a learner should never land on a silently
  // blank plan - generate today's sessions on the spot using the same
  // ranking/allocation the nightly job itself uses.
  if ((planRows ?? []).length === 0) {
    const eligible = subjectsWithNextExam.filter((s) => s.nextExam !== null);

    if (eligible.length > 0) {
      const ranked = eligible
        .map((s) => ({
          id: s.id,
          confidenceScore: s.confidence_score ?? 3,
          daysUntilExam: Math.round(
            (new Date(`${s.nextExam}T00:00:00Z`).getTime() - todayMs) / 86_400_000
          ),
          score: priorityScore(s.confidence_score, s.nextExam, todayStr),
        }))
        .sort((a, b) => b.score - a.score);

      const allocations = allocateSessions(ranked, MAX_DAILY_SESSIONS);

      const rowsToInsert: {
        user_id: string;
        subject_id: string;
        plan_date: string;
        session_order: number;
        is_auto_generated: boolean;
      }[] = [];
      let order = 1;
      for (const { subject, count } of allocations) {
        for (let i = 0; i < count; i++) {
          rowsToInsert.push({
            user_id: user.id,
            subject_id: subject.id,
            plan_date: todayStr,
            session_order: order++,
            is_auto_generated: true,
          });
        }
      }

      if (rowsToInsert.length > 0) {
        const { data: inserted } = await supabase
          .from('daily_plans')
          .insert(rowsToInsert)
          .select('id, subject_id, session_order, completed, suggested_start_time, topic, topic_completed, subjects(subject_name, confidence_score)');
        planRows = inserted ?? [];
      }
    }
  }

  const nextExamBySubjectId = new Map(subjectsWithNextExam.map((s) => [s.id, s.nextExam]));

  const sessions = (planRows ?? []).map((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    return {
      id: row.id,
      subject_id: row.subject_id,
      subject_name: subject?.subject_name ?? '',
      confidence_score: subject?.confidence_score ?? null,
      exam_date: nextExamBySubjectId.get(row.subject_id) ?? null,
      suggested_start_time: row.suggested_start_time,
      completed: row.completed,
      session_order: row.session_order,
      topic: row.topic,
      topic_completed: row.topic_completed,
    };
  });

  const available = subjectsWithNextExam.map((s) => ({
    id: s.id,
    subject_name: s.subject_name,
    confidence_score: s.confidence_score,
    exam_date: s.nextExam,
  }));

  const { count: completedSessionsCount } = await supabase
    .from('daily_plans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('completed', true);

  const { data: existingReview } = await supabase
    .from('app_reviews')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const dismissedAt = profile?.review_prompt_dismissed_at
    ? new Date(profile.review_prompt_dismissed_at).getTime()
    : null;
  const dismissedRecently = dismissedAt !== null && Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000;

  const showReviewPrompt = (completedSessionsCount ?? 0) >= 5 && !existingReview && !dismissedRecently;

  return (
    <main className="min-h-dvh flex flex-col px-[22px] pt-[38px] pb-[18px] bg-bg">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-heading font-bold text-[19px] tracking-[-0.066em] text-text-primary">
            {greeting}
          </h1>
          <p className="font-body text-[11px] text-text-muted mt-1">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            aria-label="Calendar view"
            className="text-text-primary text-[19px] leading-none p-1"
          >
            📅
          </Link>
          <SettingsMenu />
        </div>
      </div>

      <InstallAppBanner />

      <UpcomingExamsPanel exams={allUpcomingExams} />

      <ExamReflectionPrompt initialReflections={pendingReflections} />

      <div className="mt-5">
        <p className="font-heading font-bold text-[15px] uppercase tracking-[0.6px] text-teal">
          Today&apos;s plan (recommended)
        </p>
        <p className="font-body text-[12px] text-text-muted mt-[2px]">
          Here&apos;s what we recommend for today — feel free to amend it to suit you.
        </p>
      </div>

      <TodayPlanClient
        userId={user.id}
        todayStr={todayStr}
        studentName={username}
        dateLabel={todayFormatted}
        initialSessions={sessions}
        initialAvailable={available}
        initialNeedsNewDate={needsNewDate}
        exams={allUpcomingExams}
      />

      {showReviewPrompt && <AppReviewPrompt userId={user.id} />}

      <Link
        href="/account"
        className="font-body text-xs text-text-muted text-center underline mt-4"
      >
        Account settings
      </Link>
    </main>
  );
}
