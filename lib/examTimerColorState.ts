export type ExamTimerColorState = 'green' | 'amber' | 'red';

// Red always wins - for exams under about an hour, the final-30-minutes
// window can begin before the halfway point would have, so a short exam
// should go straight from green to red rather than showing amber for a
// state with more time remaining than the red that follows it.
export function getExamTimerColorState(elapsedSeconds: number, totalSeconds: number): ExamTimerColorState {
  const remaining = totalSeconds - elapsedSeconds;
  if (remaining <= 30 * 60) return 'red';
  if (elapsedSeconds >= totalSeconds / 2) return 'amber';
  return 'green';
}
