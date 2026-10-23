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

export interface PlanPdfLabels {
  title: string;
  forName: string;
  empty: string;
  done: string;
  pending: string;
  upcoming: string;
  /** Formats "today" / "tomorrow" / "in N days" for the active language. */
  when: (days: number) => string;
  eyebrow: string;
  headline: string;
  cta: string;
  scan: string;
  micro: string;
}

const SHARE_URL = 'https://plan.empowermint.co.za';
const CARD_GRADIENT_TOP = '#F3F8F6';
const CARD_GRADIENT_BOTTOM = '#EEF6F2';
const CARD_BORDER: [number, number, number] = [220, 239, 231];
const EYEBROW_GREEN: [number, number, number] = [31, 138, 111];
const HEADLINE_DARK: [number, number, number] = [26, 26, 26];
const CTA_ORANGE: [number, number, number] = [236, 113, 46];
const QR_CAPTION_GREY: [number, number, number] = [110, 154, 139];
const MICRO_GREY: [number, number, number] = [157, 187, 175];

// jsPDF's standard fonts have no emoji glyphs, so the eyebrow label (supplied
// by the caller) must stay plain text - no emoji, and only Latin-1 letters so
// Afrikaans accents (ê ë ï ô û é è ö ü) render in the built-in Helvetica.

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

