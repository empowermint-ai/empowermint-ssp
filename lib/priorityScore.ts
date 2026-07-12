export function daysWeight(examDate: string, targetDate: string): number {
  const exam = new Date(`${examDate}T00:00:00Z`).getTime();
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const days = Math.round((exam - target) / 86_400_000);
  if (days < 0) return 1;
  if (days > 14) return 1;
  if (days >= 8) return 2;
  if (days >= 4) return 3;
  return 4;
}

export function priorityScore(
  confidenceScore: number | null,
  examDate: string | null,
  targetDate: string
): number {
  const confidence = confidenceScore ?? 3;
  const weight = examDate ? daysWeight(examDate, targetDate) : 1;
  return (6 - confidence) * weight;
}
