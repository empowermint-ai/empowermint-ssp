import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import SubjectsForm from '@/components/SubjectsForm';
import NavArrows from '@/components/NavArrows';
import InstallAppBanner from '@/components/InstallAppBanner';

export default async function SubjectsPage() {
  const t = await getTranslations('subjects');
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: existingSubjects } = await supabase
    .from('subjects')
    .select('id, subject_name, is_custom')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

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

      <InstallAppBanner />

      <SubjectsForm userId={user.id} initialSubjects={existingSubjects ?? []} />
    </main>
  );
}
