'use client';

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3v12M12 3l-4 4M12 3l4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function InstallInstructionsModal({
  isIOS,
  onClose,
}: {
  isIOS: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-[22px] pb-[22px] sm:pb-0">
      <div
        className="w-full max-w-[360px] bg-card border-[1.5px] border-card-border rounded-[14px] px-[20px] py-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-heading font-bold text-[16px] text-text-primary">
          Keep empowermint one tap away
        </p>

        {isIOS ? (
          <div className="mt-3 space-y-2">
            <p className="font-body text-[13.5px] text-text-body flex items-center gap-2">
              <span className="text-teal flex-shrink-0">
                <ShareIcon />
              </span>
              Tap the Share icon in Safari&apos;s toolbar.
            </p>
            <p className="font-body text-[13.5px] text-text-body">
              Then scroll down and tap <span className="font-bold">Add to Home Screen</span>.
            </p>
          </div>
        ) : (
          <p className="font-body text-[13.5px] text-text-body mt-3">
            Look for <span className="font-bold">Add to Home Screen</span> or{' '}
            <span className="font-bold">Install App</span> in your browser&apos;s menu.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full font-heading font-bold text-[13.5px] text-white bg-orange rounded-[10px] py-[13px] mt-5"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
