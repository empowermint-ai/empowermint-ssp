export interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface MilestoneRow {
  id: string;
  created_at: string;
  milestone: number;
  streak: number;
}

export type StreakMoment =
  | { kind: 'increment'; streak: number }
  | { kind: 'milestone'; streak: number; milestone: number };

// What this device last showed the learner. A drop is stored silently - a lower
// number is simply what the badge shows next time, with no message about it.
export interface SeenStreak {
  streak: number;
  milestoneId: string | null;
}

// A milestone row older than this is treated as already celebrated elsewhere.
const MILESTONE_FRESH_MS = 36 * 60 * 60 * 1000;

// First visit on a device only records a baseline, so nobody is greeted with a
// toast for a streak they built before this device ever saw it.
export function detectMoment(
  seen: SeenStreak | null,
  streak: number,
  milestone: MilestoneRow | null,
  now: number
): { moment: StreakMoment | null; next: SeenStreak } {
  const next: SeenStreak = { streak, milestoneId: milestone?.id ?? seen?.milestoneId ?? null };
  if (!seen) return { moment: null, next };

  const freshMilestone =
    milestone !== null &&
    milestone.id !== seen.milestoneId &&
    now - Date.parse(milestone.created_at) < MILESTONE_FRESH_MS;

  if (freshMilestone) {
    return { moment: { kind: 'milestone', streak, milestone: milestone.milestone }, next };
  }
  if (streak > seen.streak) {
    return { moment: { kind: 'increment', streak }, next };
  }
  return { moment: null, next };
}

const storageKey = (userId: string) => `ssp:streak-seen:${userId}`;

export function loadSeen(userId: string): SeenStreak | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.streak !== 'number') return null;
    return { streak: parsed.streak, milestoneId: typeof parsed.milestoneId === 'string' ? parsed.milestoneId : null };
  } catch {
    return null;
  }
}

export function saveSeen(userId: string, seen: SeenStreak) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    // Storage can be blocked; the worst case is a missed toast.
  }
}
