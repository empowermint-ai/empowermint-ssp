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
        className="neu-raised-accent mt-4 text-text-primary font-heading font-bold text-[13.5px] rounded-neu-lg px-6 py-3"
      >
        Retry
      </button>
    </main>
  );
}
