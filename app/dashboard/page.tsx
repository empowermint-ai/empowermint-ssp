import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import SignOutButton from '@/components/SignOutButton';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-bg px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-2xl text-navy dark:text-text-primary">
            {profile?.username ? `Welcome back, ${profile.username}!` : 'Dashboard'}
          </h1>
          <SignOutButton />
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <p className="text-text-body text-sm">Signed in as</p>
          <p className="text-text-primary font-medium">{user.email}</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6 mt-4">
          <h2 className="font-heading text-lg text-navy dark:text-text-primary mb-4">
            Change password
          </h2>
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
