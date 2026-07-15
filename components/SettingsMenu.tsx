'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useInstallPromptState } from '@/lib/installPrompt';
import InstallInstructionsModal from '@/components/InstallInstructionsModal';

export default function SettingsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPromptState();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function handleInstallClick() {
    setOpen(false);
    if (canInstall) {
      await promptInstall();
    } else {
      setShowInstallModal(true);
    }
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
          <div className="absolute right-0 top-full mt-2 z-20 bg-card border border-card-border rounded-[10px] shadow-lg overflow-hidden min-w-[160px]">
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full text-left font-body text-[13px] text-text-primary px-4 py-3 border-b border-card-border"
              >
                Add to Home Screen
              </button>
            )}
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

      {showInstallModal && (
        <InstallInstructionsModal isIOS={isIOS} onClose={() => setShowInstallModal(false)} />
      )}
    </div>
  );
}
