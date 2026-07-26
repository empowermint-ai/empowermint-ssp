import { supabase } from '@/lib/supabaseClient';
import { nextExamDate } from '@/lib/nextExamDate';
import { priorityScore } from '@/lib/priorityScore';
import { allocateSessions } from '@/lib/allocateSessions';
import { MAX_DAILY_SESSIONS } from '@/lib/dailyPlanLimits';

// Recomputes today's remaining sessions whenever a learner updates their
// ranking or exam dates mid-day. Only incomplete, auto-generated rows are
// ever replaced - anything already completed, or added manually via
// "+ Add another session", is left untouched so real progress is never lost.
export async function recalculateTodayPlan(userId: string): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();

  const { data: activeSubjects } = await supabase
    .from('subjects')
    .select('id, confidence_score, exam_dates(exam_date)')
    .eq('user_id', userId)
    .is('archived_at', null);

  const eligible = (activeSubjects ?? [])
    .map((s) => ({ ...s, nextExam: nextExamDate(s.exam_dates, todayStr) }))
    .filter((s) => s.nextExam !== null);

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

  const { data: todayRows } = await supabase
    .from('daily_plans')
    .select('id, completed, is_auto_generated, session_order')
    .eq('user_id', userId)
    .eq('plan_date', todayStr);

  const rows = todayRows ?? [];
  const toDelete = rows.filter((r) => !r.completed && r.is_auto_generated).map((r) => r.id);
  const completedAutoCount = rows.filter((r) => r.completed && r.is_auto_generated).length;
  const remainingBudget = Math.max(0, MAX_DAILY_SESSIONS - completedAutoCount);
  const maxOrder = rows.reduce((max, r) => Math.max(max, r.session_order), 0);

  if (toDelete.length > 0) {
    await supabase.from('daily_plans').delete().in('id', toDelete);
  }

  const allocations = allocateSessions(ranked, remainingBudget);
  const newRows: {
    user_id: string;
    subject_id: string;
    plan_date: string;
    session_order: number;
    is_auto_generated: boolean;
  }[] = [];
  let order = maxOrder + 1;
  for (const { subject, count } of allocations) {
    for (let i = 0; i < count; i++) {
      newRows.push({
        user_id: userId,
        subject_id: subject.id,
        plan_date: todayStr,
        session_order: order++,
        is_auto_generated: true,
      });
    }
  }

  if (newRows.length > 0) {
    await supabase.from('daily_plans').insert(newRows);
  }
}
