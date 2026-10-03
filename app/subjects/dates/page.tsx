import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import ExamDatesForm from '@/components/ExamDatesForm';
import NavArrows from '@/components/NavArrows';

export default async function SubjectDatesPage() {
  const t = await getTranslations('examDates');
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: subjects }, { data: profile }] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, subject_name, confidence_score, exam_dates(id, exam_date)')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase.from('users').select('grade, student_type').eq('id', user.id).maybeSingle(),
  ]);

  if (!subjects || subjects.length === 0) {
    redirect('/subjects');
  }

  return (
    <main className="min-h-dvh flex flex-col px-[38px] py-8 bg-bg">
      <div className="mb-3">
        <NavArrows />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase text-teal">{t('eyebrow')}</p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.025em] text-text-primary mt-3">
        {t('title')}
      </h1>
      <p className="font-body text-[14px] text-text-body mt-2 mb-6">
        {t('intro')}
      </p>
      <ExamDatesForm
        initialSubjects={subjects}
        userId={user.id}
        studentType={profile?.student_type ?? null}
        grade={profile?.grade ?? null}
      />
    </main>
  );
}
