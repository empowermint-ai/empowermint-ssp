// Which calculator a learner gets, from their stored profile.
//   university learners -> Financial calculator
//   school learners (Grade 8-12) -> Scientific calculator
// Returns null when the profile does not say (older accounts) - the caller then
// asks the learner to confirm their details first instead of guessing.

export type CalculatorKind = 'scientific' | 'financial';

const UNI_YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'];

export function calculatorFor(
  studentType: string | null | undefined,
  grade: string | null | undefined
): CalculatorKind | null {
  if (studentType === 'uni') return 'financial';
  if (studentType === 'school') return 'scientific';
  if (grade && UNI_YEARS.includes(grade)) return 'financial';
  if (grade && /^Grade (8|9|10|11|12)$/.test(grade)) return 'scientific';
  return null;
}

/** Academic year in South Africa = the calendar year (Jan-Dec), in local time. */
export function academicYear(now: Date = new Date()): number {
  const year = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', year: 'numeric' }).format(now);
  return Number(year);
}

/**
 * Should the learner be asked to confirm / update their details before a gated
 * feature loads? Yes when their level is unknown, or when the last confirmation
 * (or sign-up) was in an earlier academic year.
 */
export function needsAnnualConfirmation(args: {
  kind: CalculatorKind | null;
  confirmedYear: number | null;
  createdYear: number | null;
  deviceConfirmedYear: number | null;
  currentYear: number;
}): boolean {
  if (args.kind === null) return true;
  const last = Math.max(args.confirmedYear ?? 0, args.deviceConfirmedYear ?? 0, args.createdYear ?? 0);
  return last < args.currentYear;
}
