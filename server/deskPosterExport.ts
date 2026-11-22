import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { escapeHtml } from './breakfastReportExport';
import { BASIJ_OFFICIAL_INFO, HEYAT_OFFICIAL_INFO } from '../src/data/orientation';
import { toPersianDigits } from '../src/utils/persian';

export interface DeskPosterOptions {
  siteUrl: string;
  siteTitle: string;
  universityName: string;
  basijLogoUrl: string;
  heyatLogoUrl: string;
  uploadsDir?: string;
  generatedAtLabel: string;
  autoPrint?: boolean;
}

let cachedFontBase64: string | null = null;

function loadLocalVazirmatnBase64(): string {
  if (cachedFontBase64 !== null) return cachedFontBase64;
  try {
    const fontPath = path.resolve(
      process.cwd(),
      'node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2'
    );
    if (fs.existsSync(fontPath)) {
      cachedFontBase64 = fs.readFileSync(fontPath).toString('base64');
      return cachedFontBase64;
    }
  } catch {
    // fallback to system Persian fonts if font file unavailable
  }
  cachedFontBase64 = '';
  return '';
}

function loadLocalLogoDataUri(urlPath: string, uploadsDir?: string): string {
  if (!urlPath) return '';
  try {
    let filePath = '';
    if (urlPath.startsWith('/assets/')) {
      filePath = path.resolve(process.cwd(), 'public', urlPath.slice(1));
    } else if (urlPath.startsWith('/uploads/') && uploadsDir) {
      filePath = path.resolve(uploadsDir, path.basename(urlPath));
    }
    if (!filePath || !fs.existsSync(filePath)) return '';
    const stat = fs.statSync(filePath);
    if (stat.size > 450_000) return '';
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.svg'
        ? 'image/svg+xml'
        : '';
    if (!mime) return '';
    return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
  } catch {
    return '';
  }
}

/**
 * نرمال‌سازی و اعتبارسنجی آدرس سایت برای قرارگیری امن درون QR و لینک‌های پوستر
 */
export function normalizePosterSiteUrl(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 'https://gonabad.ac.ir';
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'https://gonabad.ac.ir';
    }
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
  } catch {
    return 'https://gonabad.ac.ir';
  }
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

/**
 * تولید فایل HTML تک‌فایله، کاملاً آفلاین و آماده چاپ (پوستر A4 دیواری + برگه ۴ تراکت برش‌دار)
 * بدون هیچ وابستگی به CDN خارجی (فونت وزیرمتن، لوگوها و QR وکتور SVG همگی داخلی هستند)
 */
