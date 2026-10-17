import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import AnnualDetailsGate from '@/components/calculator/AnnualDetailsGate';
import { academicYear } from '@/lib/educationLevel';

// All text on this screen is rendered in the browser (the calculator can change
// its own language), so this page never calls getTranslations().
export default async function CalculatorPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, confirmed] = await Promise.all([
    supabase
      .from('users')
      .select('student_type, grade, institution, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    // Optional column: until its migration is applied this errors, which just
    // means "no database record" and the device's own record is used instead.
    supabase.from('users').select('details_confirmed_year').eq('id', user.id).maybeSingle(),
  ]);

  const confirmedYear = confirmed.error
    ? null
    : ((confirmed.data as { details_confirmed_year?: number | null } | null)?.details_confirmed_year ?? null);
  const createdYear = profile?.created_at ? academicYear(new Date(profile.created_at)) : null;

  return (
    <AnnualDetailsGate
      profile={{
        userId: user.id,
        studentType: profile?.student_type ?? null,
        grade: profile?.grade ?? null,
        institution: profile?.institution ?? null,
        confirmedYear,
        createdYear,
        currentYear: academicYear(),
      }}
    />
  );
}
