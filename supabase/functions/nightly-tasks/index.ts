import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// A realistic daily study budget for a learner - roughly 3 hours of real
// commitment, so the plan stays achievable instead of listing every subject
// regardless of load. Each session is a 25 minute focus block, but the real
// time cost per session also includes a short break, so budget against that
// full slot rather than just the raw focus time.
const SESSION_MINUTES = 25;
const SESSION_BREAK_MINUTES = 5;
const SESSION_SLOT_MINUTES = SESSION_MINUTES + SESSION_BREAK_MINUTES;
const MAX_DAILY_STUDY_MINUTES = 180;
const MAX_DAILY_SESSIONS = Math.floor(MAX_DAILY_STUDY_MINUTES / SESSION_SLOT_MINUTES);

interface ExamDate {
  exam_date: string;
}

interface Subject {
  id: string;
  user_id: string;
  confidence_score: number | null;
  exam_dates: ExamDate[];
}

interface PlanRow {
  user_id: string;
  subject_id: string;
  plan_date: string;
  session_order: number;
  is_auto_generated: boolean;
}

function nextExamDate(examDates: ExamDate[], targetDate: string): string | null {
  const upcoming = examDates.map((d) => d.exam_date).filter((d) => d >= targetDate);
  if (upcoming.length === 0) return null;
  return upcoming.sort()[0];
}

function daysWeight(examDate: string | null, targetDate: string): number {
  if (!examDate) return 1;
  const exam = new Date(`${examDate}T00:00:00Z`).getTime();
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const days = Math.round((exam - target) / 86_400_000);
  if (days < 0) return 1;
  if (days > 14) return 1;
  if (days >= 8) return 2;
  if (days >= 4) return 3;
  return 4;
}

function priorityScore(
  confidenceScore: number | null,
  examDate: string | null,
  targetDate: string
): number {
  const confidence = confidenceScore ?? 3;
  return (6 - confidence) * daysWeight(examDate, targetDate);
}

// Decides how many of the day's session slots a subject should get, so a
// learner who is weak in a subject with an exam coming up soon gets focused
// repetition on it instead of a single scattered session like everything
// else. Allocation still happens within the same overall daily time budget -
// this redistributes attention, it does not add extra total study time.
function sessionsForSubject(confidenceScore: number, daysUntilExam: number): number {
  if (confidenceScore <= 2 && daysUntilExam <= 14) return 3;
  if (confidenceScore <= 3 && daysUntilExam <= 7) return 2;
  return 1;
}

