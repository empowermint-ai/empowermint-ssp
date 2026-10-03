import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import RankSubjectsForm from '@/components/RankSubjectsForm';
import NavArrows from '@/components/NavArrows';

export default async function RankSubjectsPage() {
  const t = await getTranslations('ranking');
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, subject_name, confidence_score')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (!subjects || subjects.length === 0) {
    redirect('/subjects');
  }

  return (
    <main className="min-h-dvh flex flex-col px-[38px] py-8 bg-bg">
      <div className="mb-3">
        <NavArrows />
      </div>

      <p className="font-heading font-bold text-[10px] uppercase text-teal">
        {t('eyebrow')}
      </p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.025em] text-text-primary mt-3">
        {t('title')}
      </h1>
      <p className="font-body text-[10px] text-text-muted mb-[18px] mt-1">
        {t('scale')}
      </p>
      <RankSubjectsForm initialSubjects={subjects} />
    </main>
  );
}
