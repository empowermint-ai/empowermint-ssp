import { describe, expect, it } from 'vitest';
import { isDue, localHourAndDate } from '@/lib/push/schedule';
import { buildDailyMessage } from '@/lib/push/dailyMessage';

const at = (iso: string) => new Date(iso);

describe('isDue', () => {
  const push = { hour: 14, timeZone: 'Africa/Johannesburg', lastSentOn: null as string | null };

  it('is not due before the chosen local hour', () => {
    expect(isDue(push, at('2026-10-24T11:30:00Z'))).toBe(false); // 13:30 SAST
  });
  it('is due at the chosen local hour', () => {
    expect(isDue(push, at('2026-10-24T12:00:00Z'))).toBe(true); // 14:00 SAST
  });
  it('still sends if a run was missed, within a short window', () => {
    expect(isDue(push, at('2026-10-24T14:10:00Z'))).toBe(true); // 16:10 SAST
    expect(isDue(push, at('2026-10-24T15:10:00Z'))).toBe(false); // 17:10 SAST
  });
  it('sends only once a day', () => {
    expect(isDue({ ...push, lastSentOn: '2026-10-24' }, at('2026-10-24T12:00:00Z'))).toBe(false);
  });
  it('follows the learner timezone', () => {
    const india = { hour: 14, timeZone: 'Asia/Kolkata', lastSentOn: null };
    expect(localHourAndDate('Asia/Kolkata', at('2026-10-24T08:30:00Z')).hour).toBe(14);
    expect(isDue(india, at('2026-10-24T08:30:00Z'))).toBe(true);
  });
});

describe('buildDailyMessage', () => {
  const base = {
    subjectNames: ['Mathematics', 'Life Sciences', 'Accounting', 'My Custom Subject'],
    nextExam: { subjectName: 'Mathematics', daysUntil: 21 },
    dayNumber: 3,
  };

  it('writes the English message with sessions, minutes, subjects and the exam', async () => {
    const m = await buildDailyMessage({ ...base, locale: 'en' });
    expect(m.body).toBe('4 sessions, about 100 min: Mathematics, Life Sciences, Accounting +1. Mathematics is in 21 days.');
  });

  it.each(['en', 'af', 'zu', 'xh', 'fr', 'ar', 'sw', 'ha', 'hi'])('builds a complete message in %s', async (locale) => {
    const m = await buildDailyMessage({ ...base, locale });
    expect(m.title.length).toBeGreaterThan(5);
    expect(m.body).toContain('100');
    expect(m.body).toContain('21');
    expect(m.body).not.toMatch(/\{|\}/);
    expect(m.lang).toBe(locale);
  });

  it('translates subject names and mirrors Arabic', async () => {
    const m = await buildDailyMessage({ ...base, locale: 'ar' });
    expect(m.dir).toBe('rtl');
    expect(m.body).toContain('الرياضيات');
  });

  it('handles an exam today', async () => {
    const m = await buildDailyMessage({ ...base, locale: 'en', nextExam: { subjectName: 'Mathematics', daysUntil: 0 } });
    expect(m.body).toContain('Mathematics is today.');
  });
});
