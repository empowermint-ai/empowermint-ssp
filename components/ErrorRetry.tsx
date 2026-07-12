'use client';

export default function ErrorRetry({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-10 text-center">
      <p className="font-body text-[14px] text-text-body">
        Something went wrong. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] px-6 py-3"
      >
        Retry
      </button>
    </main>
  );
}
