import type { CadreItem } from '../types/portal';
import { getAxisMeta } from '../data/basijVisuals';
import { toPersianDigits } from './persian';

interface StoryCardParams {
  universityName: string;
  topTag: string;
  matches: CadreItem[];
}

function drawWrappedRtlText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = testLine;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  lines.forEach((line, i) => {
    ctx.fillText(line, centerX, startY + i * lineHeight);
  });
  return startY + lines.length * lineHeight;
}

/**
 * رندر محلی کارت گرافیکی نتیجه آزمون کانون‌ها (سایز استاندارد استوری ۱۰۸۰×۱۹۲۰ یا پیش‌نمایش)
 * کاملاً آفلاین روی Canvas، مناسب اشتراک‌گذاری در ایتا، بله و تلگرام.
 */
export function renderCadreStoryCard(
  canvas: HTMLCanvasElement,
  { universityName, topTag, matches }: StoryCardParams
): void {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const primary = matches[0];
  const axisMeta = primary ? getAxisMeta(primary.category) : getAxisMeta('علمی');

  // ۱. پس‌زمینه زمردی سینمایی با هاله نورانی
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#04120f');
  bgGrad.addColorStop(0.5, '#09241e');
  bgGrad.addColorStop(1, '#04100d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // هاله رنگی متناسب با محور پیشنهادی
  const glow = ctx.createRadialGradient(W * 0.5, 480, 40, W * 0.5, 480, 560);
  glow.addColorStop(0, `${axisMeta.accent}2e`);
  glow.addColorStop(0.6, 'rgba(222, 177, 84, 0.08)');
  glow.addColorStop(1, 'rgba(4, 18, 15, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ۲. نقش گره‌چینی هندسی ظریف روی پس‌زمینه
  ctx.save();
  ctx.strokeStyle = 'rgba(222, 177, 84, 0.075)';
  ctx.lineWidth = 1.5;
  const cell = 120;
  for (let x = 0; x < W + cell; x += cell) {
    for (let y = 0; y < H + cell; y += cell) {
      ctx.strokeRect(x - 32, y - 32, 64, 64);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-32, -32, 64, 64);
      ctx.restore();
    }
  }
  ctx.restore();

  // ۳. قاب طلایی دوخطه
  ctx.strokeStyle = 'rgba(222, 177, 84, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.strokeStyle = 'rgba(222, 177, 84, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(66, 66, W - 132, H - 132);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  // ۴. سرصفحه
  ctx.fillStyle = '#deb154';
  ctx.font = '700 30px Vazirmatn, sans-serif';
  ctx.fillText('پرتال هوشمند نوورودی‌ها · بسیج دانشجویی', W / 2, 175);

  ctx.fillStyle = '#a6bab4';
  ctx.font = '500 26px Vazirmatn, sans-serif';
  ctx.fillText(universityName, W / 2, 228);

  // خط جداکننده ظریف
  ctx.strokeStyle = 'rgba(222, 177, 84, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 180, 275);
  ctx.lineTo(W / 2 + 180, 275);
  ctx.stroke();

  // ۵. نشان شمسه مرکزی و نتیجه اصلی
  ctx.save();
  ctx.translate(W / 2, 420);
  ctx.fillStyle = 'rgba(222, 177, 84, 0.14)';
  ctx.strokeStyle = axisMeta.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#deb154';
  ctx.lineWidth = 2;
  ctx.strokeRect(-44, -44, 88, 88);
  ctx.restore();

  ctx.fillStyle = axisMeta.accent;
  ctx.font = '700 28px Vazirmatn, sans-serif';
  ctx.fillText(`گرایش مهارتی من: ${topTag}`, W / 2, 565);

  ctx.fillStyle = '#f4f1e8';
  ctx.font = '800 58px Vazirmatn, sans-serif';
  drawWrappedRtlText(
    ctx,
    primary ? primary.name : 'بسیج دانشجویی دانشگاه',
    W / 2,
    655,
    860,
    78,
    2
  );

  if (primary) {
    ctx.fillStyle = '#c9d7d2';
    ctx.font = '500 29px Vazirmatn, sans-serif';
    drawWrappedRtlText(ctx, primary.shortDesc, W / 2, 770, 840, 48, 3);
  }

  // ۶. کارت ۳ کانون پیشنهادی برتر
  ctx.fillStyle = '#deb154';
  ctx.font = '700 28px Vazirmatn, sans-serif';
  ctx.fillText('سه کانون پیشنهادی برای شروع من در دانشگاه', W / 2, 990);

  matches.slice(0, 3).forEach((item, index) => {
    const cardY = 1045 + index * 215;
    const itemMeta = getAxisMeta(item.category);

    // کادر شیشه‌ای
    ctx.fillStyle = 'rgba(11, 31, 28, 0.88)';
    ctx.strokeStyle = index === 0 ? 'rgba(222, 177, 84, 0.6)' : 'rgba(244, 241, 232, 0.16)';
    ctx.lineWidth = index === 0 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(105, cardY, W - 210, 185, 24);
    ctx.fill();
    ctx.stroke();

    // شماره ترتیب
    ctx.fillStyle = itemMeta.accent;
    ctx.font = '700 24px Vazirmatn, sans-serif';
    ctx.fillText(`پیشنهاد ${toPersianDigits(index + 1)} · محور ${item.category}`, W / 2, cardY + 54);

    ctx.fillStyle = '#f4f1e8';
    ctx.font = '800 36px Vazirmatn, sans-serif';
    ctx.fillText(item.name, W / 2, cardY + 106);

    ctx.fillStyle = '#a6bab4';
    ctx.font = '500 23px Vazirmatn, sans-serif';
    const teaser = item.highlights.slice(0, 2).join(' · ');
    drawWrappedRtlText(ctx, teaser, W / 2, cardY + 150, 780, 32, 1);
  });

  // ۷. پاورقی استوری
  ctx.fillStyle = '#a6bab4';
  ctx.font = '500 24px Vazirmatn, sans-serif';
  ctx.fillText('ساختار کانونی قرار قیام ۹ · ۲۵ کانون تخصصی در ۶ محور', W / 2, 1755);

  ctx.fillStyle = '#deb154';
  ctx.font = '700 26px Vazirmatn, sans-serif';
  ctx.fillText('تو هم آزمون انتخاب کانون رو در پرتال نوورودی‌ها امتحان کن', W / 2, 1810);
}
