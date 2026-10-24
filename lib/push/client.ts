'use client';

import { DEFAULT_PUSH_HOUR } from '@/lib/push/schedule';

export { DEFAULT_PUSH_HOUR };

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
  } catch {
    return 'Africa/Johannesburg';
  }
}

export const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type EnableResult = 'ok' | 'denied' | 'error';

/** Must be called from a tap: iPhones only show the permission prompt after one. */
export async function enableReminders(hour: number): Promise<EnableResult> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      }));

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), hour, timezone: deviceTimezone() }),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function changeReminderHour(hour: number): Promise<boolean> {
  const res = await fetch('/api/push/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hour, timezone: deviceTimezone() }),
  }).catch(() => null);
  return !!res?.ok;
}

export async function disableReminders(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // The server-side removal below is what stops the messages.
  }
  const res = await fetch('/api/push/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: false }),
  }).catch(() => null);
  return !!res?.ok;
}

/** Reminders count as on only if this phone still holds a live subscription. */
export async function fetchReminderSettings(): Promise<{ enabled: boolean; hour: number } | null> {
  const res = await fetch('/api/push/settings').catch(() => null);
  if (!res?.ok) return null;
  const settings: { enabled: boolean; hour: number } = await res.json();
  if (settings.enabled && pushSupported()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!(await registration.pushManager.getSubscription())) settings.enabled = false;
    } catch {
      // keep the server's answer
    }
  }
  return settings;
}
