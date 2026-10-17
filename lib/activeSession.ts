// A timed session (Pomodoro study session or exam mock) that is running right now.
//
// Both timers write their state here so another screen - the calculator's
// focus-session strip - can show the live countdown, and so a learner who
// pops out to the calculator and comes back finds the timer still running.
// It lives in localStorage only: it is per-device, throwaway state.

export type SessionKind = 'study' | 'exam';

export interface ActiveSession {
  kind: SessionKind;
  /** Identifies which session this is: the daily-plan id (study) or "subject:minutes" (exam). */
  ref: string;
  /** The stored (English) subject name; translated when shown. */
  label: string;
  totalSeconds: number;
  /** Start time in ms, moved forward by every pause so (now - startedAt) is time actually run. */
  startedAt: number;
  /** When the current pause began (ms), or null while running. */
  pausedAt: number | null;
  /** Where to send the learner to finish / view the session. */
  returnPath: string;
}

export const ACTIVE_SESSION_KEY = 'ssp_active_session';
/** A finished session older than this is treated as abandoned, not completed. */
export const FINISH_GRACE_SECONDS = 15 * 60;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession, storage: StorageLike | null = defaultStorage()) {
  try {
    storage?.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage blocked: the timer still works on its own screen
  }
}

export function clearActiveSession(storage: StorageLike | null = defaultStorage()) {
  try {
    storage?.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // ignore
  }
}

function isValid(value: unknown): value is ActiveSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    (s.kind === 'study' || s.kind === 'exam') &&
    typeof s.ref === 'string' &&
    typeof s.label === 'string' &&
    typeof s.totalSeconds === 'number' &&
    s.totalSeconds > 0 &&
    typeof s.startedAt === 'number' &&
    (s.pausedAt === null || typeof s.pausedAt === 'number') &&
    typeof s.returnPath === 'string'
  );
}

/** The stored session, or null when there is none, it is corrupt, or it was abandoned. */
export function loadActiveSession(
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage()
): ActiveSession | null {
  try {
    const raw = storage?.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) return null;
    if (remainingSeconds(parsed, now) < -FINISH_GRACE_SECONDS) {
      clearActiveSession(storage);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Seconds left (can go below 0 once finished). Frozen while paused. */
export function remainingSeconds(session: ActiveSession, now: number = Date.now()): number {
  const clock = session.pausedAt ?? now;
  return session.totalSeconds - (clock - session.startedAt) / 1000;
}

export function isFinished(session: ActiveSession, now: number = Date.now()): boolean {
  return remainingSeconds(session, now) <= 0;
}

/** 0..1 share of the session that has elapsed (the gradient bar reveals this much). */
export function elapsedFraction(session: ActiveSession, now: number = Date.now()): number {
  const f = 1 - remainingSeconds(session, now) / session.totalSeconds;
  return Math.min(1, Math.max(0, f));
}

export function pauseSession(session: ActiveSession, now: number = Date.now()): ActiveSession {
  return session.pausedAt === null ? { ...session, pausedAt: now } : session;
}

export function resumeSession(session: ActiveSession, now: number = Date.now()): ActiveSession {
  if (session.pausedAt === null) return session;
  // move the start forward by the length of the pause, so no time is lost or gained
  return { ...session, startedAt: session.startedAt + (now - session.pausedAt), pausedAt: null };
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
