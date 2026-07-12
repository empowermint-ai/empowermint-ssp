import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import SubjectsForm from '@/components/SubjectsForm';

export default async function SubjectsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-dvh flex flex-col px-[38px] py-8 bg-bg">
      <p className="font-heading font-bold text-[10px] uppercase text-teal">
        BUILD YOUR SUBJECT LIST
      </p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-3">
        What are you studying?
      </h1>
      <SubjectsForm userId={user.id} />
    </main>
  );
}
