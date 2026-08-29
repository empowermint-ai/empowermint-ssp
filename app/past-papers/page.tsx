import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import PastExamPapersLinkOut from '@/components/PastExamPapersLinkOut';

export default async function PastPapersPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('grade')
    .eq('id', user.id)
    .maybeSingle();

  return <PastExamPapersLinkOut learnerId={user.id} grade={profile?.grade ?? null} />;
}
