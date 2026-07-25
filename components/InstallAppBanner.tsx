'use client';

import { useEffect, useState } from 'react';
import { useInstallPromptState } from '@/lib/installPrompt';
import InstallInstructionsModal from '@/components/InstallInstructionsModal';

const DISMISSED_KEY = 'ssp_install_banner_dismissed';

function AddToHomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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
      <div className="bg-card border-[1.5px] border-card-border rounded-[12px] px-[14px] py-[13px] mt-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex items-center justify-center w-[34px] h-[34px] rounded-[9px] bg-orange/15 text-orange flex-shrink-0"
          >
            <AddToHomeIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-[13px] text-text-primary">
              Add empowermint to your home screen
            </p>
            <p className="font-body text-[11.5px] text-text-muted mt-[2px]">
              So you can jump straight back into your plan, just like any other app.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-text-muted text-[15px] leading-none px-1 flex-shrink-0"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          onClick={canInstall ? handleAndroidInstall : () => setShowModal(true)}
          className="w-full font-heading font-bold text-[12.5px] text-white bg-orange rounded-[8px] py-[9px] mt-[10px]"
        >
          Add to home screen
        </button>
      </div>

      {showModal && (
        <InstallInstructionsModal isIOS={isIOS} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
