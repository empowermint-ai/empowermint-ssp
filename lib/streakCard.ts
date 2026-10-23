import { FLAME_PATH } from '@/components/streak/FlameIcon';

export interface StreakCardLabels {
  label: string;
  tagline: string;
}

// 9:16, the size Instagram and WhatsApp Status use. Only the number and
// brand are drawn - no name, no comparison.
export async function buildStreakCard(streak: number, labels: StreakCardLabels, rtl: boolean): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  try {
    await Promise.all([document.fonts.load('700 120px Inter'), document.fonts.load('500 40px Inter')]);
  } catch {
    // Falls back to the system font.
  }
  const font = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  ctx.fillStyle = '#F1EFE7';
  ctx.fillRect(0, 0, W, H);

  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';

  // Flame, scaled up from the 24px icon grid.
  const scale = 16;
  ctx.save();
  ctx.translate(W / 2 - 12 * scale, 440);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#F37021';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(FLAME_PATH));
  ctx.restore();

  ctx.fillStyle = '#000000';
  ctx.font = `700 340px ${font}`;
  ctx.fillText(String(streak), W / 2, 1200);

  ctx.fillStyle = '#5A5A5A';
  ctx.font = `500 52px ${font}`;
  ctx.fillText(labels.label, W / 2, 1310);

  ctx.fillStyle = '#0A7968';
  ctx.font = `700 44px ${font}`;
  ctx.fillText(labels.tagline, W / 2, 1470);

  ctx.fillStyle = '#163460';
  ctx.font = `700 56px ${font}`;
  ctx.fillText('empowermint', W / 2, 1700);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  );
}
