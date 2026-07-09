'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-purple"
    >
      Sign out
    </button>
  );
}
