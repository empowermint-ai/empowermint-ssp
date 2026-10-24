export const DEFAULT_PUSH_HOUR = 14;
/** The hours a learner can pick for their reminder (local time). */
export const PUSH_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
/** If an hourly run is missed, a reminder still goes out within this many hours. */
const CATCH_UP_HOURS = 3;

export function isValidHour(hour: unknown): hour is number {
  return typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function localHourAndDate(timeZone: string, now: Date): { hour: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { hour: Number(get('hour')), date: `${get('year')}-${get('month')}-${get('day')}` };
}

/** True when the learner's chosen hour has arrived (or just passed) and today's reminder is still unsent. */
export function isDue(
  push: { hour: number; timeZone: string; lastSentOn: string | null },
  now: Date
): boolean {
  const local = localHourAndDate(push.timeZone, now);
  if (push.lastSentOn === local.date) return false;
  return local.hour >= push.hour && local.hour < push.hour + CATCH_UP_HOURS;
}
