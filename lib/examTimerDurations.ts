export const EXAM_TIMER_DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1 hr 30 min' },
  { minutes: 120, label: '2 hours' },
  { minutes: 150, label: '2 hr 30 min' },
  { minutes: 180, label: '3 hours' },
  { minutes: 210, label: '3 hr 30 min' },
  { minutes: 240, label: '4 hours' },
  { minutes: 270, label: '4 hr 30 min' },
  { minutes: 300, label: '5 hours' },
];

export function examTimerDurationLabel(minutes: number): string {
  return EXAM_TIMER_DURATIONS.find((d) => d.minutes === minutes)?.label ?? `${minutes} min`;
}
