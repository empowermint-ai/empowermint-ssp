// Decides how many of today's session slots a subject should get, so a
// learner who is weak in a subject with an exam coming up soon gets focused
// repetition on it instead of a single scattered session like everything
// else. Allocation still happens within the same overall daily time budget -
// this redistributes attention, it does not add extra total study time.
export function sessionsForSubject(confidenceScore: number, daysUntilExam: number): number {
  if (confidenceScore <= 2 && daysUntilExam <= 14) return 3;
  if (confidenceScore <= 3 && daysUntilExam <= 7) return 2;
  return 1;
}

export interface AllocationInput {
  id: string;
  confidenceScore: number;
  daysUntilExam: number;
}

export interface Allocation<T> {
  subject: T;
  count: number;
}

// Walks subjects in priority order, giving each its target session count,
// until the daily budget runs out - the last subject that fits may only get
// a partial allocation rather than bumping a lower-priority subject ahead of it.
export function allocateSessions<T extends AllocationInput>(
  rankedSubjects: T[],
  maxSessions: number
): Allocation<T>[] {
  const allocations: Allocation<T>[] = [];
  let remaining = maxSessions;

  for (const subject of rankedSubjects) {
    if (remaining <= 0) break;
    const target = sessionsForSubject(subject.confidenceScore, subject.daysUntilExam);
    const count = Math.min(target, remaining);
    allocations.push({ subject, count });
    remaining -= count;
  }

  return allocations;
}
