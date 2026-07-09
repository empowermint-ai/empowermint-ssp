import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import SignOutButton from '@/components/SignOutButton';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-2xl text-navy">Dashboard</h1>
          <SignOutButton />
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <p className="text-text-body text-sm">Signed in as</p>
          <p className="text-text-primary font-medium">{session.user.email}</p>
        </div>
      </div>
    </main>
  );
}