function formatExamDate(dateStr: string, intlTag: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(intlTag, {
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

interface TextOpts {
  size: number;
  bold?: boolean;
  color: [number, number, number];
  align?: 'left' | 'right' | 'center';
  charSpace?: number;
}

const RASTER_SCALE = 4;
const RASTER_FONT = "Inter, 'Noto Sans Arabic', 'Noto Sans Devanagari', system-ui, -apple-system, 'Segoe UI', sans-serif";

// jsPDF's built-in fonts have no Arabic or Devanagari glyphs and cannot shape
// them. For those languages each line is drawn by the browser (which shapes
// and orders the text correctly) onto a canvas and placed as a transparent PNG.
function rasterFont(size: number, bold?: boolean) {
  return `${bold ? 700 : 400} ${size * RASTER_SCALE}px ${RASTER_FONT}`;
}

function measureRaster(text: string, size: number, bold: boolean | undefined, rtl: boolean): number {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = rasterFont(size, bold);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  return ctx.measureText(text).width / RASTER_SCALE;
}

function wrapRaster(text: string, maxWidth: number, size: number, bold: boolean | undefined, rtl: boolean): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measureRaster(next, size, bold, rtl) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildPlanPdf({
  dateLabel,
  sessions,
  exams,
  labels,
  intlTag,
  rtl = false,
  raster = false,
}: {
  dateLabel: string;
  sessions: PlanPdfSession[];
  exams: PlanPdfExam[];
  labels: PlanPdfLabels;
  intlTag: string;
  /** Right-to-left layout (Arabic): rows and the footer card are mirrored. */
  rtl?: boolean;
  /** Draw text through the browser so non-Latin scripts render (Arabic, Hindi). */
  raster?: boolean;
}): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 56;
  const contentWidth = pageWidth - marginX * 2;
  let y = 64;

  // Where a row starts / ends in reading order.
  const startX = rtl ? pageWidth - marginX : marginX;
  const endX = rtl ? marginX : pageWidth - marginX;
  const startAlign: 'left' | 'right' = rtl ? 'right' : 'left';
  const endAlign: 'left' | 'right' = rtl ? 'left' : 'right';

  function textWidth(str: string, size: number, bold?: boolean): number {
    if (raster) return measureRaster(str, size, bold, rtl);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.getTextWidth(str);
  }

  function text(str: string, x: number, baseline: number, o: TextOpts) {
    const align = o.align ?? 'left';
    if (!raster) {
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
      doc.setFontSize(o.size);
      doc.setTextColor(...o.color);
      doc.text(str, x, baseline, { align, charSpace: o.charSpace });
      return;
    }
    const w = Math.ceil(measureRaster(str, o.size, o.bold, rtl)) + 4;
    const h = Math.ceil(o.size * 1.7);
    const canvas = document.createElement('canvas');
    canvas.width = w * RASTER_SCALE;
    canvas.height = h * RASTER_SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.font = rasterFont(o.size, o.bold);
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = `rgb(${o.color.join(',')})`;
    const ascent = o.size * 1.2;
    ctx.fillText(str, 2 * RASTER_SCALE, ascent * RASTER_SCALE);
    const left = align === 'right' ? x - w + 2 : align === 'center' ? x - w / 2 : x - 2;
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', left, baseline - ascent, w, h, undefined, 'FAST');
  }

  const logo = await loadImage('/brand/logo-em-power-black.png');
  const logoWidth = 90;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  doc.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
  y += logoHeight + 26;

  text(labels.title, pageWidth / 2, y, { size: 10, bold: true, color: TEAL, align: 'center' });
  y += 20;

  text(labels.forName, pageWidth / 2, y, { size: 18, bold: true, color: [0, 0, 0], align: 'center' });
  y += 18;

  text(dateLabel, pageWidth / 2, y, { size: 11, color: MUTED, align: 'center' });
  y += 26;

  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  if (sessions.length === 0) {
    text(labels.empty, startX, y, { size: 12, color: MUTED, align: startAlign });
    y += 22;
  } else {
    for (const session of sessions) {
      text(session.subject_name, startX, y, { size: 12, color: BODY, align: startAlign });
      text(session.completed ? labels.done : labels.pending, endX, y, {
        size: 12,
        color: session.completed ? TEAL : MUTED,
        align: endAlign,
      });
      y += 22;
    }
  }
  y += 14;

  if (exams.length > 0) {
    doc.setDrawColor(...BORDER);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 24;

    text(labels.upcoming, startX, y, { size: 10, bold: true, color: MUTED, align: startAlign });
    y += 20;

    for (const exam of exams) {
      text(exam.subjectName, startX, y, { size: 12, color: BODY, align: startAlign });
      const whenLabel = `${formatExamDate(exam.examDate, intlTag)} · ${labels.when(exam.daysUntil)}`;
      text(whenLabel, endX, y, { size: 12, color: MUTED, align: endAlign });
      y += 20;
    }
    y += 14;
  }

  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // --- Shared-from-empowermint footer card ---
  // "→" (U+2192) isn't in jsPDF's standard Helvetica encoding - it renders as
  // a broken glyph and throws off width measurement, so the arrow is drawn
  // as a small triangle instead of relying on the character.
  const ctaLabel = labels.cta;
  const ctaArrowW = 8;
  const ctaArrowGap = 6;

  const cardX = marginX;
  const cardW = contentWidth;
  const cardPad = 22;
  const qrSize = 74;
  const colGap = 16;
  const leftColW = cardW - cardPad * 2 - qrSize - colGap;

  const headlineLines = raster
    ? wrapRaster(labels.headline, leftColW, 11.5, true, rtl)
    : (() => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        return doc.splitTextToSize(labels.headline, leftColW) as string[];
      })();
  const headlineLineHeight = 15;

  const ctaTextWidth = textWidth(ctaLabel, 10.5, true);
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

  // Text column anchor: left edge normally, right edge when mirrored.
  const textX = rtl ? cardX + cardW - cardPad : cardX + cardPad;
  let cy = y + cardPad;

  text(labels.eyebrow, textX, cy + eyebrowHeight - 2, {
    size: 9,
    bold: true,
    color: EYEBROW_GREEN,
    align: startAlign,
    // Letter-spacing is a Latin-caps touch; it would break up joined Arabic letters.
    charSpace: raster ? undefined : 0.6,
  });
  cy += eyebrowHeight + 8;

  for (const line of headlineLines) {
    text(line, textX, cy + 10, { size: 11.5, bold: true, color: HEADLINE_DARK, align: startAlign });
    cy += headlineLineHeight;
  }
  cy += 10;

  const ctaX = rtl ? textX - ctaW : textX;
  doc.setFillColor(...CTA_ORANGE);
  doc.roundedRect(ctaX, cy, ctaW, ctaH, ctaH / 2, ctaH / 2, 'F');
  const ctaGroupStartX = ctaX + (ctaW - ctaContentW) / 2;
  const ctaBaselineY = cy + ctaH / 2 + 3.5;
  const arrowMidY = cy + ctaH / 2;
  doc.setFillColor(255, 255, 255);
  if (rtl) {
    // Arrow first, pointing left, then the label.
    const tipX = ctaGroupStartX;
    doc.triangle(tipX + ctaArrowW, arrowMidY - 3.5, tipX + ctaArrowW, arrowMidY + 3.5, tipX, arrowMidY, 'F');
    text(ctaLabel, ctaGroupStartX + ctaArrowW + ctaArrowGap, ctaBaselineY, { size: 10.5, bold: true, color: [255, 255, 255] });
  } else {
    text(ctaLabel, ctaGroupStartX, ctaBaselineY, { size: 10.5, bold: true, color: [255, 255, 255] });
    const arrowX = ctaGroupStartX + ctaTextWidth + ctaArrowGap;
    doc.triangle(arrowX, arrowMidY - 3.5, arrowX, arrowMidY + 3.5, arrowX + ctaArrowW, arrowMidY, 'F');
  }
  doc.link(ctaX, cy, ctaW, ctaH, { url: SHARE_URL });

  const qrX = rtl ? cardX + cardPad : cardX + cardW - cardPad - qrSize;
  const qrY = y + cardPad;
  const qrDataUrl = await QRCode.toDataURL(SHARE_URL, {
    margin: 1,
    width: 300,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
  });
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'MEDIUM');

  text(labels.scan, qrX + qrSize / 2, qrY + qrSize + 12, {
    size: 7.5,
    bold: true,
    color: QR_CAPTION_GREY,
    align: 'center',
    charSpace: raster ? undefined : 0.4,
  });

  text(`${SHARE_URL.replace('https://', '')} · ${labels.micro}`, pageWidth / 2, y + cardH - cardPad + 4, {
    size: 8,
    color: MICRO_GREY,
    align: 'center',
  });

  return doc.output('blob');
}
