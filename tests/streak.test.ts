import { describe, expect, it } from 'vitest';
import { detectMoment, type MilestoneRow } from '@/lib/streakMoment';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const ms = (id: string, milestone: number, h = 1): MilestoneRow => ({
  id,
  milestone,
  streak: milestone,
  created_at: hoursAgo(h),
});

describe('detectMoment', () => {
  it('records a baseline on the first visit without a moment', () => {
    const r = detectMoment(null, 5, ms('a', 3), NOW);
    expect(r.moment).toBeNull();
    expect(r.next).toEqual({ streak: 5, milestoneId: 'a' });
  });

  it('flags an ordinary increment', () => {
    const r = detectMoment({ streak: 4, milestoneId: null }, 5, null, NOW);
    expect(r.moment).toEqual({ kind: 'increment', streak: 5 });
  });

  it('flags a new milestone over an increment', () => {
    const r = detectMoment({ streak: 6, milestoneId: 'a' }, 7, ms('b', 7), NOW);
    expect(r.moment).toEqual({ kind: 'milestone', streak: 7, milestone: 7 });
    expect(r.next.milestoneId).toBe('b');
  });

  it('does not repeat a milestone already seen', () => {
    const r = detectMoment({ streak: 7, milestoneId: 'b' }, 7, ms('b', 7), NOW);
    expect(r.moment).toBeNull();
  });

  it('ignores a stale milestone row', () => {
    const r = detectMoment({ streak: 7, milestoneId: null }, 7, ms('c', 7, 72), NOW);
    expect(r.moment).toBeNull();
    expect(r.next.milestoneId).toBe('c');
  });

  it('stores a drop silently', () => {
    const r = detectMoment({ streak: 9, milestoneId: null }, 1, null, NOW);
    expect(r.moment).toBeNull();
    expect(r.next.streak).toBe(1);
  });
});
