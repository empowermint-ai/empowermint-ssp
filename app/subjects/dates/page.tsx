import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export default async function SubjectDatesPage() {
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

  return (
    <main className="min-h-screen bg-bg flex flex-col px-[38px] py-10">
      <p className="font-heading font-bold text-[10px] uppercase text-teal">
        BE HONEST — THIS DRIVES YOUR PLAN
      </p>
      <h1 className="font-heading font-bold text-[21px] tracking-[-0.066em] text-text-primary mt-3">
        Exam dates
      </h1>
      <p className="font-body text-[14px] text-text-body mt-2">
        This screen is a placeholder — your confidence rankings saved correctly and
        are listed below. The real exam-dates design comes next.
      </p>

      <div className="mt-6 space-y-[9px]">
        {subjects?.map((subject) => (
          <div
            key={subject.id}
            className="bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] flex items-center justify-between"
          >
            <span className="font-body font-bold text-[13.5px] text-text-primary">
              {subject.subject_name}
            </span>
            <span className="text-text-muted text-xs">
              Confidence: {subject.confidence_score ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
