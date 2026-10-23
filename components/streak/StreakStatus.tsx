'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getDir } from '@/config/locales';
import { fetchLatestMilestone, fetchStreak } from '@/lib/streak';
import { detectMoment, loadSeen, saveSeen, type StreakMoment } from '@/lib/streakMoment';
import { buildStreakCard } from '@/lib/streakCard';
import FlameIcon from '@/components/streak/FlameIcon';

const PARTICLES = 7;
const ORDINARY_MS = 2300;
const MILESTONE_MS = 7000;
const FADE_MS = 250;

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 15V3m0 0L8 7m4-4l4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Renders the quiet streak pill (showBadge) and, when a learner's streak has
// gone up since this device last looked, a short acknowledgment toast.
export default function StreakStatus({ userId, showBadge }: { userId: string; showBadge: boolean }) {
  const t = useTranslations('streak');
  const locale = useLocale();
  const [streak, setStreak] = useState(0);
  const [moment, setMoment] = useState<StreakMoment | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [row, milestone] = await Promise.all([fetchStreak(), fetchLatestMilestone(userId)]);
      if (cancelled || !row) return;
      const { moment: found, next } = detectMoment(loadSeen(userId), row.current_streak, milestone, Date.now());
      saveSeen(userId, next);
      setStreak(row.current_streak);
      if (found) setMoment(found);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!moment) return;
    const duration = moment.kind === 'milestone' ? MILESTONE_MS : ORDINARY_MS;
    timers.current.push(setTimeout(() => setLeaving(true), duration));
    timers.current.push(setTimeout(() => setMoment(null), duration + FADE_MS));
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      timers.current = [];
    };
  }, [moment]);

  function dismiss() {
    setLeaving(true);
    timers.current.push(setTimeout(() => setMoment(null), FADE_MS));
  }

  async function share() {
    if (!moment || sharing) return;
    setSharing(true);
    setShareError(false);
    try {
      const blob = await buildStreakCard(
        moment.streak,
        { label: t('cardLabel'), tagline: t('cardTagline') },
        getDir(locale) === 'rtl'
      );
      const file = new File([blob], `study-streak-${moment.streak}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('shareTitle'),
          text: t('shareText', { count: moment.streak }),
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) setShareError(true);
    } finally {
      setSharing(false);
    }
  }

  const isMilestone = moment?.kind === 'milestone';

  return (
    <>
      {showBadge && streak > 0 && (
        <span
          className="inline-flex items-center gap-[3px] font-body text-[11px] font-medium text-orange-text"
          aria-label={t('aria', { count: streak })}
        >
          <FlameIcon size={13} />
          {streak}
        </span>
      )}

      {/* Always mounted so screen readers announce the text. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-5"
        style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
      >
        {moment && (
          <div
            className={`streak-toast soft-raised max-w-sm rounded-full py-[10px] font-body text-[13px] font-medium text-text-primary ${
              isMilestone ? 'pointer-events-auto flex items-center gap-2 pl-4 pr-2' : 'flex items-center gap-2 px-4'
            } ${leaving ? 'streak-toast-out' : ''}`}
          >
            <span className="relative flex h-[18px] w-[18px] items-center justify-center text-orange">
              <FlameIcon size={18} />
              {isMilestone &&
                Array.from({ length: PARTICLES }, (_, i) => {
                  const angle = (i / PARTICLES) * Math.PI * 2;
                  return (
                    <span
                      key={i}
                      className="streak-particle absolute left-1/2 top-1/2 h-[4px] w-[4px] rounded-full bg-orange"
                      style={
                        {
                          '--dx': `${Math.round(Math.cos(angle) * 24)}px`,
                          '--dy': `${Math.round(Math.sin(angle) * 24)}px`,
                        } as React.CSSProperties
                      }
                    />
                  );
                })}
            </span>
            <span>
              {shareError
                ? t('shareError')
                : isMilestone
                  ? t('milestone', { count: moment.streak })
                  : t('toast', { count: moment.streak })}
            </span>
            {isMilestone && (
              <>
                <button
                  type="button"
                  onClick={share}
                  disabled={sharing}
                  aria-label={t('share')}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-teal disabled:opacity-60"
                >
                  <ShareIcon />
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label={t('dismiss')}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted"
                >
                  ×
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