export async function buildDeskPromoPosterHtml(options: DeskPosterOptions): Promise<string> {
  const portalUrl = normalizePosterSiteUrl(options.siteUrl);
  const couponUrl = `${portalUrl}/coupon`;
  const displayPortal = stripProtocol(portalUrl);
  const displayCoupon = stripProtocol(couponUrl);

  const [couponQrSvg, portalQrSvg, miniCouponQrSvg] = await Promise.all([
    QRCode.toString(couponUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#061a16', light: '#ffffff' },
    }),
    QRCode.toString(portalUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#061a16', light: '#ffffff' },
    }),
    QRCode.toString(couponUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#061a16', light: '#ffffff' },
    }),
  ]);

  const fontB64 = loadLocalVazirmatnBase64();
  const basijLogo = loadLocalLogoDataUri(
    options.basijLogoUrl || BASIJ_OFFICIAL_INFO.logoUrl || '/assets/basij-logo-official.png',
    options.uploadsDir
  );
  const heyatLogo = loadLocalLogoDataUri(
    options.heyatLogoUrl || '/assets/heyat-logo-official.png',
    options.uploadsDir
  );

  const fontFaceCss = fontB64
    ? `@font-face {
  font-family: "Vazirmatn";
  src: url("data:font/woff2;base64,${fontB64}") format("woff2-variations"),
       url("data:font/woff2;base64,${fontB64}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`
    : '';

  const logoBadgeHtml = (src: string, alt: string, fallback: string, size = 56) =>
    src
      ? `<div class="logo-ring" style="width:${size}px;height:${size}px;"><img src="${src}" alt="${escapeHtml(
          alt
        )}" /></div>`
      : `<div class="logo-ring logo-fallback" style="width:${size}px;height:${size}px;">${escapeHtml(
          fallback
        )}</div>`;

  const miniFlyerHtml = (index: number) => `
    <div class="flyer-card">
      <div class="flyer-top">
        <div class="flyer-logos">
          ${logoBadgeHtml(basijLogo, 'بسیج دانشجویی', 'بسیج', 34)}
          ${logoBadgeHtml(heyatLogo, 'هیئت محبان‌الحسین', 'هیئت', 34)}
        </div>
        <div class="flyer-brand">
          <div class="flyer-eyebrow">${escapeHtml(options.universityName)}</div>
          <div class="flyer-title">خوش آمدی ورودی ${toPersianDigits(1405)}!</div>
        </div>
      </div>

      <div class="flyer-headline">
        صبحانه گرم مهمان ما باش + راهنمای کامل روز ثبت‌نام
      </div>

      <div class="flyer-body">
        <div class="flyer-qr-box">
          <div class="qr-svg-wrap mini-qr">${miniCouponQrSvg}</div>
          <div class="qr-caption-mini">اسکن برای دریافت ژتون صبحانه</div>
        </div>
        <div class="flyer-steps">
          <div class="mini-step">
            <span class="mini-num">۱</span>
            <span>شماره دانشجویی <strong>۴۰۵</strong> را در <strong>میز استقبال لابی</strong> اعلام کن تا تایید شود.</span>
          </div>
          <div class="mini-step">
            <span class="mini-num">۲</span>
            <span>QR را اسکن کن ← کدت <strong>سبز</strong> می‌شود و فرم کوتاه را پر کن.</span>
          </div>
          <div class="mini-step">
            <span class="mini-num">۳</span>
            <span>کارت دیجیتال صبحانه همان لحظه روی گوشی‌ات ذخیره می‌شود!</span>
          </div>
          <div class="mini-perks">
            چک‌لیست ۱۳ گام · خوابگاه‌ها · نقشه دانشگاه · ۲۵ کانون بسیج · هیئت محبان‌الحسین (ع)
          </div>
        </div>
      </div>

      <div class="flyer-foot">
        <div class="flyer-url" dir="ltr">${escapeHtml(displayCoupon)}</div>
        <div class="flyer-handles" dir="ltr">
          <span>${escapeHtml(BASIJ_OFFICIAL_INFO.telegramHandle)}</span>
          <span>·</span>
          <span>${escapeHtml(HEYAT_OFFICIAL_INFO.telegramHandle)}</span>
        </div>
      </div>
      <span class="cut-tag" aria-hidden="true">تراکت ${toPersianDigits(index)} از ۴</span>
    </div>
  `;

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>پوستر و تراکت قابل چاپ پرتال نوورودی‌ها و ژتون صبحانه | ${escapeHtml(options.universityName)}</title>
  <style>
    ${fontFaceCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg-deep: #051612;
      --bg-card: #0a241e;
      --gold: #deb154;
      --gold-bright: #f4ce77;
      --emerald: #10b981;
      --ink-light: #f6f2e9;
      --ink-muted: #b8ccc5;
    }
    html, body {
      font-family: "Vazirmatn", Tahoma, sans-serif;
      background: #0d1614;
      color: var(--ink-light);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* نوار ابزار شناور مخصوص صفحه نمایش (در چاپ مخفی می‌شود) */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(6, 22, 18, 0.96);
      border-bottom: 1px solid rgba(222, 177, 84, 0.35);
      padding: 12px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      backdrop-filter: blur(8px);
    }
    .toolbar-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--gold-bright);
    }
    .toolbar-sub {
      font-size: 11px;
      color: var(--ink-muted);
      margin-top: 2px;
    }
    .toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .btn {
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 9px 14px;
      border-radius: 10px;
      border: 1px solid rgba(222, 177, 84, 0.35);
      background: rgba(255,255,255,0.06);
      color: var(--ink-light);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover { border-color: var(--gold); }
    .btn.active {
      background: rgba(222, 177, 84, 0.2);
      border-color: var(--gold);
      color: var(--gold-bright);
    }
    .btn-primary {
      background: linear-gradient(135deg, #deb154, #f0c96f);
      color: #061814;
      border: none;
      padding: 10px 18px;
      font-weight: 900;
      box-shadow: 0 6px 20px rgba(222, 177, 84, 0.25);
    }

    .sheets-container {
      padding: 24px 12px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }

    /* ورق استاندارد A4 */
    .a4-sheet {
      width: 210mm;
      height: 297mm;
      background: radial-gradient(circle at 18% 12%, #123e33 0%, #071e19 45%, #04110e 100%);
      position: relative;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
    }
    .a4-sheet.hidden-sheet { display: none !important; }

    /* الگوی گره‌چینی طلایی پس‌زمینه */
    .lattice-bg {
      position: absolute;
      inset: 0;
      opacity: 0.09;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cpath d='M32 4 L60 32 L32 60 L4 32 Z' fill='none' stroke='%23deb154' stroke-width='0.9'/%3E%3Cpath d='M32 14 L50 32 L32 50 L14 32 Z' fill='none' stroke='%23deb154' stroke-width='0.6'/%3E%3Ccircle cx='32' cy='32' r='3' fill='none' stroke='%23deb154' stroke-width='0.7'/%3E%3C/svg%3E");
      background-size: 64px 64px;
    }
    .poster-frame {
      position: relative;
      z-index: 2;
      flex: 1;
      margin: 9mm;
      border: 2px solid rgba(222, 177, 84, 0.65);
      border-radius: 18px;
      padding: 8mm 9mm 7mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, rgba(10,36,30,0.45) 0%, rgba(4,17,14,0.72) 100%);
    }
    .poster-frame::before {
      content: "";
      position: absolute;
      inset: 5px;
      border: 1px dashed rgba(222, 177, 84, 0.28);
      border-radius: 14px;
      pointer-events: none;
    }

    .logo-ring {
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid var(--gold);
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }
    .logo-ring img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .logo-fallback {
      background: #0c352b;
      color: var(--gold-bright);
      font-size: 11px;
      font-weight: 800;
    }

    /* سرصفحه پوستر */
    .poster-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(222, 177, 84, 0.25);
      padding-bottom: 5mm;
    }
    .header-center {
      text-align: center;
      flex: 1;
    }
    .bismillah {
      font-size: 11px;
      color: var(--gold-bright);
      font-weight: 700;
      margin-bottom: 3px;
    }
    .uni-title {
      font-size: 15px;
      font-weight: 900;
      color: #ffffff;
    }
    .org-sub {
      font-size: 11px;
      color: var(--ink-muted);
      margin-top: 2px;
    }

    /* تیتر اصلی WOW */
    .hero-block {
      text-align: center;
      padding: 4.5mm 0 3.5mm;
    }
    .welcome-pill {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.16);
      border: 1px solid rgba(16, 185, 129, 0.5);
      color: #6ee7b7;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 3mm;
    }
    .hero-h1 {
      font-size: 30px;
      font-weight: 900;
      line-height: 1.3;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .hero-h1 span {
      color: var(--gold-bright);
    }
    .hero-lead {
      font-size: 13px;
      color: #dce9e4;
      margin-top: 2.5mm;
      line-height: 1.7;
    }

    /* بخش دوتایی کدهای QR درشت */
    .qr-grid {
      display: grid;
      grid-template-columns: 1.12fr 0.88fr;
      gap: 6mm;
      margin: 2.5mm 0 4mm;
    }
    .qr-panel {
      border-radius: 16px;
      padding: 5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
    }
    .qr-panel.primary {
      background: linear-gradient(155deg, rgba(222, 177, 84, 0.22), rgba(16, 185, 129, 0.14));
      border: 2px solid var(--gold);
    }
    .qr-panel.secondary {
      background: rgba(255, 255, 255, 0.045);
      border: 1.5px solid rgba(222, 177, 84, 0.4);
    }
    .qr-tag {
      font-size: 11px;
      font-weight: 900;
      padding: 3px 12px;
      border-radius: 999px;
      margin-bottom: 2.5mm;
    }
    .qr-panel.primary .qr-tag {
      background: var(--gold);
      color: #061814;
    }
    .qr-panel.secondary .qr-tag {
      background: rgba(16, 185, 129, 0.22);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .qr-title {
      font-size: 16px;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 3mm;
    }
    .qr-white-frame {
      background: #ffffff;
      padding: 3.5mm;
      border-radius: 14px;
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.38);
      border: 2px solid rgba(222, 177, 84, 0.8);
    }
    .qr-svg-wrap svg {
      display: block;
      width: 44mm;
      height: 44mm;
    }
    .qr-panel.secondary .qr-svg-wrap svg {
      width: 39mm;
      height: 39mm;
    }
    .qr-url {
      margin-top: 2.5mm;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--gold-bright);
      background: rgba(0, 0, 0, 0.35);
      padding: 3px 10px;
      border-radius: 8px;
      word-break: break-all;
    }
    .qr-desc {
      margin-top: 2mm;
      font-size: 11px;
      color: var(--ink-muted);
      line-height: 1.55;
    }

    /* ۳ قدم دریافت ژتون */
    .steps-box {
      background: rgba(6, 24, 20, 0.85);
      border: 1px solid rgba(16, 185, 129, 0.38);
      border-radius: 14px;
      padding: 4.5mm 5mm;
      margin-bottom: 3.5mm;
    }
    .section-label {
      font-size: 13px;
      font-weight: 900;
      color: var(--gold-bright);
      margin-bottom: 3mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-label small {
      font-size: 10.5px;
      color: #6ee7b7;
      font-weight: 700;
    }
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3.5mm;
    }
    .step-item {
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 3.5mm;
    }
    .step-badge {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: var(--gold);
      color: #061814;
      font-size: 13px;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2mm;
    }
    .step-item h4 {
      font-size: 12.5px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 1.5mm;
    }
    .step-item p {
      font-size: 10.8px;
      color: var(--ink-muted);
      line-height: 1.55;
    }

    /* سایر امکانات پرتال */
    .perks-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2.8mm;
      margin-bottom: 3.5mm;
    }
    .perk-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(222, 177, 84, 0.25);
      border-radius: 10px;
      padding: 2.8mm 3.5mm;
    }
    .perk-card strong {
      display: block;
      font-size: 11.5px;
      color: var(--gold-bright);
      margin-bottom: 1mm;
    }
    .perk-card span {
      font-size: 10.2px;
      color: var(--ink-muted);
      line-height: 1.45;
      display: block;
    }

    /* فوتر پوستر */
    .poster-footer {
      border-top: 1px solid rgba(222, 177, 84, 0.3);
      padding-top: 3.5mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 10.5px;
    }
    .handles-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .handle-chip {
      background: rgba(222, 177, 84, 0.14);
      border: 1px solid rgba(222, 177, 84, 0.35);
      color: #ffffff;
      padding: 3px 9px;
      border-radius: 8px;
      font-weight: 700;
    }
    .handle-chip b {
      color: var(--gold-bright);
      margin-right: 4px;
    }

    /* صفحه ۲: برگه ۴ تراکت برش‌دار روی یک A4 */
    .flyers-sheet {
      background: #ffffff;
      color: #061814;
      padding: 6mm;
    }
    .flyers-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 0;
      border: 1px dashed #64748b;
    }
    .flyer-card {
      position: relative;
      border: 1px dashed #64748b;
      padding: 4.5mm;
      background: linear-gradient(160deg, #061b16 0%, #0b2d25 58%, #061915 100%);
      color: #f6f2e9;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .flyer-top {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(222, 177, 84, 0.3);
      padding-bottom: 3mm;
    }
    .flyer-logos {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .flyer-eyebrow {
      font-size: 9px;
      color: var(--gold-bright);
      font-weight: 700;
    }
    .flyer-title {
      font-size: 14px;
      font-weight: 900;
      color: #ffffff;
    }
    .flyer-headline {
      font-size: 12px;
      font-weight: 800;
      color: #6ee7b7;
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.38);
      border-radius: 8px;
      padding: 2.2mm 3mm;
      text-align: center;
      margin: 2.5mm 0;
    }
    .flyer-body {
      display: grid;
      grid-template-columns: 36mm 1fr;
      gap: 3.5mm;
      align-items: center;
      flex: 1;
    }
    .flyer-qr-box {
      background: #ffffff;
      border-radius: 10px;
      padding: 2.5mm;
      border: 2px solid var(--gold);
      text-align: center;
    }
    .mini-qr svg {
      width: 29mm !important;
      height: 29mm !important;
      margin: 0 auto;
    }
    .qr-caption-mini {
      font-size: 8.5px;
      font-weight: 800;
      color: #061814;
      margin-top: 1.5mm;
    }
    .flyer-steps {
      display: flex;
      flex-direction: column;
      gap: 2mm;
    }
    .mini-step {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      font-size: 9.8px;
      line-height: 1.48;
      color: #e6f0ec;
    }
    .mini-num {
      width: 16px;
      height: 16px;
      border-radius: 5px;
      background: var(--gold);
      color: #061814;
      font-size: 10px;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .mini-perks {
      margin-top: 1mm;
      padding-top: 2mm;
      border-top: 1px solid rgba(222, 177, 84, 0.25);
      font-size: 8.8px;
      color: var(--gold-bright);
      font-weight: 700;
      line-height: 1.5;
    }
    .flyer-foot {
      margin-top: 2.5mm;
      padding-top: 2.2mm;
      border-top: 1px solid rgba(222, 177, 84, 0.28);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 8.5px;
    }
    .flyer-url {
      color: var(--gold-bright);
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 55%;
    }
    .flyer-handles {
      color: var(--ink-muted);
      display: flex;
      gap: 4px;
      font-weight: 700;
    }
    .cut-tag {
      position: absolute;
      top: 4px;
      left: 6px;
      font-size: 8px;
      color: rgba(255,255,255,0.45);
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      body { background: #ffffff !important; }
      .toolbar { display: none !important; }
      .sheets-container { padding: 0 !important; gap: 0 !important; }
      .a4-sheet {
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always;
        break-after: page;
      }
      .a4-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <div class="toolbar-title">پکیج چاپی پرتال نوورودی‌ها و ژتون صبحانه (${escapeHtml(options.universityName)})</div>
      <div class="toolbar-sub">تاریخ صدور: ${escapeHtml(options.generatedAtLabel)} · شامل پوستر دیواری A4 + برگه ۴ تراکت برش‌دار برای پخش دستی</div>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn active" id="mode-both" onclick="setMode('both')">هر دو صفحه</button>
      <button type="button" class="btn" id="mode-poster" onclick="setMode('poster')">فقط پوستر A4</button>
      <button type="button" class="btn" id="mode-flyers" onclick="setMode('flyers')">فقط ۴ تراکت برش‌دار</button>
      <button type="button" class="btn btn-primary" onclick="window.print()">چاپ یا ذخیره PDF</button>
    </div>
  </div>

  <div class="sheets-container">
    <!-- صفحه ۱: پوستر رسمی A4 دیواری و رومیزی -->
    <section class="a4-sheet" id="sheet-poster" aria-label="پوستر دیواری A4">
      <div class="lattice-bg"></div>
      <div class="poster-frame">
        <header class="poster-header">
          ${logoBadgeHtml(basijLogo, 'لوگوی بسیج دانشجویی', 'بسیج', 58)}
          <div class="header-center">
            <div class="bismillah">بسم‌الله‌الرحمن‌الرحیم</div>
            <div class="uni-title">${escapeHtml(options.siteTitle)} · ${escapeHtml(options.universityName)}</div>
            <div class="org-sub">بسیج دانشجویی (حوزه شهید شوریده) و هیئت دانشجویی محبان‌الحسین (ع)</div>
          </div>
          ${logoBadgeHtml(heyatLogo, 'لوگوی هیئت محبان‌الحسین', 'هیئت', 58)}
        </header>

        <div class="hero-block">
          <div class="welcome-pill">ویژه دانشجویان نوورود سال تحصیلی ${toPersianDigits(1405)}</div>
          <h1 class="hero-h1">خوش آمدی هم‌دانشگاهی عزیز!<br /><span>صبحانه گرم</span> مهمان ما باش</h1>
          <p class="hero-lead">
            همه مراحل ثبت‌نام حضوری، نقشه دانشگاه، خوابگاه‌ها، معرفی ۲۵ کانون بسیج، برنامه‌های هیئت و <strong>کارت دیجیتال ژتون صبحانه</strong> یک‌جا روی گوشی تو!
          </p>
        </div>

        <div class="qr-grid">
          <div class="qr-panel primary">
            <span class="qr-tag">اسکن کن · دریافت آنی ژتون</span>
            <h2 class="qr-title">دریافت کارت QR صبحانه</h2>
            <div class="qr-white-frame">
              <div class="qr-svg-wrap">${couponQrSvg}</div>
            </div>
            <div class="qr-url" dir="ltr">${escapeHtml(displayCoupon)}</div>
            <p class="qr-desc">
              پس از اعلام شماره دانشجویی در میز استقبال لابی، این کد را اسکن کن تا کدت سبز شود و کارت صبحانه‌ات صادر گردد.
            </p>
          </div>

          <div class="qr-panel secondary">
            <span class="qr-tag">راهنمای کامل هفته اول</span>
            <h2 class="qr-title">پرتال جامع نوورودی‌ها</h2>
            <div class="qr-white-frame">
              <div class="qr-svg-wrap">${portalQrSvg}</div>
            </div>
            <div class="qr-url" dir="ltr">${escapeHtml(displayPortal)}</div>
            <p class="qr-desc">
              چک‌لیست ۱۳ مرحله ثبت‌نام، راهنمای خوابگاه‌ها، نقشه ساختمان‌ها، کارت یادگاری ۱۴۰۵ و سوالات متداول.
            </p>
          </div>
        </div>

        <div class="steps-box">
          <div class="section-label">
            <span>چطور در کمتر از ۱ دقیقه ژتون صبحانه بگیرم؟</span>
            <small>سهمیه یک‌نوبته در روز ثبت‌نام · ذخیره آفلاین روی گوشی</small>
          </div>
          <div class="steps-grid">
            <div class="step-item">
              <div class="step-badge">۱</div>
              <h4>اعلام کد ۴۰۵ در میز استقبال</h4>
              <p>در لابی ورودی دانشگاه شماره دانشجویی (شروع با ۴۰۵) را به مسئول میز استقبال بگو تا در سامانه تایید شود.</p>
            </div>
            <div class="step-item">
              <div class="step-badge">۲</div>
              <h4>سبز شدن کد و تکمیل فرم</h4>
              <p>کد QR بالا را اسکن کن، شماره دانشجویی‌ات را بزن تا سبز شود و مشخصات کوتاهت را ثبت کن.</p>
            </div>
            <div class="step-item">
              <div class="step-badge">۳</div>
              <h4>تحویل صبحانه با کد QR</h4>
              <p>بلیت دیجیتال صبحانه همان لحظه ظاهر می‌شود؛ به ایستگاه پذیرایی هیئت برو و نوش جان کن!</p>
            </div>
          </div>
        </div>

        <div class="perks-grid">
          <div class="perk-card">
            <strong>۱. نقشه راه روز اول (۱۳ ایستگاه)</strong>
            <span>چک‌لیست تیک‌خور مدارک، ویدیوی راهنما و نقشه ساختمان‌های دانشگاه</span>
          </div>
          <div class="perk-card">
            <strong>۲. بسیج و چارت ۲۵ کانون</strong>
            <span>آزمون کشف استعداد کانون مناسب + عضویت مستقیم با ادمین‌ها</span>
          </div>
          <div class="perk-card">
            <strong>۳. هیئت محبان‌الحسین (ع)</strong>
            <span>قرارهای هفتگی، گزارش تصویری پنج شب فاطمیه و ۱۰ تیم خادمی</span>
          </div>
          <div class="perk-card">
            <strong>۴. خوابگاه‌ها و مقایسه</strong>
            <span>امکانات، قوانین، تصاویر واقعی و لیست وسایل موردنیاز سکونت</span>
          </div>
          <div class="perk-card">
            <strong>۵. کارت یادگاری ورودی ۱۴۰۵</strong>
            <span>تشخیص آنی روز ثبت‌نام رشته‌ات و ساخت کارت دیجیتال یادگاری</span>
          </div>
          <div class="perk-card">
            <strong>۶. قابل نصب و کارکرد آفلاین</strong>
            <span>سریع روی اینترنت همراه و بدون نیاز به نصب از فروشگاه‌های خارجی</span>
          </div>
        </div>

        <footer class="poster-footer">
          <div class="handles-row">
            <span class="handle-chip">کانال بسیج: <b dir="ltr">${escapeHtml(BASIJ_OFFICIAL_INFO.telegramHandle)}</b></span>
            <span class="handle-chip">ادمین برادران: <b dir="ltr">${escapeHtml(BASIJ_OFFICIAL_INFO.brothersAdminHandle)}</b></span>
            <span class="handle-chip">ادمین خواهران: <b dir="ltr">${escapeHtml(BASIJ_OFFICIAL_INFO.sistersAdminHandle)}</b></span>
            <span class="handle-chip">هیئت: <b dir="ltr">${escapeHtml(HEYAT_OFFICIAL_INFO.telegramHandle)}</b></span>
          </div>
        </footer>
      </div>
    </section>

    <!-- صفحه ۲: چهار تراکت جیبی آماده برش روی یک برگ A4 -->
    <section class="a4-sheet flyers-sheet" id="sheet-flyers" aria-label="چهار تراکت برش‌دار A4">
      <div class="flyers-grid">
        ${miniFlyerHtml(1)}
        ${miniFlyerHtml(2)}
        ${miniFlyerHtml(3)}
        ${miniFlyerHtml(4)}
      </div>
    </section>
  </div>

  <script>
    function setMode(mode) {
      var poster = document.getElementById('sheet-poster');
      var flyers = document.getElementById('sheet-flyers');
      poster.classList.toggle('hidden-sheet', mode === 'flyers');
      flyers.classList.toggle('hidden-sheet', mode === 'poster');
      ['both', 'poster', 'flyers'].forEach(function(m) {
        var b = document.getElementById('mode-' + m);
        if (b) b.classList.toggle('active', m === mode);
      });
    }
    ${options.autoPrint ? 'window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 450); });' : ''}
  </script>
</body>
</html>`;
}
