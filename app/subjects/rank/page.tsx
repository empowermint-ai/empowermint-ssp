import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export default async function RankSubjectsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, subject_name, is_custom')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen bg-bg flex flex-col px-[38px] py-10">
      <p className="font-heading font-bold text-[10px] uppercase text-teal">
        BUILD YOUR SUBJECT LIST
      </p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-3">
        Rank your subjects
      </h1>
      <p className="font-body text-[14px] text-text-body mt-2">
        This screen is a placeholder — your subjects saved correctly and are listed
        below. The real ranking design comes next.
      </p>

      <div className="mt-6 space-y-[9px]">
        {subjects?.map((subject) => (
          <div
            key={subject.id}
            className="bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px]"
          >
            <span className="font-body font-bold text-[13.5px] text-text-primary">
              {subject.subject_name}
            </span>
            {subject.is_custom && (
              <span className="ml-2 text-text-muted text-xs">(custom)</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
