export type ExamBoardId = 'caps' | 'ieb';

// Labels and helper text live in messages (pastPapers.boards.<id>); only the
// board id and its official URL are data.
export const EXAM_BOARDS: { id: ExamBoardId; url: string }[] = [
  {
    id: 'caps',
    url: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx',
  },
  {
    id: 'ieb',
    url: 'https://www.ieb.co.za/assessment/high-schools/national-senior-certificate/nsc-past-papers',
  },
];
