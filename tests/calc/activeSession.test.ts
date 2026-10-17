import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SESSION_KEY,
  ActiveSession,
  FINISH_GRACE_SECONDS,
  clearActiveSession,
  elapsedFraction,
  formatClock,
  isFinished,
  loadActiveSession,
  pauseSession,
  remainingSeconds,
  resumeSession,
  saveActiveSession,
} from '@/lib/activeSession';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
const base: ActiveSession = { kind: 'study', ref: 'plan-1', label: 'Mathematics', totalSeconds: 1500, startedAt: 1_000_000, pausedAt: null, returnPath: '/timer/plan-1' };

describe('active session', () => {
  it('counts down and reports progress', () => {
    expect(remainingSeconds(base, 1_000_000 + 60_000)).toBe(1440);
    expect(elapsedFraction(base, 1_000_000 + 750_000)).toBeCloseTo(0.5, 9);
    expect(elapsedFraction(base, 1_000_000)).toBe(0);
    expect(elapsedFraction(base, 1_000_000 + 9_999_999)).toBe(1);
  });
  it('pause freezes the clock and resume gives the paused time back', () => {
    const paused = pauseSession(base, 1_000_000 + 100_000);
    expect(remainingSeconds(paused, 1_000_000 + 100_000)).toBe(1400);
    expect(remainingSeconds(paused, 1_000_000 + 400_000)).toBe(1400); // still frozen
    const resumed = resumeSession(paused, 1_000_000 + 400_000);
    expect(resumed.pausedAt).toBeNull();
    expect(remainingSeconds(resumed, 1_000_000 + 400_000)).toBe(1400);
    expect(remainingSeconds(resumed, 1_000_000 + 460_000)).toBe(1340);
  });
  it('finishes at zero', () => {
    expect(isFinished(base, 1_000_000 + 1_499_000)).toBe(false);
    expect(isFinished(base, 1_000_000 + 1_500_000)).toBe(true);
  });
  it('saves, loads and clears', () => {
    const st = new MemoryStorage();
    saveActiveSession(base, st);
    expect(loadActiveSession(1_000_000 + 1000, st)).toEqual(base);
    clearActiveSession(st);
    expect(loadActiveSession(1_000_000, st)).toBeNull();
  });
  it('abandoned sessions (finished long ago) are discarded, recently finished ones kept', () => {
    const st = new MemoryStorage();
    saveActiveSession(base, st);
    const endAt = 1_000_000 + 1_500_000;
    expect(loadActiveSession(endAt + 60_000, st)).not.toBeNull();
    expect(loadActiveSession(endAt + (FINISH_GRACE_SECONDS + 1) * 1000, st)).toBeNull();
    expect(st.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
  it('corrupt or missing data never throws', () => {
    const st = new MemoryStorage();
    expect(loadActiveSession(0, st)).toBeNull();
    st.setItem(ACTIVE_SESSION_KEY, '{not json');
    expect(loadActiveSession(0, st)).toBeNull();
    st.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ kind: 'x' }));
    expect(loadActiveSession(0, st)).toBeNull();
    expect(loadActiveSession(0, null)).toBeNull();
  });
  it('formats the clock as MM:SS (and H:MM:SS for exams)', () => {
    expect(formatClock(1458)).toBe('24:18');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(7500)).toBe('2:05:00');
    expect(formatClock(59.2)).toBe('01:00');
  });
});
