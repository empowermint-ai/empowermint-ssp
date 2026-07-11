import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import SignOutButton from '@/components/SignOutButton';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import ParentNotifyForm from '@/components/ParentNotifyForm';

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('username, parent_notify_email, parent_notify_confirmed_at')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-bg px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="font-heading text-2xl text-navy dark:text-text-primary"
          >
            ← Account
          </Link>
          <SignOutButton />
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <p className="text-text-body text-sm">Signed in as</p>
          <p className="text-text-primary font-medium">{user.email}</p>
          {profile?.username && (
            <p className="text-text-muted text-xs mt-1">Student: {profile.username}</p>
          )}
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6 mt-4">
          <h2 className="font-heading text-lg text-navy dark:text-text-primary mb-4">
            Change password
          </h2>
          <ChangePasswordForm />
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6 mt-4">
          <ParentNotifyForm
            initialEmail={profile?.parent_notify_email ?? null}
            initialConfirmed={!!profile?.parent_notify_confirmed_at}
          />
        </div>
      </div>
    </main>
  );
}