// Ranks a user's eligible subjects for a target date and expands the
// allocation into individual session rows, starting session_order at
// startOrder. Pure computation - no DB access - so it is safe to reuse for
// both the forward-looking (tomorrow) build and the same-day backfill.
function buildRowsForUser(
  userId: string,
  entries: { subject: Subject; nextExam: string | null }[],
  targetDateStr: string,
  startOrder: number
): PlanRow[] {
  const eligible = entries.filter(
    (e) => e.subject.confidence_score !== null && e.nextExam !== null
  );

  const ranked = [...eligible].sort(
    (a, b) =>
      priorityScore(b.subject.confidence_score, b.nextExam, targetDateStr) -
      priorityScore(a.subject.confidence_score, a.nextExam, targetDateStr)
  );

  const rows: PlanRow[] = [];
  let remaining = MAX_DAILY_SESSIONS;
  let order = startOrder;

  for (const entry of ranked) {
    if (remaining <= 0) break;
    const daysUntilExam = Math.round(
      (new Date(`${entry.nextExam}T00:00:00Z`).getTime() -
        new Date(`${targetDateStr}T00:00:00Z`).getTime()) /
        86_400_000
    );
    const target = sessionsForSubject(entry.subject.confidence_score ?? 3, daysUntilExam);
    const count = Math.min(target, remaining);
    remaining -= count;

    for (let i = 0; i < count; i++) {
      rows.push({
        user_id: userId,
        subject_id: entry.subject.id,
        plan_date: targetDateStr,
        session_order: order++,
        is_auto_generated: true,
      });
    }
  }

  return rows;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Subjects whose exams have all passed are left alone here - the dashboard
  // prompts the learner to add a new date instead of this silently archiving them.
  const { data: activeSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, user_id, confidence_score, exam_dates(exam_date)")
    .is("archived_at", null)
    .returns<Subject[]>();

  if (subjectsError) {
    return Response.json(
      { ok: false, step: "fetch_subjects", error: subjectsError.message },
      { status: 500 }
    );
  }

  function groupByUser(targetDateStr: string) {
    const byUser = new Map<string, { subject: Subject; nextExam: string | null }[]>();
    for (const subject of activeSubjects ?? []) {
      const nextExam = nextExamDate(subject.exam_dates, targetDateStr);
      const list = byUser.get(subject.user_id) ?? [];
      list.push({ subject, nextExam });
      byUser.set(subject.user_id, list);
    }
    return byUser;
  }

  // --- Same-day backfill -----------------------------------------------
  // Safety net for a missed run: if any user has zero daily_plans rows at
  // all for today (not even a manual one), build today's plan for them now.
  // This never deletes or rebuilds - a day that already has any rows (auto
  // or manual, completed or not) is left completely untouched, since a
  // learner may already be partway through it.
  const { data: todayRows, error: todayRowsError } = await supabase
    .from("daily_plans")
    .select("user_id")
    .eq("plan_date", todayStr);

  if (todayRowsError) {
    return Response.json(
      { ok: false, step: "fetch_today_rows", error: todayRowsError.message },
      { status: 500 }
    );
  }

  const usersWithTodayRows = new Set((todayRows ?? []).map((r) => r.user_id));
  const byUserToday = groupByUser(todayStr);
  const backfillRows: PlanRow[] = [];

  for (const [userId, entries] of byUserToday) {
    if (usersWithTodayRows.has(userId)) continue;
    backfillRows.push(...buildRowsForUser(userId, entries, todayStr, 1));
  }

  if (backfillRows.length > 0) {
    const { error: backfillError } = await supabase.from("daily_plans").insert(backfillRows);
    if (backfillError) {
      return Response.json(
        { ok: false, step: "backfill_today", error: backfillError.message },
        { status: 500 }
      );
    }
  }

  // --- Tomorrow's plan ---------------------------------------------------
  // Rows a learner added manually for tomorrow (via Today's Plan or the
  // calendar) before this run - these must survive the rebuild below, so
  // only auto-generated rows for the date get cleared and replaced.
  const { data: manualRows, error: manualError } = await supabase
    .from("daily_plans")
    .select("user_id")
    .eq("plan_date", tomorrowStr)
    .eq("is_auto_generated", false);

  if (manualError) {
    return Response.json(
      { ok: false, step: "fetch_manual_rows", error: manualError.message },
      { status: 500 }
    );
  }

  const manualCountByUser = new Map<string, number>();
  for (const row of manualRows ?? []) {
    manualCountByUser.set(row.user_id, (manualCountByUser.get(row.user_id) ?? 0) + 1);
  }

  const byUserTomorrow = groupByUser(tomorrowStr);
  const tomorrowRows: PlanRow[] = [];
  for (const [userId, entries] of byUserTomorrow) {
    const startOrder = (manualCountByUser.get(userId) ?? 0) + 1;
    tomorrowRows.push(...buildRowsForUser(userId, entries, tomorrowStr, startOrder));
  }

  // Clear only this job's own previous rows for tomorrow so re-runs stay
  // idempotent - manually added rows for the date are left untouched.
  const { error: deleteError } = await supabase
    .from("daily_plans")
    .delete()
    .eq("plan_date", tomorrowStr)
    .eq("is_auto_generated", true);

  if (deleteError) {
    return Response.json(
      { ok: false, step: "clear_existing", error: deleteError.message },
      { status: 500 }
    );
  }

  if (tomorrowRows.length > 0) {
    const { error: insertError } = await supabase.from("daily_plans").insert(tomorrowRows);
    if (insertError) {
      return Response.json(
        { ok: false, step: "insert_plans", error: insertError.message },
        { status: 500 }
      );
    }
  }

  return Response.json({
    ok: true,
    today_backfilled: { plan_date: todayStr, users_backfilled: new Set(backfillRows.map((r) => r.user_id)).size, rows_inserted: backfillRows.length },
    tomorrow: { plan_date: tomorrowStr, users_planned: byUserTomorrow.size, rows_inserted: tomorrowRows.length },
  });
});
