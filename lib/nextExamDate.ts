export function nextExamDate(
  examDates: { exam_date: string }[],
  todayStr: string
): string | null {
  const upcoming = examDates.map((d) => d.exam_date).filter((d) => d >= todayStr);
  if (upcoming.length === 0) return null;
  return upcoming.sort()[0];
}
