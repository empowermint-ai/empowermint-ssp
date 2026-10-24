'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/i18n/ToastProvider';
import { isIOSDevice } from '@/lib/installPrompt';
import { PUSH_HOURS } from '@/lib/push/schedule';
import {
  DEFAULT_PUSH_HOUR,
  changeReminderHour,
  disableReminders,
  enableReminders,
  fetchReminderSettings,
  formatHour,
  pushSupported,
} from '@/lib/push/client';

/** Time picker + on/off for the daily reminder. Opened from Settings. */
export default function ReminderSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('push');
  const { show } = useToast();
  const [entered, setEntered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(DEFAULT_PUSH_HOUR);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supported = pushSupported();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    fetchReminderSettings().then((s) => {
      if (s) {
        setEnabled(s.enabled);
        setHour(s.hour);
      }
      setLoaded(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    const result = await enableReminders(hour);
    setBusy(false);
    if (result === 'ok') {
      show(t('savedToast', { time: formatHour(hour) }));
      onClose();
    } else {
      setMessage(result === 'denied' ? t('blocked') : t('error'));
    }
  }

  async function saveTime() {
    setBusy(true);
    setMessage(null);
    const ok = await changeReminderHour(hour);
    setBusy(false);
    if (ok) {
      show(t('savedToast', { time: formatHour(hour) }));
      onClose();
    } else {
      setMessage(t('error'));
    }
  }

  async function turnOff() {
    setBusy(true);
    await disableReminders();
    setBusy(false);
    show(t('offToast'));
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
        style={{ opacity: entered ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('sheetTitle')}
        className="soft-raised fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] px-[22px] pb-[max(24px,env(safe-area-inset-bottom))] pt-3 transition-transform duration-200"
        style={{ transform: entered ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="mb-3 flex justify-center">
          <span className="h-[4px] w-10 rounded-full bg-line" />
        </div>
        <h2 className="mb-1 font-heading text-[18px] font-semibold text-text-primary">{t('sheetTitle')}</h2>
        <p className="mb-4 font-body text-[12.5px] text-text-muted">{t('cardBody')}</p>

        {!supported ? (
          <p className="font-body text-[13px] text-text-body pb-2">{isIOSDevice() ? t('iosHint') : t('blocked')}</p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 font-body text-[14px] text-text-primary">
              <span>{t('timeLabel')}</span>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="neu-input rounded-neu-sm px-3 py-2 font-body text-[14px] text-text-primary bg-transparent"
              >
                {PUSH_HOURS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </label>

            {message && <p className="mt-3 font-body text-[12.5px] text-error">{message}</p>}

            <button
              type="button"
              disabled={busy || !loaded}
              onClick={enabled ? saveTime : turnOn}
              className="neu-raised-accent mt-5 w-full rounded-full py-[13px] font-heading text-[13.5px] font-bold text-black disabled:opacity-60"
            >
              {enabled ? t('save') : t('enable')}
            </button>
            {enabled && (
              <button
                type="button"
                disabled={busy}
                onClick={turnOff}
                className="neu-raised mt-[10px] w-full rounded-full py-[13px] font-heading text-[13.5px] font-bold text-text-primary disabled:opacity-60"
              >
                {t('turnOff')}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
