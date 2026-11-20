import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import {
  BASIJ_TIMELINE,
  CADRE_QUIZ_QUESTIONS,
  CAMPUS_MAP_NODES,
  COMMON_PROBLEMS,
  HEYAT_OFFICIAL_INFO,
  HEYAT_WEEKLY_SCHEDULE,
  OFFICIAL_DORM_FEES_1405,
  OFFICIAL_FOOD_PRICING_1405,
  OFFICIAL_NIGHT_TUITION_1405,
  OFFICIAL_REGISTRATION_DAYS,
  OFFICIAL_SHUTTLE_SCHEDULE,
  OFFICIAL_UNIVERSITY_CONTACT,
  OFFICIAL_WELLNESS_SERVICES,
  REGISTRATION_CHECKLIST,
  REGISTRATION_GUIDE_VIDEO,
  REGISTRATION_ONSITE_STEPS,
  REGISTRATION_TIMELINE,
  REQUIRED_DOCUMENTS,
} from '../src/data/orientation';
import { BASIJ_CADRE_DEFINITION } from '../src/data/basijCadresOfficial';
import { BASIJ_AXIS_META, MAJOR_RECOMMENDATIONS } from '../src/data/basijVisuals';
import type {
  AnnouncementItem,
  CadreItem,
  DormItem,
  FaqItem,
  HeyatProgram,
  SiteSettings,
} from '../src/types/portal';

export interface OfflineTodoItem {
  section: string;
  label: string;
  currentValue: string;
}

export interface OfflinePortalSnapshot {
  exportedAtIso: string;
  exportedBy: string;
  settings: SiteSettings;
  announcements: AnnouncementItem[];
  faqs: FaqItem[];
  dorms: DormItem[];
  cadres: CadreItem[];
  heyatPrograms: HeyatProgram[];
  fontWoff2Base64?: string;
  basijLogoDataUri?: string;
  heyatLogoDataUri?: string;
}

/**
 * تبدیل امن شیء JSON برای تزریق درون تگ script (جلوگیری از شکست تگ script و XSS)
 */
export function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * استخراج خودکار فهرست فیلدهای دارای برچسب [نیاز به تکمیل] جهت کمک به تیم در بازبینی و تکمیل اطلاعات
 */
export function extractTodoItems(snapshot: OfflinePortalSnapshot): OfflineTodoItem[] {
  const todos: OfflineTodoItem[] = [];
  const check = (section: string, label: string, val: string | undefined) => {
    if (!val) return;
    if (val.includes('نیاز به تکمیل') || val.includes('placeholder')) {
      todos.push({ section, label, currentValue: val });
    }
  };

  const s = snapshot.settings;
  check('تنظیمات عمومی', 'عنوان رویداد شمارش معکوس', s.targetEventTitle);
  check('تنظیمات عمومی', 'تاریخ شمسی رویداد', s.targetEventDateJalali);
  check('تنظیمات عمومی', 'شماره‌های تماس و پاسخگویی', s.contactPhones);
  check('تنظیمات عمومی', 'ساعت پاسخگویی', s.responseHours);
  check('تنظیمات عمومی', 'آدرس دفتر بسیج', s.basijOfficeLocation);
  check('تنظیمات عمومی', 'آدرس دفتر هیئت', s.heyatOfficeLocation);
  check('تنظیمات عمومی', 'متن معرفی بسیج', s.basijIntroText);
  check('تنظیمات عمومی', 'متن معرفی هیئت', s.heyatIntroText);
  check('کانال‌های ارتباطی', 'لینک تلگرام/ایتا بسیج', s.basijEitaaUrl || s.basijTelegramUrl);
  check('کانال‌های ارتباطی', 'لینک تلگرام/ایتا هیئت', s.heyatEitaaUrl || s.heyatTelegramUrl);

  if (!snapshot.basijLogoDataUri && !s.basijLogoUrl) {
    todos.push({ section: 'هویت بصری', label: 'لوگوی رسمی بسیج دانشجویی', currentValue: 'هنوز آپلود نشده [نیاز به تکمیل]' });
  }
  if (!snapshot.heyatLogoDataUri && !s.heyatLogoUrl) {
    todos.push({ section: 'هویت بصری', label: 'لوگوی رسمی هیئت دانشجویی', currentValue: 'هنوز آپلود نشده [نیاز به تکمیل]' });
  }

  const incompleteCadres = snapshot.cadres.filter(
    (c) =>
      c.leadName.includes('نیاز به تکمیل') ||
      c.meetingSchedule.includes('نیاز به تکمیل') ||
      c.contactInfo.includes('نیاز به تکمیل')
  );
  if (incompleteCadres.length > 0) {
    todos.push({
      section: 'کانون‌های بسیج',
      label: `اطلاعات بومی ${incompleteCadres.length} کانون (نام دبیر، زمان جلسات و راه ارتباطی)`,
      currentValue: 'از پنل ادمین یا در فرم نظرات همین فایل ارسال کنید [نیاز به تکمیل]',
    });
  }

  snapshot.dorms.forEach((d) => {
    if (d.address.includes('نیاز به تکمیل') || d.monthlyFee.includes('نیاز به تکمیل')) {
      todos.push({
        section: 'خوابگاه‌ها',
        label: `جزئیات واقعی ${d.name}`,
        currentValue: 'آدرس، شهریه، ظرفیت و قوانین دقیق [نیاز به تکمیل]',
      });
    }
  });

  return todos;
}

