import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface Subject {
  id: string;
  user_id: string;
  confidence_score: number | null;
  exam_date: string | null;
}

function daysWeight(examDate: string | null, targetDate: string): number {
  if (!examDate) return 1;
  const exam = new Date(`${examDate}T00:00:00Z`).getTime();
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const days = Math.round((exam - target) / 86_400_000);
  if (days > 14) return 1;
  if (days >= 8) return 2;
  if (days >= 4) return 3;
  return 4; // 1-3 days (or overdue, though auto-archive should prevent that)
}

function priorityScore(subject: Subject, targetDate: string): number {
  const confidence = subject.confidence_score ?? 3;
  return (6 - confidence) * daysWeight(subject.exam_date, targetDate);
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

  // Step 1: auto-archive subjects whose exam date has passed
  const { error: archiveError } = await supabase
    .from("subjects")
    .update({ archived_at: now.toISOString() })
    .lt("exam_date", todayStr)
    .is("archived_at", null);

  if (archiveError) {
    return Response.json(
      { ok: false, step: "archive", error: archiveError.message },
      { status: 500 }
    );
  }

  // Step 2: build tomorrow's plan for every user with active subjects
  const { data: activeSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, user_id, confidence_score, exam_date")
    .is("archived_at", null)
    .returns<Subject[]>();

  if (subjectsError) {
    return Response.json(
      { ok: false, step: "fetch_subjects", error: subjectsError.message },
      { status: 500 }
    );
  }

  const byUser = new Map<string, Subject[]>();
  for (const subject of activeSubjects ?? []) {
    const list = byUser.get(subject.user_id) ?? [];
    list.push(subject);
    byUser.set(subject.user_id, list);
  }

  const rowsToInsert: {
    user_id: string;
    subject_id: string;
    plan_date: string;
    session_order: number;
  }[] = [];

  for (const [userId, subjects] of byUser) {
    const top3 = [...subjects]
      .sort((a, b) => priorityScore(b, tomorrowStr) - priorityScore(a, tomorrowStr))
      .slice(0, 3);

    top3.forEach((subject, index) => {
      rowsToInsert.push({
        user_id: userId,
        subject_id: subject.id,
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
    archived_before: todayStr,
    plan_date: tomorrowStr,
    users_planned: byUser.size,
    rows_inserted: rowsToInsert.length,
  });
});
