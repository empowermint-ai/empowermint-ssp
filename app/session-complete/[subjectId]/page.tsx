import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSubjectLabel } from '@/lib/i18n/getSubjectLabel';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import ProgressStrip from '@/components/ProgressStrip';
import NavArrows from '@/components/NavArrows';

// Quote text lives in messages (sessionComplete.quotes.q1..q8).
const QUOTE_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;

export default async function SessionCompletePage({
  params,
}: {
  params: { subjectId: string };
}) {
  const t = await getTranslations('sessionComplete');
  const subjectLabel = await getSubjectLabel();
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
  const quote = t(`quotes.${QUOTE_KEYS[Math.floor(Math.random() * QUOTE_KEYS.length)]}`);

  return (
    <main
      className="min-h-dvh bg-bg flex flex-col items-center px-[22px] pt-[38px]"
      style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <div className="w-full">
        <NavArrows />
      </div>

      <div className="w-[54px] h-[54px] rounded-full bg-teal flex items-center justify-center mt-[6px] mb-[18px]">
        <span className="font-heading font-bold text-[24px] text-white">✓</span>
      </div>

      <h1 className="font-heading font-bold text-[21px] tracking-[-0.025em] text-text-primary text-center whitespace-pre-line">
        {t('title')}
      </h1>

      <p className="font-body text-[14px] text-text-body text-center mt-2">
        {t.rich('logged', {
          minutes: 25,
          subject: subjectLabel(subject.subject_name),
          b: (chunks) => <span className="font-bold">{chunks}</span>,
        })}
      </p>

      <div className="w-full mt-2 mb-[22px]">
        <ProgressStrip completedFlags={rows.map((r) => r.completed)} />
      </div>

      {allCompleted && (
        <div className="neu-raised rounded-neu-md px-[16px] py-[18px] w-full">
          <span className="font-heading font-bold text-[34px] text-purple leading-none">
            &quot;
          </span>
          <p className="font-body text-[14px] italic text-text-primary mt-1">{quote}</p>
          <p className="font-heading font-bold text-[10.5px] text-text-muted mt-3">
            {t('quoteSource')}
          </p>
        </div>
      )}

      <div className="flex-1" />

      <p className="font-heading font-bold text-[10.5px] uppercase text-text-primary text-center mb-3">
        {t('whatsNext')}
      </p>

      {nextSession ? (
        <Link
          href={`/timer/${nextSession.id}`}
          className="neu-raised-accent w-full text-black font-heading font-bold text-[13.5px] rounded-full py-[14px] text-center"
        >
          {t('startNext', { subject: subjectLabel(nextSession.subject_name) })}
        </Link>
      ) : (
        <p className="font-body text-[14px] text-text-body text-center">
          {t('doneToday')}
        </p>
      )}

      <Link
        href="/dashboard"
        className="neu-raised w-full text-text-primary font-heading font-bold text-[13.5px] rounded-full py-[13px] text-center mt-[10px]"
      >
        {t('backToPlan')}
      </Link>

      <p className="font-body text-[10px] text-text-muted text-center mt-3">
        {t('noPenalty')}
      </p>
    </main>
  );
}
