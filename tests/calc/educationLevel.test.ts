import { describe, expect, it } from 'vitest';
import { academicYear, calculatorFor, needsAnnualConfirmation } from '@/lib/educationLevel';

describe('calculator routing by education level', () => {
  it('school learners get the scientific calculator', () => {
    for (const g of ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']) {
      expect(calculatorFor('school', g)).toBe('scientific');
      expect(calculatorFor(null, g)).toBe('scientific');
    }
  });
  it('university learners get the financial calculator', () => {
    for (const y of ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate']) {
      expect(calculatorFor('uni', y)).toBe('financial');
      expect(calculatorFor(null, y)).toBe('financial');
    }
  });
  it('the stored student type wins over a stale grade', () => {
    expect(calculatorFor('uni', 'Grade 12')).toBe('financial');
  });
  it('unknown level is null (the learner is asked, never guessed)', () => {
    expect(calculatorFor(null, null)).toBeNull();
    expect(calculatorFor(undefined, '')).toBeNull();
    expect(calculatorFor(null, 'Grade 7')).toBeNull();
  });
});

describe('yearly details confirmation', () => {
  const base = { kind: 'scientific' as const, confirmedYear: null, createdYear: null, deviceConfirmedYear: null, currentYear: 2027 };
  it('is required again in a new academic year (Grade 12 -> first-year catch)', () => {
    expect(needsAnnualConfirmation({ ...base, confirmedYear: 2026 })).toBe(true);
  });
  it('is not required once confirmed this year, in the database or on this device', () => {
    expect(needsAnnualConfirmation({ ...base, confirmedYear: 2027 })).toBe(false);
    expect(needsAnnualConfirmation({ ...base, deviceConfirmedYear: 2027 })).toBe(false);
  });
  it('a learner who signed up this year is not asked straight away', () => {
    expect(needsAnnualConfirmation({ ...base, createdYear: 2027 })).toBe(false);
  });
  it('an old account that never confirmed is asked', () => {
    expect(needsAnnualConfirmation({ ...base, createdYear: 2026 })).toBe(true);
  });
  it('an unknown level is always asked', () => {
    expect(needsAnnualConfirmation({ ...base, kind: null, confirmedYear: 2027 })).toBe(true);
  });
  it('academic year follows South African time at the new-year boundary', () => {
    expect(academicYear(new Date('2026-12-31T21:59:59Z'))).toBe(2026); // 23:59:59 SAST
    expect(academicYear(new Date('2026-12-31T22:00:00Z'))).toBe(2027); // 00:00:00 SAST
  });
});
