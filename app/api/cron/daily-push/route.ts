import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createSupabaseAdminClient } from '@/lib/supabaseAdminClient';
import { isEnabledLocale, DEFAULT_LOCALE } from '@/config/locales';
import { nextExamDate } from '@/lib/nextExamDate';
import { buildDailyMessage } from '@/lib/push/dailyMessage';
import { isDue, localHourAndDate } from '@/lib/push/schedule';

export const dynamic = 'force-dynamic';

// Runs every hour (see supabase/push-cron.sql). Each learner gets at most one
// reminder a day, at the hour they chose in their own timezone.
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const allowed = [process.env.CRON_SECRET, process.env.PUSH_CRON_SECRET].filter(Boolean);
  if (!authorization || !allowed.some((secret) => authorization === `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ ok: false, error: 'VAPID keys are not configured' }, { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:ebrahim@empowermint.co.za',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);
  const dayNumber = Math.floor(now.getTime() / 86_400_000);

  const { data: learners, error } = await supabase
    .from('users')
    .select('id, preferred_language, push_hour, push_timezone, push_last_sent_on')
    .eq('push_enabled', true);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let due = 0;

  for (const learner of learners ?? []) {
    const isDueNow = isDue(
      { hour: learner.push_hour, timeZone: learner.push_timezone, lastSentOn: learner.push_last_sent_on },
      now
    );
    if (!isDueNow) continue;
    due++;

    const localDate = localHourAndDate(learner.push_timezone, now).date;
    const markDone = () =>
      supabase.from('users').update({ push_last_sent_on: localDate }).eq('id', learner.id);

    const [{ data: plan }, { data: subjects }, { data: subs }] = await Promise.all([
      supabase
        .from('daily_plans')
        .select('completed, subjects(subject_name)')
        .eq('user_id', learner.id)
        .eq('plan_date', todayUtc)
        .order('session_order', { ascending: true }),
      supabase
        .from('subjects')
        .select('subject_name, exam_dates(exam_date)')
        .eq('user_id', learner.id)
        .is('archived_at', null),
      supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', learner.id),
    ]);

    // Nothing to nudge about: no plan yet, or every session is already done.
    const rows = plan ?? [];
    if (rows.length === 0 || rows.every((r) => r.completed) || !subs?.length) {
      await markDone();
      skipped++;
      continue;
    }

    const subjectNames = rows.map((r) => {
      const s = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects;
      return s?.subject_name ?? '';
    });

    const todayMs = new Date(`${todayUtc}T00:00:00Z`).getTime();
    const exams = (subjects ?? [])
      .map((s) => ({ subjectName: s.subject_name, date: nextExamDate(s.exam_dates, todayUtc) }))
      .filter((e): e is { subjectName: string; date: string } => e.date !== null)
      .map((e) => ({
        subjectName: e.subjectName,
        daysUntil: Math.round((new Date(`${e.date}T00:00:00Z`).getTime() - todayMs) / 86_400_000),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const locale = isEnabledLocale(learner.preferred_language) ? learner.preferred_language : DEFAULT_LOCALE;
    const message = await buildDailyMessage({
      locale,
      subjectNames,
      nextExam: exams[0] ?? null,
      dayNumber,
    });

    let delivered = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(message),
          { TTL: 6 * 60 * 60 }
        );
        delivered = true;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: the learner removed the app or revoked permission.
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          failed++;
        }
      }
    }
    if (delivered) {
      sent++;
      await markDone();
    }
  }

  return NextResponse.json({ ok: true, enabled: learners?.length ?? 0, due, sent, skipped, failed });
}
