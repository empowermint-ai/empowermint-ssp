import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

function formatFullDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default async function CalendarPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, subject_name, exam_dates(exam_date)')
    .eq('user_id', user.id)
    .is('archived_at', null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const entries = (subjects ?? [])
    .flatMap((s) => s.exam_dates.map((d) => ({ subject_name: s.subject_name, exam_date: d.exam_date })))
    .sort((a, b) => (a.exam_date < b.exam_date ? -1 : 1));

  return (
    <main className="min-h-dvh flex flex-col px-[22px] pt-[38px] pb-[18px] bg-bg">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="text-text-primary text-[19px] leading-none p-1"
        >
          ←
        </Link>
        <div>
          <p className="font-heading font-bold text-[15px] uppercase tracking-[0.6px] text-teal">
            Calendar view
          </p>
          <p className="font-body text-[12px] text-text-muted mt-[2px]">
            Every exam date on file, soonest first.
          </p>
        </div>
      </div>

      <div className="mt-6 flex-1">
        {entries.length === 0 && (
          <p className="font-body text-sm text-text-muted text-center mt-10">
            No exam dates yet.
          </p>
        )}

        {entries.map((entry, i) => {
          const isPast = entry.exam_date < todayStr;
          return (
            <div
              key={`${entry.subject_name}-${entry.exam_date}-${i}`}
              className={`flex items-center justify-between bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[12px] mb-[10px] ${
                isPast ? 'opacity-50' : ''
              }`}
            >
              <span className="font-body font-bold text-[13.5px] text-text-primary">
                {entry.subject_name}
              </span>
              <span className="font-body text-xs text-text-muted">
                {formatFullDate(entry.exam_date)}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