function readLocalFileAsDataUri(urlPath: string, uploadsDir: string): string {
  if (!urlPath) return '';
  try {
    let absPath = '';
    if (urlPath.startsWith('/uploads/')) {
      const safeName = path.basename(urlPath);
      absPath = path.join(uploadsDir, safeName);
    } else if (urlPath.startsWith('/')) {
      absPath = path.resolve(process.cwd(), 'public', urlPath.replace(/^\/+/, ''));
    }
    if (!absPath || !fs.existsSync(absPath)) return '';
    const stat = fs.statSync(absPath);
    if (stat.size > 1.5 * 1024 * 1024) return '';
    const ext = path.extname(absPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const mime = mimeMap[ext];
    if (!mime) return '';
    const b64 = fs.readFileSync(absPath).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return '';
  }
}

function readVazirmatnWoff2Base64(): string {
  try {
    const fontPath = path.resolve(
      process.cwd(),
      'node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2'
    );
    if (!fs.existsSync(fontPath)) return '';
    return fs.readFileSync(fontPath).toString('base64');
  } catch {
    return '';
  }
}

/**
 * جمع‌آوری داده‌های عمومی زنده از SQLite (بدون هیچ داده شخصی یا محرمانه دانشجویان/ادمین‌ها)
 */
export function collectOfflineSnapshot(
  db: Database.Database,
  settings: SiteSettings,
  uploadsDir: string,
  exportedBy: string
): OfflinePortalSnapshot {
  const announcements: AnnouncementItem[] = (
    db.prepare('SELECT * FROM announcements WHERE published = 1 ORDER BY pinned DESC, id DESC').all() as Record<string, unknown>[]
  ).map((r) => ({
    id: r.id as number,
    title: (r.title as string) || '',
    summary: (r.summary as string) || '',
    body: (r.body as string) || '',
    category: (r.category as AnnouncementItem['category']) || 'عمومی',
    dateJalali: (r.date_jalali as string) || '',
    eventDateIso: (r.event_date_iso as string) || '',
    eventTime: (r.event_time as string) || '',
    location: (r.location as string) || '',
    pinned: Boolean(r.pinned),
    published: Boolean(r.published),
    isDemo: Boolean(r.is_demo),
  }));

  const faqs: FaqItem[] = (
    db.prepare('SELECT * FROM faqs WHERE published = 1 ORDER BY id ASC').all() as Record<string, unknown>[]
  ).map((r) => ({
    id: r.id as number,
    category: (r.category as string) || 'عمومی',
    question: (r.question as string) || '',
    answer: (r.answer as string) || '',
    helpfulYes: Number(r.helpful_yes || 0),
    helpfulNo: Number(r.helpful_no || 0),
    published: Boolean(r.published),
    isDemo: Boolean(r.is_demo),
  }));

  const dorms: DormItem[] = (
    db.prepare('SELECT * FROM dorms WHERE published = 1 ORDER BY id ASC').all() as Record<string, unknown>[]
  ).map((r) => ({
    id: r.id as number,
    name: (r.name as string) || '',
    gender: (r.gender as DormItem['gender']) || 'پسران',
    address: (r.address as string) || '',
    distanceToCampus: (r.distance_to_campus as string) || '',
    neshanUrl: (r.neshan_url as string) || '',
    baladUrl: (r.balad_url as string) || '',
    monthlyFee: (r.monthly_fee as string) || '',
    capacity: (r.capacity as string) || '',
    roomType: (r.room_type as string) || '',
    curfewHours: (r.curfew_hours as string) || '',
    supervisorPhone: (r.supervisor_phone as string) || '',
    facilities: JSON.parse((r.facilities_json as string) || '[]'),
    rules: JSON.parse((r.rules_json as string) || '[]'),
    requiredDocs: JSON.parse((r.required_docs_json as string) || '[]'),
    gallery: JSON.parse((r.gallery_json as string) || '[]'),
    faq: JSON.parse((r.faq_json as string) || '[]'),
    published: Boolean(r.published),
    isDemo: Boolean(r.is_demo),
  }));

  const cadres = (
    db.prepare('SELECT * FROM cadres WHERE published = 1 ORDER BY id ASC').all() as Record<string, unknown>[]
  ).map((r) => ({
    id: r.id as number,
    name: r.name as string,
    category: r.category as string,
    shortDesc: r.short_desc as string,
    fullDesc: r.full_desc as string,
    leadName: r.lead_name as string,
    meetingSchedule: r.meeting_schedule as string,
    joinLink: r.join_link as string,
    contactInfo: r.contact_info as string,
    highlights: JSON.parse((r.highlights_json as string) || '[]'),
    tags: JSON.parse((r.tags_json as string) || '[]'),
    imageUrl: r.image_url as string,
    pdfPage: (r.pdf_page as number) || 1,
    published: Boolean(r.published),
    isDemo: Boolean(r.is_demo),
  }));

  const heyatPrograms = (
    db.prepare('SELECT * FROM heyat_programs WHERE published = 1 ORDER BY id ASC').all() as Record<string, unknown>[]
  ).map((r) => ({
    id: r.id as number,
    title: r.title as string,
    category: r.category as 'صبحانه' | 'هفتگی' | 'مناسبتی' | 'فرهنگی',
    dateJalali: r.date_jalali as string,
    dateIso: r.date_iso as string,
    timeRange: r.time_range as string,
    location: r.location as string,
    speaker: r.speaker as string,
    maddah: r.maddah as string,
    description: r.description as string,
    published: Boolean(r.published),
    isDemo: Boolean(r.is_demo),
  }));

  return {
    exportedAtIso: new Date().toISOString(),
    exportedBy,
    settings,
    announcements,
    faqs,
    dorms,
    cadres,
    heyatPrograms,
    fontWoff2Base64: readVazirmatnWoff2Base64(),
    basijLogoDataUri: readLocalFileAsDataUri(settings.basijLogoUrl, uploadsDir),
    heyatLogoDataUri: readLocalFileAsDataUri(settings.heyatLogoUrl, uploadsDir),
  };
}

/**
 * تولید یک فایل HTML کاملاً آفلاین، یکپارچه و تعاملی جهت ارسال در پیام‌رسان‌ها برای بازبینی تیم
 * شامل: فونت وزیرمتن تعبیه‌شده، تم تاریک/روشن، چارت SVG ۲۵ کانون، شناسنامه کانون، نقشه ایزومتریک، چک‌لیست، FAQ، خوابگاه، هیئت و سامانه ثبت نظرات تیم.
 */
export function buildOfflinePortalHtml(snapshot: OfflinePortalSnapshot): string {
  const todos = extractTodoItems(snapshot);
  const payload = {
    exportedAtIso: snapshot.exportedAtIso,
    exportedBy: snapshot.exportedBy,
    settings: snapshot.settings,
    announcements: snapshot.announcements,
    faqs: snapshot.faqs,
    dorms: snapshot.dorms,
    cadres: snapshot.cadres,
    heyatPrograms: snapshot.heyatPrograms,
    basijLogoDataUri: snapshot.basijLogoDataUri || '',
    heyatLogoDataUri: snapshot.heyatLogoDataUri || '',
    todos,
    staticData: {
      cadreDefinition: BASIJ_CADRE_DEFINITION,
      axisMeta: BASIJ_AXIS_META,
      majors: MAJOR_RECOMMENDATIONS,
      checklist: REGISTRATION_CHECKLIST,
      onsiteSteps: REGISTRATION_ONSITE_STEPS,
      guideVideoNotice: REGISTRATION_GUIDE_VIDEO.stepZeroNotice,
      documents: REQUIRED_DOCUMENTS,
      regTimeline: REGISTRATION_TIMELINE,
      problems: COMMON_PROBLEMS,
      campusNodes: CAMPUS_MAP_NODES,
      basijTimeline: BASIJ_TIMELINE,
      quizQuestions: CADRE_QUIZ_QUESTIONS,
      regDays: OFFICIAL_REGISTRATION_DAYS,
      nightTuition: OFFICIAL_NIGHT_TUITION_1405,
      foodPricing: OFFICIAL_FOOD_PRICING_1405,
      dormFees: OFFICIAL_DORM_FEES_1405,
      shuttle: OFFICIAL_SHUTTLE_SCHEDULE,
      wellness: OFFICIAL_WELLNESS_SERVICES,
      uniContact: OFFICIAL_UNIVERSITY_CONTACT,
      heyatInfo: HEYAT_OFFICIAL_INFO,
      heyatWeekly: HEYAT_WEEKLY_SCHEDULE,
    },
  };

  const fontCss = snapshot.fontWoff2Base64
    ? `@font-face {
  font-family: "Vazirmatn";
  src: url("data:font/woff2;base64,${snapshot.fontWoff2Base64}") format("woff2-variations"),
       url("data:font/woff2;base64,${snapshot.fontWoff2Base64}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`
    : '';

  const accent = /^#[0-9a-fA-F]{6}$/.test(snapshot.settings.accentColor)
    ? snapshot.settings.accentColor
    : '#deb154';

  const safeTitle = `${snapshot.settings.siteTitle} — نسخه پیش‌نمایش آفلاین تیم`;

  return `<!doctype html>
<html lang="fa" dir="rtl" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle.replace(/</g, '&lt;')}</title>
  <style>
${fontCss}
:root {
  --canvas: #f7f6f1;
  --surface: #ffffff;
  --surface-2: #f0eee6;
  --ink: #102420;
  --muted: #4b615b;
  --line: rgba(16, 36, 32, 0.12);
  --gold: #b88224;
  --gold-soft: rgba(184, 130, 36, 0.13);
  --emerald: #0b3b32;
}
html.dark {
  --canvas: #061412;
  --surface: #0b1f1c;
  --surface-2: #102a26;
  --ink: #f4f1e8;
  --muted: #a6bab4;
  --line: rgba(244, 241, 232, 0.12);
  --gold: ${accent};
  --gold-soft: rgba(222, 177, 84, 0.14);
  --emerald: #092c25;
}
* { box-sizing: border-box; }
html { font-family: "Vazirmatn", Tahoma, system-ui, sans-serif; font-size: 16px; scroll-behavior: smooth; }
body { margin: 0; background: var(--canvas); color: var(--ink); line-height: 1.75; overflow-x: hidden; }
a { color: inherit; text-decoration: none; }
button, input, select, textarea { font-family: inherit; }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.review-ribbon {
  background: var(--gold-soft);
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  padding: 8px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.topbar {
  position: sticky; top: 0; z-index: 40;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.topbar-inner {
  max-width: 1200px; margin: 0 auto; padding: 10px 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 15px; }
.emblem {
  width: 36px; height: 36px; border-radius: 12px; border: 1px solid var(--line);
  background: var(--emerald); color: var(--gold);
  display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; overflow: hidden; flex-shrink: 0;
}
.emblem img { width: 100%; height: 100%; object-fit: cover; }
.nav { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.nav-btn {
  border: 1px solid transparent; background: transparent; color: var(--muted);
  padding: 7px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: .18s;
}
.nav-btn:hover { color: var(--ink); border-color: var(--line); }
.nav-btn.active { background: var(--gold); color: #071714; font-weight: 800; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 40px; padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700;
  border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; transition: .18s;
}
.btn:hover { border-color: var(--gold); }
.btn-gold { background: var(--gold); color: #071714; border-color: var(--gold); }
.btn-gold:hover { filter: brightness(1.06); }
.btn-emerald { background: var(--emerald); color: #f4f1e8; border-color: rgba(222,177,84,.35); }
.card {
  position: relative; overflow: hidden;
  border: 1px solid var(--line); background: var(--surface);
  border-radius: 22px; padding: 22px;
}
.card-sm {
  border: 1px solid var(--line); background: var(--canvas);
  border-radius: 16px; padding: 14px;
}
.hero {
  position: relative; overflow: hidden;
  border: 1px solid var(--line); border-radius: 26px;
  background: radial-gradient(circle at 80% 15%, rgba(222,177,84,.14), transparent 55%), var(--surface);
  padding: 28px; margin-top: 20px;
}
.lattice-bg {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.75;
}
.z1 { position: relative; z-index: 1; }
h1 { margin: 0; font-size: clamp(22px, 3.6vw, 36px); line-height: 1.35; font-weight: 800; }
h2 { margin: 0; font-size: clamp(18px, 2.5vw, 24px); font-weight: 800; }
h3 { margin: 0; font-size: 16px; font-weight: 700; }
.kicker { font-size: 12px; font-weight: 700; color: var(--gold); margin: 0 0 6px; }
.muted { color: var(--muted); }
.gold { color: var(--gold); }
.grid { display: grid; gap: 16px; }
.g2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.g3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.g4 { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
.bento { display: grid; gap: 16px; grid-template-columns: repeat(12, 1fr); }
.span7 { grid-column: span 7; }
.span5 { grid-column: span 5; }
.span3 { grid-column: span 3; }
@media (max-width: 900px) {
  .span7, .span5, .span3 { grid-column: span 12; }
  .svg-desktop-chart { display: none; }
  .mobile-constellation { display: grid !important; }
}
.mobile-constellation { display: none; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.tab-chip {
  min-height: 36px; padding: 6px 12px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--canvas); color: var(--muted);
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.tab-chip.active { background: var(--gold); color: #071714; border-color: var(--gold); font-weight: 800; }
.input {
  width: 100%; min-height: 42px; padding: 8px 12px; border-radius: 12px;
  border: 1px solid var(--line); background: var(--canvas); color: var(--ink); font-size: 13px;
}
.section { margin-top: 26px; display: flex; flex-direction: column; gap: 16px; }
.divider { border: 0; border-top: 1px solid var(--line); margin: 14px 0; }
.modal-backdrop {
  position: fixed; inset: 0; z-index: 80;
  background: rgba(0,0,0,.74); backdrop-filter: blur(4px);
  display: none; align-items: center; justify-content: center; padding: 14px;
}
.modal-backdrop.open { display: flex; }
.modal {
  width: 100%; max-width: 680px; max-height: 88vh; overflow-y: auto;
  border-radius: 24px; border: 1px solid var(--line); background: var(--surface);
  padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,.55);
}
.fab-feedback {
  position: fixed; left: 18px; bottom: 18px; z-index: 60;
  background: var(--gold); color: #071714; border: none; border-radius: 14px;
  padding: 11px 16px; font-size: 13px; font-weight: 800; cursor: pointer;
  box-shadow: 0 12px 30px rgba(0,0,0,.35);
}
.progress-bar { height: 9px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
.progress-fill { height: 100%; background: var(--gold); transition: width .25s; }
.check-item {
  width: 100%; text-align: right; display: flex; align-items: flex-start; gap: 12px;
  padding: 14px; border-radius: 16px; border: 1px solid var(--line); background: var(--surface);
  color: var(--ink); cursor: pointer;
}
.check-item.done { border-color: rgba(52,211,153,.5); background: rgba(52,211,153,.09); }
.check-box {
  width: 24px; height: 24px; border-radius: 8px; border: 1px solid var(--line);
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 800;
}
.check-item.done .check-box { background: #10b981; border-color: #10b981; color: #fff; }
.toast {
  position: fixed; right: 18px; bottom: 18px; z-index: 90;
  background: var(--emerald); color: #f4f1e8; border: 1px solid var(--gold);
  padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 600;
  display: none;
}
.toast.show { display: block; }
footer { margin-top: 48px; border-top: 1px solid var(--line); padding: 24px 16px 80px; font-size: 12px; color: var(--muted); }
  </style>
</head>
<body>
  <div class="review-ribbon">
    <span><strong>نسخه پیش‌نمایش کاملاً آفلاین برای بازبینی تیم</strong> · بدون نیاز به اینترنت و سرور · خروجی گرفته شده در <span id="export-date"></span></span>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="tab-chip" type="button" id="toggle-theme-btn">تم روشن / تاریک</button>
      <button class="tab-chip active" type="button" onclick="switchPage('review')">موارد نیازمند تکمیل (<span id="todo-count-badge">۰</span>) و ثبت نظر</button>
    </div>
  </div>

  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <span class="emblem" id="hdr-basij-logo">ب</span>
        <span class="emblem" id="hdr-heyat-logo">ه</span>
        <span id="hdr-title">پرتال هوشمند نوورودی‌ها</span>
      </div>
      <nav class="nav" id="main-nav" aria-label="منوی صفحات نسخه آفلاین">
        <button class="nav-btn active" data-page="home">صفحه اصلی</button>
        <button class="nav-btn" data-page="basij">بسیج و چارت ۲۵ کانون</button>
        <button class="nav-btn" data-page="guide">راهنما و نقشه</button>
        <button class="nav-btn" data-page="dorms">خوابگاه‌ها</button>
        <button class="nav-btn" data-page="heyat">هیئت و ژتون</button>
        <button class="nav-btn" data-page="announcements">اطلاعیه‌ها</button>
        <button class="nav-btn" data-page="review">نظرات تیم و تکمیل</button>
      </nav>
    </div>
  </header>

  <main class="wrap" id="app-root"></main>

  <footer>
    <div class="wrap" style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px">
      <span id="ftr-uni">مجتمع آموزش عالی گناباد · بسیج دانشجویی و هیئت دانشجویی</span>
      <span>این فایل یک خروجی کاملاً آفلاین جهت بررسی طراحی و تکمیل محتوا توسط تیم اجرایی است.</span>
    </div>
  </footer>

  <button type="button" class="fab-feedback" onclick="switchPage('review')">ثبت نظر و اصلاحیه تیم</button>

  <div class="modal-backdrop" id="dossier-modal" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()" id="dossier-body"></div>
  </div>

  <div class="toast" id="toast-box"></div>

  <script id="portal-offline-data" type="application/json">${safeJsonForScript(payload)}</script>
  <script>
(function () {
  const DATA = JSON.parse(document.getElementById('portal-offline-data').textContent);
  const S = DATA.settings;
  const ST = DATA.staticData;

  const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const toFa = (v) => String(v).replace(/\\d/g, (d) => FA_DIGITS[Number(d)]);
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const normFa = (s) => String(s || '').replace(/[يئ]/g,'ی').replace(/ك/g,'ک').replace(/[\\u200c\\s]+/g,' ').trim().toLowerCase();

  const STATE = {
    page: 'home',
    activeAxis: 'همه',
    selectedMajor: 'all',
    cadreSearch: '',
    faqSearch: '',
    faqCat: 'همه',
    selectedBuildingId: ST.campusNodes[0].id,
    shuttleTab: 'sisters',
    checkedSteps: JSON.parse(localStorage.getItem('offline_chk_steps') || '[]'),
    savedCadres: JSON.parse(localStorage.getItem('offline_saved_cadres') || '[]'),
    quizAnswers: {},
    quizDone: false,
    teamNotes: JSON.parse(localStorage.getItem('offline_team_notes') || '[]'),
  };

  function showToast(msg) {
    const el = document.getElementById('toast-box');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function latticeSvg(opacity) {
    const op = opacity || 0.08;
    const id = 'g' + Math.floor(Math.random() * 100000);
    return '<div class="lattice-bg"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<pattern id="p' + id + '" width="80" height="80" patternUnits="userSpaceOnUse"><g fill="none" stroke="var(--gold)" stroke-width="0.9" opacity="' + op + '">' +
      '<rect x="22" y="22" width="36" height="36"/><rect x="22" y="22" width="36" height="36" transform="rotate(45 40 40)"/>' +
      '<circle cx="40" cy="40" r="6"/></g></pattern>' +
      '<radialGradient id="rg' + id + '" cx="50%" cy="40%" r="65%"><stop offset="0%" stop-color="#fff" stop-opacity="1"/><stop offset="100%" stop-color="#fff" stop-opacity="0.06"/></radialGradient>' +
      '<mask id="m' + id + '"><rect width="100%" height="100%" fill="url(#rg' + id + ')"/></mask>' +
      '</defs><rect width="100%" height="100%" fill="url(#p' + id + ')" mask="url(#m' + id + ')"/></svg></div>';
  }

  // تنظیم هدر و لوگوهای تعبیه‌شده
  document.getElementById('hdr-title').textContent = S.siteTitle;
  document.getElementById('ftr-uni').textContent = S.universityName + ' · بسیج دانشجویی و هیئت دانشجویی';
  document.getElementById('todo-count-badge').textContent = toFa(DATA.todos.length);
  document.getElementById('export-date').textContent = new Date(DATA.exportedAtIso).toLocaleDateString('fa-IR');
  if (DATA.basijLogoDataUri) {
    document.getElementById('hdr-basij-logo').innerHTML = '<img src="' + DATA.basijLogoDataUri + '" alt="بسیج" />';
  }
  if (DATA.heyatLogoDataUri) {
    document.getElementById('hdr-heyat-logo').innerHTML = '<img src="' + DATA.heyatLogoDataUri + '" alt="هیئت" />';
  }

  document.getElementById('toggle-theme-btn').onclick = function () {
    document.documentElement.classList.toggle('dark');
  };

  document.querySelectorAll('#main-nav .nav-btn').forEach((btn) => {
    btn.onclick = () => switchPage(btn.getAttribute('data-page'));
  });

  window.switchPage = function (p) {
    STATE.page = p;
    document.querySelectorAll('#main-nav .nav-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-page') === p);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  };

  window.closeModal = function () {
    document.getElementById('dossier-modal').classList.remove('open');
  };

  window.openCadreModal = function (id) {
    const c = DATA.cadres.find((x) => x.id === id);
    if (!c) return;
    const ax = ST.axisMeta.find((m) => m.key === c.category) || ST.axisMeta[0];
    const saved = STATE.savedCadres.includes(c.id);
    const body = document.getElementById('dossier-body');
    body.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1px solid var(--line);padding-bottom:14px">' +
        '<div><p class="kicker" style="color:' + ax.accent + '">' + esc(ax.title) + ' · ساختار رسمی قرار قیام ۹</p>' +
        '<h2>' + esc(c.name) + '</h2><p class="muted" style="font-size:12px;margin:4px 0 0">' + esc(ax.subtitle) + '</p></div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn ' + (saved ? 'btn-gold' : '') + '" onclick="toggleSaveCadre(' + c.id + ')">' + (saved ? 'نشان‌شده ★' : 'نشان کن') + '</button>' +
          '<button class="btn" onclick="closeModal()">بستن ✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="padding:14px 0;border-bottom:1px solid var(--line)">' +
        '<p class="kicker">مأموریت اصلی کانون</p>' +
        '<p style="font-weight:700;margin:0 0 8px">' + esc(c.shortDesc) + '</p>' +
        '<p class="muted" style="font-size:14px;margin:0">' + esc(c.fullDesc) + '</p>' +
      '</div>' +
      '<div style="padding:14px 0">' +
        '<p class="kicker">واحدها و کارگروه‌های اجرایی (' + toFa(c.highlights.length) + ' حوزه)</p>' +
        '<div class="grid g2">' +
          c.highlights.map((h, i) => '<div class="card-sm" style="display:flex;gap:10px;align-items:flex-start"><span style="background:' + ax.accentSoft + ';color:' + ax.accent + ';padding:2px 8px;border-radius:8px;font-weight:800;font-size:12px">' + toFa(i+1) + '</span><span style="font-size:13px">' + esc(h) + '</span></div>').join('') +
        '</div>' +
      '</div>' +
      '<div class="grid g3 card-sm" style="font-size:12px">' +
        '<div><span class="muted">دبیر کانون:</span><br/><strong>' + esc(c.leadName) + '</strong></div>' +
        '<div><span class="muted">زمان جلسات:</span><br/><strong>' + esc(c.meetingSchedule) + '</strong></div>' +
        '<div><span class="muted">راه ارتباطی:</span><br/><strong>' + esc(c.contactInfo) + '</strong></div>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-gold" onclick="quickFeedbackFor(\\'کانون: ' + esc(c.name).replace(/'/g, '') + '\\')">ثبت اصلاحیه یا اطلاعات دبیر این کانون</button>' +
        '<button class="btn" onclick="closeModal()">بازگشت به چارت</button>' +
      '</div>';
    document.getElementById('dossier-modal').classList.add('open');
  };

  window.toggleSaveCadre = function (id) {
    if (STATE.savedCadres.includes(id)) {
      STATE.savedCadres = STATE.savedCadres.filter((x) => x !== id);
      showToast('از نشان‌شده‌ها حذف شد.');
    } else {
      STATE.savedCadres.push(id);
      showToast('به کانون‌های نشان‌شده اضافه شد.');
    }
    localStorage.setItem('offline_saved_cadres', JSON.stringify(STATE.savedCadres));
    if (document.getElementById('dossier-modal').classList.contains('open')) {
      openCadreModal(id);
    }
    render();
  };

  window.quickFeedbackFor = function (sectionName) {
    closeModal();
    STATE.prefillFeedbackSection = sectionName;
    switchPage('review');
  };

  function getMajorHighlightSet() {
    const m = ST.majors.find((x) => x.id === STATE.selectedMajor);
    if (!m || !m.preferredNames.length) return new Set();
    const names = new Set(m.preferredNames);
    return new Set(DATA.cadres.filter((c) => names.has(c.name)).map((c) => c.id));
  }

  function renderBasijChartSvg() {
    const rightAxes = ['فرهنگی', 'جهادی', 'سایر موضوعات'];
    const leftAxes = ['سیاسی', 'هنر و رسانه', 'علمی'];
    const center = { x: 620, y: 420 };
    const axisNodes = [];
    const cadreNodes = [];
    const majorSet = getMajorHighlightSet();
    const hasMajor = majorSet.size > 0;
    const focused = STATE.activeAxis !== 'همه' ? STATE.activeAxis : null;

    function buildSide(keys, side) {
      const groups = keys.map((k) => ({
        meta: ST.axisMeta.find((m) => m.key === k),
        items: DATA.cadres.filter((c) => c.category === k),
      })).filter((g) => g.meta && g.items.length);
      const total = groups.reduce((s, g) => s + g.items.length, 0);
      const pitch = side === 'right' ? 54 : 51;
      const gap = side === 'right' ? 30 : 24;
      const totalH = Math.max(0, total - 1) * pitch + Math.max(0, groups.length - 1) * gap;
      let y = center.y - totalH / 2;
      const axisX = side === 'right' ? 812 : 428;
      const cadreX = side === 'right' ? 1094 : 146;
      groups.forEach((g, gi) => {
        const y0 = y;
        g.items.forEach((c, ci) => {
          cadreNodes.push({ c, meta: g.meta, x: cadreX, y, side });
          if (ci < g.items.length - 1) y += pitch;
        });
        axisNodes.push({ meta: g.meta, count: g.items.length, x: axisX, y: (y0 + y) / 2, side });
        if (gi < groups.length - 1) y += pitch + gap;
      });
    }
    buildSide(rightAxes, 'right');
    buildSide(leftAxes, 'left');

    let svg = '<div class="svg-desktop-chart" style="border-radius:18px;border:1px solid var(--line);background:#061613;overflow:hidden">';
    svg += '<svg viewBox="0 0 1240 840" style="width:100%;height:auto;display:block">';
    svg += '<defs><radialGradient id="hubg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#deb154" stop-opacity="0.28"/><stop offset="100%" stop-color="#061613" stop-opacity="0"/></radialGradient></defs>';
    svg += '<circle cx="620" cy="420" r="220" fill="url(#hubg)"/>';

    axisNodes.forEach((ax) => {
      const sx = ax.side === 'right' ? 688 : 552;
      const ex = ax.side === 'right' ? ax.x - 72 : ax.x + 72;
      const mx = (sx + ex) / 2;
      const emp = !focused || focused === ax.meta.key;
      svg += '<path d="M ' + sx + ' 420 C ' + mx + ' 420, ' + mx + ' ' + ax.y + ', ' + ex + ' ' + ax.y + '" fill="none" stroke="' + ax.meta.accent + '" stroke-width="' + (emp ? 2.5 : 1.1) + '" stroke-opacity="' + (emp ? 0.85 : 0.16) + '"/>';
    });

    cadreNodes.forEach((n) => {
      const ax = axisNodes.find((a) => a.meta.key === n.meta.key);
      if (!ax) return;
      const sx = n.side === 'right' ? ax.x + 72 : ax.x - 72;
      const ex = n.side === 'right' ? n.x - 122 : n.x + 122;
      const mx = (sx + ex) / 2;
      const hit = majorSet.has(n.c.id);
      const emp = (focused && n.c.category === focused) || (!focused && (!hasMajor || hit));
      svg += '<path d="M ' + sx + ' ' + ax.y + ' C ' + mx + ' ' + ax.y + ', ' + mx + ' ' + n.y + ', ' + ex + ' ' + n.y + '" fill="none" stroke="' + (hit ? '#deb154' : n.meta.accent) + '" stroke-width="' + (hit ? 2.4 : 1.35) + '" stroke-opacity="' + (emp ? 0.78 : 0.12) + '"/>';
    });

    // مرکز
    svg += '<g transform="translate(620,420)" style="cursor:pointer" onclick="setBasijAxis(\\'همه\\')">' +
      '<rect x="-54" y="-54" width="108" height="108" rx="18" transform="rotate(45)" fill="rgba(222,177,84,0.1)" stroke="rgba(222,177,84,0.45)" stroke-width="1.5"/>' +
      '<circle r="66" fill="#0a241f" stroke="#deb154" stroke-width="2.4"/>' +
      '<text y="-12" text-anchor="middle" fill="#deb154" font-size="11.5" font-weight="700">ساختار کانونی</text>' +
      '<text y="9" text-anchor="middle" fill="#f4f1e8" font-size="14.5" font-weight="800">بسیج دانشجویی</text>' +
      '<text y="29" text-anchor="middle" fill="#a6bab4" font-size="11">' + toFa(DATA.cadres.length) + ' کانون · ۶ محور</text></g>';

    axisNodes.forEach((ax) => {
      const sel = STATE.activeAxis === ax.meta.key;
      const emp = !focused || focused === ax.meta.key;
      svg += '<g transform="translate(' + ax.x + ',' + ax.y + ')" style="cursor:pointer;opacity:' + (emp ? 1 : 0.34) + '" onclick="setBasijAxis(\\'' + (sel ? 'همه' : ax.meta.key) + '\\')">' +
        '<rect x="-72" y="-27" width="144" height="54" rx="14" fill="' + (sel ? ax.meta.accent : '#0c2722') + '" stroke="' + ax.meta.accent + '" stroke-width="2"/>' +
        '<text y="-3" text-anchor="middle" fill="' + (sel ? '#061613' : '#f4f1e8') + '" font-size="13.5" font-weight="800">' + esc(ax.meta.shortLabel) + '</text>' +
        '<text y="15" text-anchor="middle" fill="' + (sel ? '#061613' : '#a6bab4') + '" font-size="11">' + toFa(ax.count) + ' کانون تخصصی</text></g>';
    });

    cadreNodes.forEach((n) => {
      const hit = majorSet.has(n.c.id);
      const emp = (focused && n.c.category === focused) || (!focused && (!hasMajor || hit));
      const lbl = n.c.name.length > 29 ? n.c.name.slice(0, 28) + '…' : n.c.name;
      svg += '<g transform="translate(' + n.x + ',' + n.y + ')" style="cursor:pointer;opacity:' + (emp ? 1 : 0.28) + '" onclick="openCadreModal(' + n.c.id + ')">' +
        '<rect x="-122" y="-19" width="244" height="38" rx="11" fill="' + (hit ? 'rgba(222,177,84,0.2)' : '#0b201c') + '" stroke="' + (hit ? '#deb154' : n.meta.accentBorder) + '" stroke-width="' + (hit ? 2 : 1.15) + '"/>' +
        '<text y="4.5" text-anchor="middle" fill="#f4f1e8" font-size="12.2" font-weight="' + (hit ? 700 : 500) + '">' + esc(lbl) + '</text></g>';
    });

    svg += '</svg></div>';
    return svg;
  }

  window.setBasijAxis = function (ax) { STATE.activeAxis = ax; render(); };
  window.setMajor = function (m) { STATE.selectedMajor = m; render(); };
  window.toggleStep = function (id) {
    if (STATE.checkedSteps.includes(id)) STATE.checkedSteps = STATE.checkedSteps.filter((x) => x !== id);
    else STATE.checkedSteps.push(id);
    localStorage.setItem('offline_chk_steps', JSON.stringify(STATE.checkedSteps));
    render();
  };
  window.selectBuilding = function (id) { STATE.selectedBuildingId = id; render(); };
  window.setShuttleTab = function (t) { STATE.shuttleTab = t; render(); };
  window.pickQuiz = function (qid, tag) { STATE.quizAnswers[qid] = tag; render(); };
  window.finishQuiz = function () { STATE.quizDone = true; render(); };
  window.resetQuiz = function () { STATE.quizAnswers = {}; STATE.quizDone = false; render(); };

  window.addTeamNote = function (e) {
    e.preventDefault();
    const reviewer = document.getElementById('fb-name').value.trim() || 'عضو تیم';
    const sec = document.getElementById('fb-section').value;
    const text = document.getElementById('fb-text').value.trim();
    if (!text) return;
    STATE.teamNotes.unshift({ id: Date.now(), reviewer, sec, text, at: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) });
    localStorage.setItem('offline_team_notes', JSON.stringify(STATE.teamNotes));
    showToast('نظر ثبت شد! می‌توانید همه نظرات را یکجا کپی کنید.');
    render();
  };

  window.deleteTeamNote = function (id) {
    STATE.teamNotes = STATE.teamNotes.filter((n) => n.id !== id);
    localStorage.setItem('offline_team_notes', JSON.stringify(STATE.teamNotes));
    render();
  };

  function buildNotesText() {
    if (!STATE.teamNotes.length) return 'هنوز نظری ثبت نشده است.';
    return '📋 جمع‌بندی نظرات و اصلاحات تیم برای پرتال نوورودی‌ها:\\n\\n' +
      STATE.teamNotes.map((n, i) => (i + 1) + '. [' + n.sec + '] (' + n.reviewer + '):\\n' + n.text).join('\\n\\n');
  }

  window.copyTeamNotes = function () {
    const txt = buildNotesText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => showToast('متن نظرات کپی شد! در ایتا یا تلگرام Paste کن.')).catch(() => showToast('برای کپی دستی از دکمه دانلود فایل متنی استفاده کن.'));
    } else {
      showToast('از دکمه دانلود فایل متنی استفاده کن.');
    }
  };

  window.downloadTeamNotes = function () {
    const blob = new Blob([buildNotesText()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gonabad-portal-team-feedback.txt';
    a.click();
    showToast('فایل متنی نظرات دانلود شد.');
  };

  function renderHome() {
    const pct = Math.round((STATE.checkedSteps.length / ST.checklist.length) * 100);
    return '<section class="hero">' + latticeSvg(0.08) +
      '<div class="z1 grid g2" style="align-items:center">' +
        '<div>' +
          '<p class="kicker">' + esc(S.universityName) + ' · نسخه پیش‌نمایش آفلاین</p>' +
          '<h1>همه‌چیز برای روزهای اول دانشگاه، <span class="gold">شفاف و در یک‌جا</span></h1>' +
          '<p class="muted" style="margin:12px 0 20px">از چک‌لیست ثبت‌نام و نقشه معماری دانشگاه تا چارت تعاملی ۲۵ کانون بسیج دانشجویی، برنامه‌های هیئت و ژتون صبحانه.</p>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
            '<button class="btn btn-gold" onclick="switchPage(\\'basij\\')">مشاهده چارت ۲۵ کانون بسیج</button>' +
            '<button class="btn" onclick="switchPage(\\'guide\\')">راهنمای ثبت‌نام و نقشه</button>' +
          '</div>' +
        '</div>' +
        '<div class="grid" style="gap:12px">' +
          '<div class="card-sm"><p class="kicker">رویداد پیش‌رو · ' + esc(S.targetEventDateJalali) + '</p><h3>' + esc(S.targetEventTitle) + '</h3></div>' +
          '<div class="card-sm"><div style="display:flex;justify-content:space-between;align-items:center"><strong>پیشرفت چک‌لیست ثبت‌نام</strong><strong class="gold">' + toFa(pct) + '٪</strong></div>' +
          '<div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
          '<p class="muted" style="font-size:12px;margin:8px 0 0">' + toFa(STATE.checkedSteps.length) + ' از ' + toFa(ST.checklist.length) + ' مرحله تیک خورده است</p></div>' +
        '</div>' +
      '</div></section>' +
      '<section class="section"><p class="kicker">نقشه راه نوورودی‌ها</p><h2>هر آنچه در هفته اول نیاز داری</h2>' +
      '<div class="bento">' +
        '<div class="card span7" style="cursor:pointer" onclick="switchPage(\\'basij\\')">' + latticeSvg(0.06) +
          '<div class="z1"><p class="kicker">۰۱ · چارت تعاملی قرار قیام ۹</p><h3>بسیج دانشجویی و چارت گرافیکی ۲۵ کانون</h3>' +
          '<p class="muted" style="font-size:13px">مشاهده همه ۲۵ کانون در ۶ محور تخصصی، تطبیق با رشته تحصیلی و شناسنامه کامل کارگروه‌ها.</p>' +
          '<div class="pills" style="margin-top:12px;font-size:12px">' + ST.axisMeta.map((a) => '<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:' + a.accent + '"></span>' + esc(a.shortLabel) + '</span>').join('') + '</div></div></div>' +
        '<div class="card span5" style="cursor:pointer" onclick="switchPage(\\'guide\\')"><p class="kicker">۰۲ · نقشه راه روز اول</p><h3>راهنمای ثبت‌نام، نقشه معماری و FAQ</h3><p class="muted" style="font-size:13px">چک‌لیست مراحل، مدارک لازم، نقشه ۲.۵بعدی دانشگاه و جستجوی هوشمند سوالات متداول.</p></div>' +
        '<div class="card span3" style="cursor:pointer" onclick="switchPage(\\'heyat\\')"><p class="kicker">۰۳</p><h3>هیئت و ژتون صبحانه</h3><p class="muted" style="font-size:12px">برنامه‌های معنوی، نواها و کارت دیجیتال صبحانه.</p></div>' +
        '<div class="card span3" style="cursor:pointer" onclick="switchPage(\\'dorms\\')"><p class="kicker">۰۴</p><h3>خوابگاه‌ها</h3><p class="muted" style="font-size:12px">امکانات، قوانین و مقایسه خوابگاه‌ها.</p></div>' +
        '<div class="card span3" style="cursor:pointer" onclick="switchPage(\\'announcements\\')"><p class="kicker">۰۵</p><h3>اطلاعیه‌ها</h3><p class="muted" style="font-size:12px">' + toFa(DATA.announcements.length) + ' اطلاعیه فعال ثبت‌نام و دانشگاه.</p></div>' +
        '<div class="card span3" style="cursor:pointer;border-color:var(--gold)" onclick="switchPage(\\'review\\')"><p class="kicker">۰۶ · ویژه تیم</p><h3>بازبینی و ثبت نظرات</h3><p class="muted" style="font-size:12px">' + toFa(DATA.todos.length) + ' مورد نیازمند تکمیل + فرم ارسال اصلاحیه.</p></div>' +
      '</div></section>';
  }

  function renderBasij() {
    const majorSet = getMajorHighlightSet();
    const q = normFa(STATE.cadreSearch);
    const filtered = DATA.cadres.filter((c) => {
      if (STATE.activeAxis !== 'همه' && c.category !== STATE.activeAxis) return false;
      if (!q) return true;
      return normFa(c.name + ' ' + c.category + ' ' + c.shortDesc + ' ' + c.highlights.join(' ')).includes(q);
    });

    const quizCounts = { علمی:0, رسانه:0, جهادی:0, فرهنگ:0, سیاسی:0 };
    Object.values(STATE.quizAnswers).forEach((t) => { if (t in quizCounts) quizCounts[t]++; });
    const topTag = Object.entries(quizCounts).sort((a,b) => b[1]-a[1])[0][0];
    const quizMatches = DATA.cadres.filter((c) => c.tags.includes(topTag)).slice(0, 3);

    return '<section class="hero">' + latticeSvg(0.08) +
      '<div class="z1"><p class="kicker">ساختار تعاملی کانون‌های بسیج دانشجویی · قرار قیام ۹</p>' +
      '<h1>بسیج دانشجویی ' + esc(S.universityName) + '</h1>' +
      '<p class="muted" style="max-width:740px">' + esc(S.basijIntroText) + '</p>' +
      '<hr class="divider"/><p class="kicker">تعریف رسمی کانون</p><p class="muted" style="font-size:13px;margin:0">' + esc(ST.cadreDefinition) + '</p></div></section>' +

      '<section class="section"><div><p class="kicker">۰۱. چارت تعاملی ۲۵ کانون و تطبیق رشته</p><h2>روی هر محور یا کانون کلیک کن</h2></div>' +
      '<div class="card" style="padding:14px"><div class="pills" style="align-items:center"><strong style="font-size:12px">رشته تحصیلی:</strong>' +
        ST.majors.map((m) => '<button class="tab-chip ' + (STATE.selectedMajor === m.id ? 'active' : '') + '" onclick="setMajor(\\'' + m.id + '\\')">' + esc(m.label) + '</button>').join('') +
      '</div></div>' +
      '<div class="card" style="padding:16px">' +
        '<div class="pills" style="margin-bottom:14px">' +
          '<button class="tab-chip ' + (STATE.activeAxis === 'همه' ? 'active' : '') + '" onclick="setBasijAxis(\\'همه\\')">همه محورها (' + toFa(DATA.cadres.length) + ')</button>' +
          ST.axisMeta.map((a) => '<button class="tab-chip ' + (STATE.activeAxis === a.key ? 'active' : '') + '" onclick="setBasijAxis(\\'' + a.key + '\\')">' + esc(a.shortLabel) + ' (' + toFa(DATA.cadres.filter((c)=>c.category===a.key).length) + ')</button>').join('') +
        '</div>' +
        renderBasijChartSvg() +
        '<div class="grid g2 mobile-constellation">' +
          ST.axisMeta.filter((a) => STATE.activeAxis === 'همه' || STATE.activeAxis === a.key).map((a) => {
            const list = DATA.cadres.filter((c) => c.category === a.key);
            return '<div class="card-sm"><p class="kicker" style="color:' + a.accent + '">' + esc(a.title) + ' (' + toFa(list.length) + ' کانون)</p>' +
              list.map((c) => '<button class="btn" style="width:100%;justify-content:space-between;margin-top:6px;' + (majorSet.has(c.id) ? 'border-color:var(--gold)' : '') + '" onclick="openCadreModal(' + c.id + ')"><span>' + esc(c.name) + '</span><span class="gold">شناسنامه ←</span></button>').join('') +
            '</div>';
          }).join('') +
        '</div>' +
      '</div></section>' +

      '<section class="section"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px">' +
        '<h2>۰۲. جستجو و مرور همه کانون‌ها (' + toFa(filtered.length) + ')</h2>' +
        '<input class="input" style="max-width:300px" placeholder="جستجوی نام کانون یا مهارت..." value="' + esc(STATE.cadreSearch) + '" oninput="STATE_SET_SEARCH(this.value)" />' +
      '</div>' +
      '<div class="grid g3">' +
        filtered.map((c) => {
          const ax = ST.axisMeta.find((m) => m.key === c.category) || ST.axisMeta[0];
          const hit = majorSet.has(c.id);
          return '<article class="card" style="' + (hit ? 'border-color:var(--gold)' : '') + ';display:flex;flex-direction:column;justify-content:space-between;gap:12px">' +
            '<div><p class="kicker" style="color:' + ax.accent + '">' + esc(ax.title) + (hit ? ' · پیشنهاد رشته تو' : '') + '</p>' +
            '<h3>' + esc(c.name) + '</h3><p class="muted" style="font-size:13px;margin:8px 0">' + esc(c.shortDesc) + '</p>' +
            '<p class="muted" style="font-size:12px;margin:0"><strong>کارگروه‌ها:</strong> ' + esc(c.highlights.slice(0,2).join(' · ')) + '</p></div>' +
            '<button class="btn btn-emerald" onclick="openCadreModal(' + c.id + ')">مشاهده شناسنامه کامل</button></article>';
        }).join('') +
      '</div></section>' +

      '<section class="section card"><p class="kicker">۰۳. آزمون کوتاه انتخاب کانون</p><h2>کدام کانون مناسب من است؟</h2>' +
      (!STATE.quizDone
        ? '<div class="grid g2">' + ST.quizQuestions.map((qItem, idx) =>
            '<div class="card-sm"><strong>' + toFa(idx+1) + '. ' + esc(qItem.question) + '</strong><div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">' +
              qItem.options.map((o) => '<button class="tab-chip ' + (STATE.quizAnswers[qItem.id] === o.tag ? 'active' : '') + '" style="text-align:right" onclick="pickQuiz(\\'' + qItem.id + '\\',\\'' + o.tag + '\\')">' + esc(o.label) + '</button>').join('') +
            '</div></div>'
          ).join('') + '</div><div style="margin-top:12px"><button class="btn btn-gold" onclick="finishQuiz()">مشاهده کانون‌های پیشنهادی</button></div>'
        : '<div class="card-sm" style="border-color:var(--gold)"><p class="kicker">گرایش غالب تو: ' + esc(topTag) + '</p><div class="grid g3">' +
            quizMatches.map((m) => '<div class="card"><h3>' + esc(m.name) + '</h3><p class="muted" style="font-size:12px">' + esc(m.shortDesc) + '</p><button class="btn btn-gold" onclick="openCadreModal(' + m.id + ')">شناسنامه</button></div>').join('') +
          '</div><button class="btn" style="margin-top:12px" onclick="resetQuiz()">انجام دوباره آزمون</button></div>') +
      '</section>';
  }

  window.STATE_SET_SEARCH = function (v) { STATE.cadreSearch = v; render(); };
  window.STATE_SET_FAQ = function (v) { STATE.faqSearch = v; render(); };

  function renderGuide() {
    const selB = ST.campusNodes.find((n) => n.id === STATE.selectedBuildingId) || ST.campusNodes[0];
    const startNode = ST.campusNodes.find((n) => n.id === 'basij-desks') || ST.campusNodes[0];
    const lobbyNode = ST.campusNodes.find((n) => n.id === 'lobby') || startNode;
    const route = selB.id !== startNode.id
      ? (selB.id === lobbyNode.id
          ? ('M ' + startNode.x + ' ' + startNode.y + ' L ' + lobbyNode.x + ' ' + lobbyNode.y)
          : ('M ' + startNode.x + ' ' + startNode.y + ' Q ' + lobbyNode.x + ' ' + lobbyNode.y + ', ' + selB.x + ' ' + selB.y))
      : '';
    const fq = normFa(STATE.faqSearch);
    const visFaqs = DATA.faqs.filter((f) => !fq || normFa(f.question + ' ' + f.answer + ' ' + f.category).includes(fq));

    return '<section class="hero">' + latticeSvg(0.07) + '<div class="z1"><p class="kicker">اطلاعیه رسمی ثبت‌نام ۱۴۰۵–۱۴۰۶ · بروزرسانی ' + esc(ST.uniContact.updatedJalali) + '</p><h1>زمان‌بندی ۱ تا ۳ آذر، مدارک ۲۱‌گانه، شهریه و نقشه دانشگاه</h1><p class="muted">آدرس: ' + esc(ST.uniContact.address) + ' · تماس ضروری: ' + esc(ST.uniContact.emergencyPhones.join(' — ')) + '</p></div></section>' +
      '<section class="section"><h2>۰۰. برنامه رسمی ثبت‌نام حضوری بر اساس رشته (ساعت ۰۸:۰۰ تا ۱۴:۰۰)</h2><div class="grid g3">' +
        ST.regDays.map((d, idx) => '<div class="card"><p class="kicker">روز ' + toFa(idx+1) + ' · ' + esc(d.timeRange) + '</p><h3>' + esc(d.dayTitle) + '</h3><div class="pills" style="margin-top:10px">' + d.majors.map((m) => '<span class="tab-chip">' + esc(m) + '</span>').join('') + '</div></div>').join('') +
      '</div></section>' +

      '<section class="section"><h2>۰۱. چک‌لیست تعاملی مراحل ثبت‌نام</h2><div class="grid g2">' +
        ST.checklist.map((st, i) => {
          const done = STATE.checkedSteps.includes(st.id);
          return '<button class="check-item ' + (done ? 'done' : '') + '" onclick="toggleStep(\\'' + st.id + '\\')">' +
            '<span class="check-box">' + (done ? '✓' : toFa(i+1)) + '</span>' +
            '<div><strong>' + esc(st.title) + '</strong><p class="muted" style="font-size:13px;margin:4px 0">' + esc(st.description) + '</p><span class="muted" style="font-size:11px">' + esc(st.location) + ' · ' + esc(st.duration) + '</span></div></button>';
        }).join('') +
      '</div></section>' +

      '<section class="section card"><p class="kicker">مسیر کامل ثبت‌نام حضوری (ویدیوی راهنما در نسخه آنلاین سایت قابل پخش است)</p><h2>۰۱.۵ گام‌های حضوری روز ثبت‌نام (گام ۰ بسیج تا گام ۱۲)</h2>' +
        '<div class="card-sm" style="border-color:#22d3ee;background:rgba(34,211,238,0.1);font-size:13px">' + esc(ST.guideVideoNotice) + '</div>' +
        '<div class="grid g2">' +
          ST.onsiteSteps.map((s) => '<div class="card-sm" style="' + (s.isNewThisYear ? 'border-color:#22d3ee;background:rgba(34,211,238,0.08)' : '') + '"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px"><strong style="color:' + (s.isNewThisYear ? '#22d3ee' : 'var(--gold)') + '">' + esc(s.stepLabel) + (s.badge ? ' · ' + esc(s.badge) : '') + '</strong>' + (s.videoTimeLabel ? '<span class="muted" style="font-size:11px">' + esc(s.videoTimeLabel) + '</span>' : '') + '</div><strong style="font-size:13px;display:block">' + esc(s.title) + '</strong><p class="muted" style="font-size:12px;margin:4px 0 0">' + esc(s.description) + '</p>' + (s.subSteps ? '<p style="font-size:11px;margin:6px 0 0;color:var(--gold)">' + esc(s.subSteps.join(' · ')) + '</p>' : '') + '</div>').join('') +
        '</div></section>' +

      '<section class="section"><h2>۰۲. مدارک لازم ثبت‌نام حضوری (' + toFa(ST.documents.length) + ' بند رسمی)</h2><div class="grid g3">' +
        ST.documents.map((doc) => '<div class="card-sm"><p class="kicker">' + toFa(doc.order) + ' · ' + esc(doc.groupTag) + '</p><strong style="font-size:13px">' + esc(doc.title) + '</strong><p class="muted" style="font-size:12px;margin:4px 0 0">' + esc(doc.note) + '</p></div>').join('') +
      '</div></section>' +

      '<section class="section card"><p class="kicker">دوره نوبت دوم (شبانه) ورودی ۱۴۰۵–۱۴۰۶ (ریال)</p><h2>۰۳. جدول رسمی شهریه دوره شبانه</h2>' +
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;text-align:right"><thead><tr style="border-bottom:1px solid var(--line);color:var(--gold)"><th style="padding:8px">گروه آموزشی</th><th style="padding:8px">ثابت نیمسال</th><th style="padding:8px">عمومی</th><th style="padding:8px">پایه</th><th style="padding:8px">تخصصی</th><th style="padding:8px">عملی/آزمایشگاهی</th><th style="padding:8px">پروژه</th></tr></thead><tbody>' +
        ST.nightTuition.map((r) => '<tr style="border-bottom:1px solid var(--line)"><td style="padding:8px;font-weight:700">' + esc(r.group) + '</td><td style="padding:8px;color:var(--gold);font-weight:700">' + esc(r.fixedPerTerm) + '</td><td style="padding:8px">' + esc(r.generalUnit) + '</td><td style="padding:8px">' + esc(r.basicUnit) + '</td><td style="padding:8px">' + esc(r.specializedUnit) + '</td><td style="padding:8px">' + esc(r.practicalHour) + '</td><td style="padding:8px">' + esc(r.project) + '</td></tr>').join('') +
        '</tbody></table></div></section>' +

      '<section class="section card"><p class="kicker">امور تغذیه و سلف سرویس دانشگاه · مبالغ به هزار تومان</p><h2>۰۳.۵ جدول تعرفه رسمی یارانه غذای دانشجویی</h2>' +
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;text-align:right"><thead><tr style="border-bottom:1px solid var(--line);color:var(--gold)"><th style="padding:8px;text-align:center">ردیف</th><th style="padding:8px">دانشجویان واجد شرایط دریافت یارانه غذای دانشجویی</th><th style="padding:8px;text-align:center">غذای پرهزینه</th><th style="padding:8px;text-align:center">غذای متوسط</th><th style="padding:8px;text-align:center">صبحانه</th></tr></thead><tbody>' +
        ST.foodPricing.map((f) => '<tr style="border-bottom:1px solid var(--line)' + ((f.row==='۱'||f.row==='۶')?';background:var(--gold-soft)':'') + '"><td style="padding:8px;text-align:center;color:var(--gold);font-weight:700">' + esc(f.row) + '</td><td style="padding:8px;font-weight:600">' + esc(f.group) + '</td><td style="padding:8px;text-align:center;color:var(--gold);font-weight:800">' + esc(f.highCost) + ' هزار ت</td><td style="padding:8px;text-align:center;font-weight:700">' + esc(f.mediumCost) + ' هزار ت</td><td style="padding:8px;text-align:center" class="muted">' + esc(f.lowCostBreakfast) + ' هزار ت</td></tr>').join('') +
        '</tbody></table></div></section>' +

      '<section class="section"><h2>۰۴. نقشه تعاملی ساختمان اصلی دانشگاه و نقاط کلیدی ثبت‌نام</h2>' +
      '<div class="bento">' +
        '<div class="card span7">' +
          '<div style="border-radius:16px;overflow:hidden;background:#061815;border:1px solid var(--line)">' +
          '<svg viewBox="0 0 760 480" style="width:100%;height:auto;display:block">' +
            '<g transform="rotate(-32 380 232)">' +
              '<rect x="172" y="138" width="212" height="196" rx="12" fill="#0d2a24" stroke="rgba(222,177,84,0.42)" stroke-width="2"/>' +
              '<rect x="216" y="182" width="124" height="108" rx="8" fill="#071916" stroke="rgba(94,234,212,0.28)" stroke-width="1.3"/>' +
              '<rect x="378" y="96" width="218" height="202" rx="12" fill="#0d2a24" stroke="rgba(222,177,84,0.42)" stroke-width="2"/>' +
              '<rect x="424" y="140" width="126" height="114" rx="8" fill="#071916" stroke="rgba(94,234,212,0.28)" stroke-width="1.3"/>' +
              '<rect x="366" y="176" width="52" height="104" rx="6" fill="#133830" stroke="rgba(222,177,84,0.35)" stroke-width="1.4"/>' +
            '</g>' +
            (route ? '<path d="' + route + '" fill="none" stroke="#deb154" stroke-width="3.2" stroke-dasharray="8 6"/>' : '') +
            ST.campusNodes.map((n, idx) => {
              const s = n.id === selB.id;
              return '<g transform="translate(' + n.x + ',' + n.y + ')" style="cursor:pointer" onclick="selectBuilding(\\'' + n.id + '\\')">' +
                '<circle r="' + (s ? 18 : 14) + '" fill="' + n.color + '" stroke="' + (s ? '#ffffff' : '#061815') + '" stroke-width="' + (s ? 3 : 2) + '"/>' +
                '<text y="4.5" text-anchor="middle" fill="#061613" font-size="12" font-weight="900">' + toFa(idx+1) + '</text>' +
              '</g>';
            }).join('') +
          '</svg></div>' +
          '<div class="pills" style="margin-top:12px">' + ST.campusNodes.map((n, idx) => '<button class="tab-chip ' + (n.id===selB.id?'active':'') + '" onclick="selectBuilding(\\'' + n.id + '\\')"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + n.color + ';margin-left:6px;vertical-align:middle"></span>' + toFa(idx+1) + '. ' + esc(n.shortLabel) + '</button>').join('') + '</div>' +
        '</div>' +
        '<div class="card span5"><p class="kicker"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + selB.color + ';margin-left:6px;vertical-align:middle"></span>' + esc(selB.colorLabel) + ' · ' + esc(selB.category) + '</p><h3>' + esc(selB.label) + '</h3>' +
          '<p class="muted" style="font-size:13px;margin-top:8px">' + esc(selB.description) + '</p><hr class="divider"/>' +
          '<p style="font-size:13px"><strong>طبقه / موقعیت:</strong> ' + esc(selB.floor) + '</p>' +
          '<p style="font-size:13px"><strong>ساعت فعالیت:</strong> ' + esc(selB.hours) + '</p>' +
          '<p style="font-size:13px"><strong>نکته کاربردی:</strong> ' + esc(selB.tip) + '</p>' +
        '</div>' +
      '</div></section>' +

      '<section class="section"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px">' +
        '<h2>۰۵. سوالات متداول (' + toFa(visFaqs.length) + ')</h2>' +
        '<input class="input" style="max-width:300px" placeholder="جستجو در سوالات..." value="' + esc(STATE.faqSearch) + '" oninput="STATE_SET_FAQ(this.value)" />' +
      '</div><div class="grid g2">' +
        visFaqs.map((f) => '<article class="card"><p class="kicker">' + esc(f.category) + '</p><h3>' + esc(f.question) + '</h3><p class="muted" style="font-size:13px;margin:8px 0 0">' + esc(f.answer) + '</p></article>').join('') +
      '</div></section>';
  }

  function renderDorms() {
    const activeShuttle = STATE.shuttleTab === 'sisters'
      ? ST.shuttle.sistersRegular
      : (STATE.shuttleTab === 'brothers' ? ST.shuttle.brothersRegular : ST.shuttle.brothersThursday);

    return '<section class="hero">' + latticeSvg(0.07) + '<div class="z1"><p class="kicker">اسکان و رفاه دانشجویی · اطلاعیه رسمی ' + esc(ST.uniContact.updatedJalali) + '</p><h1>خوابگاه‌های پروین اعتصامی و خاتم‌الانبیاء، سرویس دانشگاه و سلامت</h1><p class="muted">نیاز به پیش‌ثبت‌نام نیست! بلافاصله پس از ثبت‌نام حضوری و دریافت کارت دانشجویی امکان ثبت‌نام و حضور در خوابگاه فراهم است.</p></div></section>' +
      '<section class="section"><div class="grid g2">' +
      ST.dormFees.map((t) => '<article class="card"><p class="kicker">' + esc(t.genderLabel) + ' · ' + esc(t.contactPerson) + ' (' + esc(t.contactPhone) + ')</p><h2>' + esc(t.dormName) + '</h2><p class="muted" style="font-size:12px;margin:4px 0 10px">' + esc(t.note) + '</p>' +
        t.rows.map((r) => '<div class="card-sm" style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px"><span>' + esc(r.roomType) + '</span><strong class="gold">' + esc(r.feeToman) + '</strong></div>').join('') +
        '<hr class="divider"/><p class="muted" style="font-size:12px;margin:0 0 8px"><strong>نشانی دقیق:</strong> ' + esc(t.address) + ' · <span dir="ltr" class="gold">Plus: ' + esc(t.plusCode) + '</span></p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-emerald" href="' + esc(t.neshanUrl) + '" target="_blank" rel="noopener noreferrer">مسیریابی در نشان</a><a class="btn" href="' + esc(t.baladUrl) + '" target="_blank" rel="noopener noreferrer">مسیریابی در بلد</a></div>' +
      '</article>').join('') +
      '</div></section>' +

      '<section class="section card"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px">' +
        '<div><p class="kicker">ایستگاه داخل شهر: ' + esc(ST.shuttle.cityStation) + '</p><h2>برنامه زمان‌بندی سرویس ایاب و ذهاب دانشجویان</h2></div>' +
        '<div class="pills">' +
          '<button class="tab-chip ' + (STATE.shuttleTab==='sisters'?'active':'') + '" onclick="setShuttleTab(\\'sisters\\')">دختران · روزهای عادی</button>' +
          '<button class="tab-chip ' + (STATE.shuttleTab==='brothers'?'active':'') + '" onclick="setShuttleTab(\\'brothers\\')">پسران · روزهای عادی</button>' +
          '<button class="tab-chip ' + (STATE.shuttleTab==='thursday'?'active':'') + '" onclick="setShuttleTab(\\'thursday\\')">پسران · پنج‌شنبه‌ها</button>' +
        '</div></div>' +
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;text-align:center"><thead><tr style="border-bottom:1px solid var(--line);color:var(--gold)"><th style="padding:8px">' + esc(activeShuttle.fromOriginLabel) + '</th><th style="padding:8px">' + esc(activeShuttle.fromCampusLabel) + '</th></tr></thead><tbody>' +
          activeShuttle.rows.map((r) => '<tr style="border-bottom:1px solid var(--line)"><td style="padding:8px;font-weight:700">' + esc(r.fromOrigin) + '</td><td style="padding:8px;font-weight:700;color:var(--gold)">' + esc(r.fromCampus) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<p class="muted" style="font-size:12px;margin:0">' + esc(ST.shuttle.ruleNote) + ' · ایستگاه داخل شهر: <strong class="gold">' + esc(ST.shuttle.cityStation) + '</strong></p>' +
      '</section>' +

      '<section class="section"><h2>مرکز مشاوره، سلامت و سبک زندگی (پزشک رایگان و مشاور خوابگاه)</h2><div class="grid g2">' +
        ST.wellness.map((w) => '<article class="card"><p class="kicker">' + esc(w.badge) + '</p><h3>' + esc(w.title) + '</h3><p class="gold" style="font-size:13px;font-weight:700;margin:6px 0">' + esc(w.provider) + '</p><p class="muted" style="font-size:13px;margin:0 0 10px">' + esc(w.serviceDetail) + '</p><div class="grid g2 card-sm" style="font-size:12px"><div>زمان: <strong>' + esc(w.schedule) + '</strong></div><div>مکان: <strong>' + esc(w.location) + '</strong></div></div></article>').join('') +
      '</div></section>' +

      '<section class="section"><div class="grid g2">' +
      DATA.dorms.map((d) => '<article class="card"><p class="kicker">' + esc(d.gender) + ' · ' + esc(d.supervisorPhone) + '</p><h2>' + esc(d.name) + '</h2>' +
        '<p class="muted" style="font-size:13px;margin:8px 0">آدرس: ' + esc(d.address) + '</p>' +
        '<div class="grid g2 card-sm" style="font-size:12px"><div>تعرفه: <strong>' + esc(d.monthlyFee) + '</strong></div><div>نوع اتاق: <strong>' + esc(d.roomType) + '</strong></div></div>' +
        '<p style="font-size:12px;margin-top:10px"><strong>امکانات و نرخ‌ها:</strong> ' + esc((d.facilities||[]).join(' · ')) + '</p></article>'
      ).join('') + '</div></section>';
  }

  function renderHeyat() {
    return '<section class="hero">' + latticeSvg(0.08) + '<div class="z1"><p class="kicker">' + esc(ST.heyatInfo.mainVenue) + ' · کانال رسمی ' + esc(ST.heyatInfo.telegramHandle) + '</p><h1>' + esc(ST.heyatInfo.officialName) + ' و سامانه ژتون صبحانه</h1><p class="muted">' + esc(S.heyatIntroText) + '</p><p class="gold" style="font-size:13px;margin:10px 0 0">' + esc(ST.heyatInfo.motto) + '</p></div></section>' +
      '<section class="section"><h2>قرارهای ثابت هفتگی هیئت</h2><div class="grid g2">' +
      ST.heyatWeekly.map((w) => '<article class="card"><p class="kicker">' + esc(w.dayLabel) + ' · ' + esc(w.timeRange) + '</p><h3>' + esc(w.title) + '</h3><p class="muted" style="font-size:13px;margin:8px 0">' + esc(w.description) + '</p><p style="font-size:12px;margin:4px 0"><strong>مکان:</strong> ' + esc(w.location) + ' · <strong>مخاطب:</strong> ' + esc(w.audience) + '</p>' + (w.shuttleInfo ? '<div class="card-sm" style="margin-top:8px;font-size:12px">' + esc(w.shuttleInfo) + '</div>' : '') + '</article>').join('') +
      '</div></section>' +
      '<section class="section card"><p class="kicker">نمایش آفلاین سامانه ژتون صبحانه</p><h2>کارت دیجیتال QR صبحانه</h2><p class="muted" style="font-size:13px">در نسخه آنلاین روی سرور، نوورودی با وارد کردن نام، نام‌خانوادگی و تاریخ تولد شمسی کارت QR اختصاصی خودش را دریافت می‌کند و مسئول توزیع با اسکنر آفلاین آن را ثبت می‌نماید.</p></section>' +
      '<section class="section"><h2>تقویم برنامه‌ها و گزارش مراسم‌های ترم پاییز ۱۴۰۵ (' + toFa(DATA.heyatPrograms.length) + ')</h2><div class="grid g3">' +
      DATA.heyatPrograms.map((p) => '<article class="card"><p class="kicker">' + esc(p.category) + ' · ' + esc(p.dateJalali) + '</p><h3>' + esc(p.title) + '</h3><p class="muted" style="font-size:13px;margin:8px 0">' + esc(p.description) + '</p><div class="muted" style="font-size:12px;line-height:1.8"><div><strong>ساعت:</strong> ' + esc(p.timeRange) + '</div><div><strong>مکان:</strong> ' + esc(p.location) + '</div>' + (p.speaker && p.speaker !== '—' ? '<div><strong>سخنران:</strong> ' + esc(p.speaker) + '</div>' : '') + (p.maddah && p.maddah !== '—' ? '<div><strong>مداح:</strong> ' + esc(p.maddah) + '</div>' : '') + '</div></article>').join('') +
      '</div></section>';
  }

  function renderAnnouncements() {
    return '<section class="hero">' + latticeSvg(0.07) + '<div class="z1"><p class="kicker">اخبار رسمی ثبت‌نام</p><h1>اطلاعیه‌ها و تقویم اجرایی</h1></div></section>' +
      '<section class="section">' +
      DATA.announcements.map((a) => '<article class="card"><p class="kicker">' + esc(a.category) + ' · ' + esc(a.dateJalali) + (a.location ? ' · ' + esc(a.location) : '') + '</p><h3>' + esc(a.title) + '</h3><p class="muted" style="font-size:14px">' + esc(a.summary) + '</p><p class="muted" style="font-size:13px;margin-bottom:0">' + esc(a.body) + '</p></article>').join('') +
      '</section>';
  }

  function renderReview() {
    const pre = STATE.prefillFeedbackSection || 'طراحی و گرافیک کلی';
    return '<section class="hero">' + latticeSvg(0.08) + '<div class="z1"><p class="kicker">میز کار بازبینی تیمی (آفلاین)</p><h1>ثبت نظرات بچه‌ها و فهرست موارد نیازمند تکمیل</h1>' +
      '<p class="muted">هر کدام از بچه‌ها می‌تواند نظرات، متن‌های واقعی، نام دبیر کانون‌ها یا تغییرات پیشنهادی را اینجا ثبت کند و در نهایت یکجا کپی کرده و در گروه ایتا/تلگرام ارسال کند.</p></div></section>' +

      '<section class="section"><div class="bento">' +
        '<div class="card span5"><p class="kicker">ثبت نظر یا اطلاعات واقعی</p><h2>فرم ثبت یادداشت تیمی</h2>' +
          '<form onsubmit="addTeamNote(event)" style="display:flex;flex-direction:column;gap:10px;margin-top:14px">' +
            '<input id="fb-name" class="input" placeholder="نام تو (مثلاً: مهدی / دبیر کانون علمی)" />' +
            '<select id="fb-section" class="input">' +
              ['طراحی و گرافیک کلی','صفحه اصلی و شعارها','بسیج و چارت ۲۵ کانون','هیئت و ژتون صبحانه','خوابگاه‌ها','راهنما و نقشه دانشگاه','اطلاعیه‌ها و لینک کانال‌ها', pre].filter((v,i,a)=>a.indexOf(v)===i).map((opt) => '<option value="' + esc(opt) + '" ' + (opt === pre ? 'selected' : '') + '>' + esc(opt) + '</option>').join('') +
            '</select>' +
            '<textarea id="fb-text" class="input" rows="4" required placeholder="نظر، اصلاحیه یا اطلاعات واقعی (مثلاً نام دبیر، زمان جلسات، لینک کانال...) را بنویس..."></textarea>' +
            '<button type="submit" class="btn btn-gold">افزودن به لیست نظرات</button>' +
          '</form>' +
        '</div>' +

        '<div class="card span7"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px">' +
          '<h2>نظرات ثبت‌شده روی این گوشی (' + toFa(STATE.teamNotes.length) + ')</h2>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn-gold" onclick="copyTeamNotes()">کپی برای ارسال در ایتا/تلگرام</button>' +
            '<button class="btn" onclick="downloadTeamNotes()">دانلود فایل متنی (.txt)</button>' +
          '</div></div><hr class="divider"/>' +
          (STATE.teamNotes.length === 0
            ? '<p class="muted" style="font-size:13px">هنوز نظری ثبت نشده است. از فرم کنار صفحه اولین نظر یا اطلاعات تکمیلی را اضافه کن.</p>'
            : '<div style="display:flex;flex-direction:column;gap:10px">' + STATE.teamNotes.map((n) =>
                '<div class="card-sm"><div style="display:flex;justify-content:space-between;align-items:center;font-size:12px"><strong class="gold">' + esc(n.sec) + ' · ' + esc(n.reviewer) + '</strong><button class="tab-chip" onclick="deleteTeamNote(' + n.id + ')">حذف</button></div><p style="margin:6px 0 0;font-size:13px;white-space:pre-wrap">' + esc(n.text) + '</p></div>'
              ).join('') + '</div>') +
        '</div>' +
      '</div></section>' +

      '<section class="section card"><p class="kicker">چک‌لیست خودکار محتوای باقی‌مانده</p><h2>فهرست موارد دارای برچسب [نیاز به تکمیل] (' + toFa(DATA.todos.length) + ' مورد)</h2>' +
      '<div class="grid g2" style="margin-top:10px">' +
      DATA.todos.map((t) => '<div class="card-sm"><p class="kicker">' + esc(t.section) + '</p><strong>' + esc(t.label) + '</strong><p class="muted" style="font-size:12px;margin:4px 0 0">' + esc(t.currentValue) + '</p></div>').join('') +
      '</div></section>';
  }

  function render() {
    const root = document.getElementById('app-root');
    if (STATE.page === 'home') root.innerHTML = renderHome();
    else if (STATE.page === 'basij') root.innerHTML = renderBasij();
    else if (STATE.page === 'guide') root.innerHTML = renderGuide();
    else if (STATE.page === 'dorms') root.innerHTML = renderDorms();
    else if (STATE.page === 'heyat') root.innerHTML = renderHeyat();
    else if (STATE.page === 'announcements') root.innerHTML = renderAnnouncements();
    else root.innerHTML = renderReview();
  }

  render();
})();
  </script>
</body>
</html>`;
}
