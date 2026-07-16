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
