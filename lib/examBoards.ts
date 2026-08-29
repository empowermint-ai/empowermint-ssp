export type ExamBoardId = 'caps' | 'ieb';

export const EXAM_BOARDS: { id: ExamBoardId; label: string; helper: string; url: string }[] = [
  {
    id: 'caps',
    label: 'CAPS / NSC Papers',
    helper: 'Department of Basic Education, papers back to 2008.',
    url: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx',
  },
  {
    id: 'ieb',
    label: 'IEB Papers',
    helper: "IEB's own portal, last 5 years.",
    url: 'https://www.ieb.co.za/assessment/high-schools/national-senior-certificate/nsc-past-papers',
  },
];
