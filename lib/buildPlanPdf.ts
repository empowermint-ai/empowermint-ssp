import { jsPDF } from 'jspdf';

export interface PlanPdfSession {
  subject_name: string;
  completed: boolean;
}

export interface PlanPdfExam {
  subjectName: string;
  examDate: string;
  daysUntil: number;
}

const TEAL: [number, number, number] = [10, 121, 104];
const MUTED: [number, number, number] = [138, 133, 121];
const BODY: [number, number, number] = [26, 25, 23];
const BORDER: [number, number, number] = [226, 221, 208];

function formatExamDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function buildPlanPdf({
  studentName,
  dateLabel,
  sessions,
  exams,
}: {
  studentName: string;
  dateLabel: string;
  sessions: PlanPdfSession[];
  exams: PlanPdfExam[];
}): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 56;
  const contentWidth = pageWidth - marginX * 2;
  let y = 64;

  const logo = await loadImage('/brand/logo-empowermint-black.png');
  const logoWidth = 130;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  doc.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
  y += logoHeight + 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEAL);
  doc.text("TODAY'S STUDY PLAN", pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(`${studentName}'s plan`, pageWidth / 2, y, { align: 'center' });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(dateLabel, pageWidth / 2, y, { align: 'center' });
  y += 26;

  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  doc.setFontSize(12);
  if (sessions.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('No sessions planned for today yet.', marginX, y);
    y += 22;
  } else {
    for (const session of sessions) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      doc.text(session.subject_name, marginX, y);
      doc.setTextColor(...(session.completed ? TEAL : MUTED));
      doc.text(session.completed ? 'Done' : 'Pending', pageWidth - marginX, y, { align: 'right' });
      y += 22;
    }
  }
  y += 14;

  if (exams.length > 0) {
    doc.setDrawColor(...BORDER);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 24;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('UPCOMING EXAM DATES', marginX, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    for (const exam of exams) {
      doc.setTextColor(...BODY);
      doc.text(exam.subjectName, marginX, y);
      const whenLabel = `${formatExamDate(exam.examDate)} · ${
        exam.daysUntil === 0 ? 'today' : exam.daysUntil === 1 ? 'tomorrow' : `in ${exam.daysUntil} days`
      }`;
      doc.setTextColor(...MUTED);
      doc.text(whenLabel, pageWidth - marginX, y, { align: 'right' });
      y += 20;
    }
    y += 14;
  }

  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Shared from empowermint — ${studentName} owns this plan day to day.`, pageWidth / 2, y, {
    align: 'center',
    maxWidth: contentWidth,
  });
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  const linkText = 'Get your own plan at plan.empowermint.co.za';
  const linkWidth = doc.getTextWidth(linkText);
  const linkX = (pageWidth - linkWidth) / 2;
  doc.textWithLink(linkText, linkX, y, { url: 'https://plan.empowermint.co.za' });
  doc.setDrawColor(...TEAL);
  doc.line(linkX, y + 2, linkX + linkWidth, y + 2);

  return doc.output('blob');
}
