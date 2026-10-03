type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * "2 hours" / "2 hr 30 min" for a whole number of minutes, in the active
 * language. `t` must be useTranslations('examTimer') (or getTranslations).
 */
export function formatExamDuration(t: Translate, minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? t('durationHours', { hours })
    : t('durationHoursMinutes', { hours, minutes: rest });
}
