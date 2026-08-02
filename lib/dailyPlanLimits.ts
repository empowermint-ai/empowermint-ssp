// A realistic daily study budget for a learner - roughly 3 hours of real
// commitment, so the plan stays achievable instead of listing every subject
// regardless of load. Each session is a 25 minute focus block, but the real
// time cost per session also includes a short break, so budget against that
// full slot rather than just the raw focus time.
export const SESSION_MINUTES = 25;
export const SESSION_BREAK_MINUTES = 5;
export const SESSION_SLOT_MINUTES = SESSION_MINUTES + SESSION_BREAK_MINUTES;
export const MAX_DAILY_STUDY_MINUTES = 180;
export const MAX_DAILY_SESSIONS = Math.floor(MAX_DAILY_STUDY_MINUTES / SESSION_SLOT_MINUTES);

// Grade 12 and uni/other learners get a higher daily default in the run-up to
// finals - 1 Aug to 30 Nov inclusive, every year (checked by month only, so
// this never needs updating for a new year). Everyone else keeps the regular
// default at all times. This is a floor: manually added sessions via
// "+ Add another session" are unaffected and can still push the day higher.
export const SEASONAL_MAX_DAILY_SESSIONS = 10;
const SEASONAL_START_MONTH = 7; // August (0-indexed)
const SEASONAL_END_MONTH = 10; // November (0-indexed)

export function getMaxDailySessions(
  studentType: string | null | undefined,
  grade: string | null | undefined,
  today: Date = new Date()
): number {
  const isSeniorSegment = studentType === 'uni' || grade === 'Grade 12';
  if (!isSeniorSegment) return MAX_DAILY_SESSIONS;

  const month = today.getUTCMonth();
  const inSeason = month >= SEASONAL_START_MONTH && month <= SEASONAL_END_MONTH;

  return inSeason ? SEASONAL_MAX_DAILY_SESSIONS : MAX_DAILY_SESSIONS;
}
