'use client';

import ErrorRetry from '@/components/ErrorRetry';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorRetry error={error} reset={reset} />;
}
