'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NAV_HEIGHT } from '@/lib/layout';

const ToastContext = createContext<{ show: (message: string) => void }>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* The live region is always mounted so screen readers announce the text. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-5"
        style={{ bottom: `calc(${NAV_HEIGHT}px + 16px + env(safe-area-inset-bottom))` }}
      >
        {message && (
          <div className="soft-raised max-w-sm rounded-full px-5 py-3 text-center font-body text-[13px] font-medium text-text-primary">
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
