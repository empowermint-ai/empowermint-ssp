'use client';

import { useEffect, useState } from 'react';
import { useInstallPromptState } from '@/lib/installPrompt';
import InstallInstructionsModal from '@/components/InstallInstructionsModal';

const DISMISSED_KEY = 'ssp_install_banner_dismissed';

export default function InstallAppBanner() {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPromptState();
  const [dismissed, setDismissed] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  async function handleAndroidInstall() {
    await promptInstall();
    dismiss();
  }

  if (isStandalone || dismissed || !(canInstall || isIOS)) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 bg-card border-[1.5px] border-card-border rounded-[12px] px-[14px] py-[12px] mt-4">
        <p className="font-body text-[12.5px] text-text-body">
          Keep empowermint one tap away — add it to your home screen.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={canInstall ? handleAndroidInstall : () => setShowModal(true)}
            className="font-body text-xs font-bold text-orange whitespace-nowrap"
          >
            Add
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-text-muted text-[15px] leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>

      {showModal && (
        <InstallInstructionsModal isIOS={isIOS} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
