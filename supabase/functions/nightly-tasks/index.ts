import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ExamDate {
  exam_date: string;
}

interface Subject {
  id: string;
  user_id: string;
  confidence_score: number | null;
  exam_dates: ExamDate[];
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

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Build tomorrow's plan for every user with active, dated subjects.
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

  const byUser = new Map<string, { subject: Subject; nextExam: string | null }[]>();
  for (const subject of activeSubjects ?? []) {
    const nextExam = nextExamDate(subject.exam_dates, tomorrowStr);
    const list = byUser.get(subject.user_id) ?? [];
    list.push({ subject, nextExam });
    byUser.set(subject.user_id, list);
  }

  const rowsToInsert: {
    user_id: string;
    subject_id: string;
    plan_date: string;
    session_order: number;
  }[] = [];

  for (const [userId, entries] of byUser) {
    const eligible = entries.filter(
      (e) => e.subject.confidence_score !== null && e.nextExam !== null
    );

    const top3 = [...eligible]
      .sort(
        (a, b) =>
          priorityScore(b.subject.confidence_score, b.nextExam, tomorrowStr) -
          priorityScore(a.subject.confidence_score, a.nextExam, tomorrowStr)
      )
      .slice(0, 3);

    top3.forEach((entry, index) => {
      rowsToInsert.push({
        user_id: userId,
        subject_id: entry.subject.id,
        plan_date: tomorrowStr,
        session_order: index + 1,
      });
    });
  }

  // Clear any existing rows for tomorrow first so re-runs stay idempotent
  const { error: deleteError } = await supabase
    .from("daily_plans")
    .delete()
    .eq("plan_date", tomorrowStr);

  if (deleteError) {
    return Response.json(
      { ok: false, step: "clear_existing", error: deleteError.message },
      { status: 500 }
    );
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("daily_plans").insert(rowsToInsert);
    if (insertError) {
      return Response.json(
        { ok: false, step: "insert_plans", error: insertError.message },
        { status: 500 }
      );
    }
  }

  return Response.json({
    ok: true,
    plan_date: tomorrowStr,
    users_planned: byUser.size,
    rows_inserted: rowsToInsert.length,
  });
});
