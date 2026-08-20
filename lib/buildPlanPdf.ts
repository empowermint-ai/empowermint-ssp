import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

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

const SHARE_URL = 'https://plan.empowermint.co.za';
const CARD_GRADIENT_TOP = '#F3F8F6';
const CARD_GRADIENT_BOTTOM = '#EEF6F2';
const CARD_BORDER: [number, number, number] = [220, 239, 231];
const EYEBROW_GREEN: [number, number, number] = [31, 138, 111];
const HEADLINE_DARK: [number, number, number] = [26, 26, 26];
const CTA_ORANGE: [number, number, number] = [236, 113, 46];
const QR_CAPTION_GREY: [number, number, number] = [110, 154, 139];
const MICRO_GREY: [number, number, number] = [157, 187, 175];

// jsPDF's standard fonts have no emoji glyphs, so a raw handshake emoji in the
// eyebrow line would render as a blank box in the actual PDF - drop it there
// rather than ship a broken glyph.
const EYEBROW_LABEL = 'SHARED FROM EMPOWERMINT';

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// jsPDF has no simple gradient-fill primitive, so the card background is
// rendered on an offscreen canvas (crisp rounded corners + a real linear
// gradient) and embedded as an image; every other footer element is drawn as
// normal vector jsPDF content on top of it, so text and the link/QR stay crisp.
// Passing jsPDF a canvas element directly makes it re-rasterize the pixels
// essentially uncompressed (megabytes for one small graphic) - exporting a
// PNG data URL first and handing jsPDF that string keeps the real PNG
// compression, matching how the QR code image stays a few KB.
function renderGradientCard(w: number, h: number, radius: number): string {
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, radius);
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, CARD_GRADIENT_TOP);
  gradient.addColorStop(1, CARD_GRADIENT_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgb(${CARD_BORDER.join(',')})`;
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

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

  const logo = await loadImage('/brand/logo-em-power-black.png');
  const logoWidth = 90;
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
  doc.text(`for ${studentName}`, pageWidth / 2, y, { align: 'center' });
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

  // --- Shared-from-empowermint footer card ---
  const firstName = studentName.split(' ')[0];
  const headline = `${firstName} is staying on top of their studies with this smart study planner. Give it a go.`;
  // "→" (U+2192) isn't in jsPDF's standard Helvetica encoding - it renders as
  // a broken glyph and throws off width measurement, so the arrow is drawn
  // as a small triangle instead of relying on the character.
  const ctaLabel = 'Get started free';
  const ctaArrowW = 8;
  const ctaArrowGap = 6;

  const cardX = marginX;
  const cardW = contentWidth;
  const cardPad = 22;
  const qrSize = 74;
  const colGap = 16;
  const leftColW = cardW - cardPad * 2 - qrSize - colGap;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  const headlineLines = doc.splitTextToSize(headline, leftColW) as string[];
  const headlineLineHeight = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const ctaTextWidth = doc.getTextWidth(ctaLabel);
  const ctaContentW = ctaTextWidth + ctaArrowGap + ctaArrowW;
  const ctaPadX = 16;
  const ctaW = ctaContentW + ctaPadX * 2;
  const ctaH = 26;

  const eyebrowHeight = 10;
  const leftColHeight =
    eyebrowHeight + 8 + headlineLines.length * headlineLineHeight + 10 + ctaH;
  const rightColHeight = qrSize + 8 + 10;
  const contentHeight = Math.max(leftColHeight, rightColHeight);
  const microFooterGap = 16;
  const cardH = cardPad + contentHeight + microFooterGap + 10 + cardPad;

  const cardBg = renderGradientCard(cardW, cardH, 16);
  doc.addImage(cardBg, 'PNG', cardX, y, cardW, cardH, undefined, 'MEDIUM');

  const contentX = cardX + cardPad;
  let cy = y + cardPad;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...EYEBROW_GREEN);
  doc.text(EYEBROW_LABEL, contentX, cy + eyebrowHeight - 2, { charSpace: 0.6 });
  cy += eyebrowHeight + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...HEADLINE_DARK);
  for (const line of headlineLines) {
    doc.text(line, contentX, cy + 10);
    cy += headlineLineHeight;
  }
  cy += 10;

  doc.setFillColor(...CTA_ORANGE);
  doc.roundedRect(contentX, cy, ctaW, ctaH, ctaH / 2, ctaH / 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  const ctaGroupStartX = contentX + (ctaW - ctaContentW) / 2;
  const ctaBaselineY = cy + ctaH / 2 + 3.5;
  doc.text(ctaLabel, ctaGroupStartX, ctaBaselineY);
  const arrowX = ctaGroupStartX + ctaTextWidth + ctaArrowGap;
  const arrowMidY = cy + ctaH / 2;
  doc.setFillColor(255, 255, 255);
  doc.triangle(
    arrowX,
    arrowMidY - 3.5,
    arrowX,
    arrowMidY + 3.5,
    arrowX + ctaArrowW,
    arrowMidY,
    'F'
  );
  doc.link(contentX, cy, ctaW, ctaH, { url: SHARE_URL });

  const qrX = cardX + cardW - cardPad - qrSize;
  const qrY = y + cardPad;
  const qrDataUrl = await QRCode.toDataURL(SHARE_URL, {
    margin: 1,
    width: 300,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
  });
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'MEDIUM');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...QR_CAPTION_GREY);
  doc.text('SCAN TO START', qrX + qrSize / 2, qrY + qrSize + 12, {
    align: 'center',
    charSpace: 0.4,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MICRO_GREY);
  doc.text(`${SHARE_URL.replace('https://', '')} · no card required`, pageWidth / 2, y + cardH - cardPad + 4, {
    align: 'center',
  });

  return doc.output('blob');
}
