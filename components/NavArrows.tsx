'use client';

import { useRouter } from 'next/navigation';

export default function NavArrows({
  dark,
  showForward = true,
}: {
  dark?: boolean;
  showForward?: boolean;
}) {
  const router = useRouter();
  const color = dark ? '#a89e88' : undefined;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.back()}
        className={`text-[19px] leading-none p-1 ${dark ? '' : 'text-text-primary'}`}
        style={color ? { color } : undefined}
      >
        ←
      </button>
      {showForward && (
        <button
          type="button"
          aria-label="Forward"
          onClick={() => router.forward()}
          className={`text-[19px] leading-none p-1 ${dark ? '' : 'text-text-primary'}`}
          style={color ? { color } : undefined}
        >
          →
        </button>
      )}
    </div>
  );
}
