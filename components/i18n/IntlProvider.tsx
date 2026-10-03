'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { Messages } from '@/lib/i18n/loadMessages';

interface Override {
  locale: string;
  messages: Messages;
}

const OverrideContext = createContext<(next: Override) => void>(() => {});

/** Lets the language picker swap the client-side messages without a server round trip. */
export function useIntlOverride() {
  return useContext(OverrideContext);
}

export default function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: React.ReactNode;
}) {
  const [override, setOverride] = useState<Override | null>(null);

  // When the server tree catches up (after a refresh or navigation) its props are
  // authoritative again.
  useEffect(() => {
    setOverride(null);
  }, [locale]);

  const active = override ?? { locale, messages };

  useEffect(() => {
    document.documentElement.lang = active.locale;
  }, [active.locale]);

  const setter = useMemo(() => (next: Override) => setOverride(next), []);

  return (
    <OverrideContext.Provider value={setter}>
      <NextIntlClientProvider
        locale={active.locale}
        messages={active.messages}
        timeZone="Africa/Johannesburg"
        // Unknown tags must never crash a screen.
        onError={() => {}}
        getMessageFallback={({ namespace, key }) => `${namespace ? namespace + '.' : ''}${key}`}
      >
        {children}
      </NextIntlClientProvider>
    </OverrideContext.Provider>
  );
}
