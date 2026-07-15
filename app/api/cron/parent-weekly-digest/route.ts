import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdminClient';
import { nextExamDate } from '@/lib/nextExamDate';
import { buildWeeklyDigestEmail } from '@/lib/weeklyDigestEmail';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const origin = new URL(request.url).origin;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndDisplay = new Date(today);
  weekEndDisplay.setDate(weekEndDisplay.getDate() - 1);
  const rangeLabel = `${formatShort(weekStart)} - ${formatShort(weekEndDisplay)}`;

  const { data: parents, error: parentsError } = await supabase
    .from('users')
    .select('id, username, parent_notify_email, parent_notify_token')
    .not('parent_notify_email', 'is', null)
    .not('parent_notify_confirmed_at', 'is', null);

  if (parentsError) {
    return NextResponse.json(
      { ok: false, step: 'fetch_parents', error: parentsError.message },
      { status: 500 }
    );
  }

  let sent = 0;
  let skipped = 0;

  for (const parent of parents ?? []) {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, subject_name, exam_dates(exam_date)')
      .eq('user_id', parent.id)
      .is('archived_at', null);

    const { data: planRows } = await supabase
      .from('daily_plans')
      .select('completed, subjects(subject_name)')
      .eq('user_id', parent.id)
      .gte('plan_date', weekStartStr)
      .lt('plan_date', todayStr);

    const sessions = (planRows ?? []).map((row) => {
      const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
      return { completed: row.completed as boolean, subjectName: subject?.subject_name ?? '' };
    });

    if (sessions.length === 0) {
      skipped++;
      continue;
    }

    const plannedCount = sessions.length;
    const completedCount = sessions.filter((s) => s.completed).length;

    const completedBySubject = new Map<string, number>();
    for (const s of sessions) {
      if (!s.completed) continue;
      completedBySubject.set(s.subjectName, (completedBySubject.get(s.subjectName) ?? 0) + 1);
    }
    const subjectBreakdown = Array.from(completedBySubject.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const upcomingExams = (subjects ?? [])
      .map((s) => ({ name: s.subject_name as string, nextExam: nextExamDate(s.exam_dates, todayStr) }))
      .filter((s): s is { name: string; nextExam: string } => s.nextExam !== null)
      .map((s) => {
        const days = Math.round(
          (new Date(`${s.nextExam}T00:00:00Z`).getTime() -
            new Date(`${todayStr}T00:00:00Z`).getTime()) /
            86_400_000
        );
        return { name: s.name, daysUntil: days };
      })
      .filter((s) => s.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);

    const unsubscribeUrl = `${origin}/api/parent-notify/unsubscribe?token=${parent.parent_notify_token}`;
    const studentName = parent.username ?? 'Your child';

    const html = buildWeeklyDigestEmail({
      studentName,
      rangeLabel,
      completedCount,
      plannedCount,
      subjectBreakdown,
      upcomingExams,
      unsubscribeUrl,
      logoUrl: `${origin}/brand/logo-em-power-black.png`,
    });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'empowermint <no-reply@empowermint.co.za>',
        to: parent.parent_notify_email,
        subject: `${studentName}'s weekly study update`,
        html,
      }),
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
