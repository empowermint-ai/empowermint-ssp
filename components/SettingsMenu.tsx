'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen((v) => !v)}
        className="text-text-primary text-[19px] leading-none p-1"
      >
        ⚙
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-card border border-card-border rounded-[10px] shadow-lg overflow-hidden min-w-[120px]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left font-body text-[13px] text-text-primary px-4 py-3"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
