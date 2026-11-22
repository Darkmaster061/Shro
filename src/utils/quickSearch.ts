import {
  HEYAT_WEEKLY_SCHEDULE,
  OFFICIAL_REGISTRATION_DAYS,
  REGISTRATION_ONSITE_STEPS,
} from '../data/orientation';
import { OFFICIAL_BASIJ_CADRES } from '../data/basijCadresOfficial';
import { normalizePersian, toPersianDigits } from './persian';

export type QuickSearchCategory =
  | 'روز ثبت‌نام رشته'
  | 'دسترسی سریع'
  | 'ایستگاه ثبت‌نام'
  | 'کانون بسیج'
  | 'هیئت محبان‌الحسین';

export interface QuickSearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: QuickSearchCategory;
  to: string;
  keywords: string;
}

export interface QuickIntentShortcut {
  id: string;
  label: string;
  hint: string;
  to?: string;
  prefillQuery?: string;
}

export const QUICK_INTENT_SHORTCUTS: QuickIntentShortcut[] = [
  {
    id: 'intent-major-day',
    label: 'روز ثبت‌نام رشته‌ام کیه؟',
    hint: 'نام رشته‌ات را بنویس (مثلاً کامپیوتر، برق، حقوق...)',
    prefillQuery: 'مهندسی',
  },
  {
    id: 'intent-coupon',
    label: 'ژتون صبحانه بگیرم',
    hint: 'احراز شماره دانشجویی ۴۰۵ و کارت QR',
    to: '/coupon',
  },
  {
    id: 'intent-dorms',
    label: 'خوابگاه و وسایل لازم',
    hint: 'پروین اعتصامی، خاتم‌الانبیاء و چک‌لیست وسایل',
    to: '/dorms',
  },
  {
    id: 'intent-steps',
    label: 'مراحل و نقشه روز اول',
    hint: '۱۳ ایستگاه ثبت‌نام، مدارک و نقشه ساختمان‌ها',
    to: '/guide#steps',
  },
];

const CORE_SHORTCUTS: QuickSearchItem[] = [
  {
    id: 'core-coupon',
    title: 'دریافت ژتون صبحانه (کارت QR یک‌نوبته)',
    subtitle: 'ثبت مشخصات پس از تایید شماره دانشجویی در میز استقبال لابی',
    category: 'دسترسی سریع',
    to: '/coupon',
    keywords: 'ژتون صبحانه غذا تغذیه qr بارکد ۴۰۵ کارت مهمان هیئت',
  },
  {
    id: 'core-guide-steps',
    title: 'مراحل ۱۳گانه ثبت‌نام حضوری و مدارک لازم',
    subtitle: 'از میز استقبال بسیج در لابی تا دریافت کارت دانشجویی و خوابگاه',
    category: 'دسترسی سریع',
    to: '/guide#steps',
    keywords: 'ثبت نام مدارک چک لیست گام مراحل کارت ملی شناسنامه عکس کارنامه',
  },
  {
    id: 'core-campus-map',
    title: 'نقشه تعاملی ساختمان‌های دانشگاه گناباد',
    subtitle: 'یافتن سریع سالن مرکزی، آموزش، سلف، مسجد و خوابگاه‌ها',
    category: 'دسترسی سریع',
    to: '/guide#map',
    keywords: 'نقشه ساختمان آدرس مسیر سالن مرکزی لابی سلف مسجد کجاست',
  },
  {
    id: 'core-faq',
    title: 'سوالات متداول (FAQ) و ارسال پرسش',
    subtitle: 'پاسخ سوالات پرتکرار نوورودی‌ها و خانواده‌ها درباره ثبت‌نام و خوابگاه',
    category: 'دسترسی سریع',
    to: '/guide#faq',
    keywords: 'سوال پرسش جواب راهنما ابهام مشکل تماس faq',
  },
  {
    id: 'core-dorm-girls',
    title: 'سرای دانشجویی پروین اعتصامی (خوابگاه خواهران)',
    subtitle: 'امکانات، قوانین، گالری تصاویر، تلفن ۰۵۱۵۷۲۰۲۱۴۴ و مسیریابی نشان/بلد',
    category: 'دسترسی سریع',
    to: '/dorms',
    keywords: 'خوابگاه خواهران دختران پروین اعتصامی اتاق اسکان سرای دانشجویی',
  },
  {
    id: 'core-dorm-boys',
    title: 'سرای دانشجویی خاتم‌الانبیاء (خوابگاه برادران)',
    subtitle: 'امکانات، قوانین، گالری تصاویر، تلفن ۰۵۱۵۷۲۰۲۱۴۵ و مسیریابی نشان/بلد',
    category: 'دسترسی سریع',
    to: '/dorms',
    keywords: 'خوابگاه برادران پسران خاتم الانبیا اتاق اسکان سرای دانشجویی',
  },
  {
    id: 'core-gallery',
    title: 'گالری ۳۴ تصویر واقعی از دانشگاه و خوابگاه‌ها',
    subtitle: 'تصاویر پردیس، دانشکده‌ها، کتابخانه، مسجد و فضاهای خوابگاهی',
    category: 'دسترسی سریع',
    to: '/gallery',
    keywords: 'عکس تصویر گالری محیط دانشگاه کتابخانه کلاس خوابگاه',
  },
  {
    id: 'core-heyat',
    title: 'هیئت دانشجویی محبان‌الحسین (ع)',
    subtitle: 'بیوگرافی، مراسم‌های هفتگی، پنج شب فاطمیه، صوت مداحی و ۱۰ تیم خادمی',
    category: 'هیئت محبان‌الحسین',
    to: '/heyat',
    keywords: 'هیئت محبان الحسین فاطمیه روضه مداحی صوت چای خادمی مسجد',
  },
  {
    id: 'core-basij',
    title: 'بسیج دانشجویی و چارت ۲۵ کانون تخصصی',
    subtitle: 'عضویت از طریق @Basij_GONABAD و @Basij_khaharan213، تطبیق رشته و آزمون علاقه‌مندی',
    category: 'کانون بسیج',
    to: '/basij',
    keywords: 'بسیج کانون عضویت قرار قیام چارت برادران خواهران جهادی علمی فرهنگی',
  },
  {
    id: 'core-contact',
    title: 'تلفن‌های ضروری و تماس با ما',
    subtitle: 'شماره‌های آموزش، خوابگاه‌ها، تغذیه و کانال‌های رسمی تلگرام و ایتا',
    category: 'دسترسی سریع',
    to: '/contact',
    keywords: 'تلفن شماره تماس ارتباط اضطراری ادمین تلگرام ایتا',
  },
];

let cachedIndex: QuickSearchItem[] | null = null;

/**
 * ساخت فهرست یکپارچه جستجوی آفلاین کل پرتال (رشته‌ها، ۱۳ ایستگاه، ۲۵ کانون، خوابگاه و هیئت)
 */
export function buildQuickSearchIndex(): QuickSearchItem[] {
  if (cachedIndex) return cachedIndex;

  const items: QuickSearchItem[] = [...CORE_SHORTCUTS];

  // ۱. هر ۲۰ رشته رسمی برای پاسخ آنی به «روز ثبت‌نام من کیه؟»
  for (const day of OFFICIAL_REGISTRATION_DAYS) {
    for (const major of day.majors) {
      items.push({
        id: `major-${day.id}-${major}`,
        title: `روز ثبت‌نام ${major}: ${day.dayTitle} (${day.dateJalali})`,
        subtitle: `ساعت مراجعه حضوری: ${day.timeRange} · مشاهده چک‌لیست و مدارک`,
        category: 'روز ثبت‌نام رشته',
        to: '/guide#timeline',
        keywords: `${major} رشته ثبت نام روز موعد تاریخ ${day.dayTitle} ${day.dateJalali}`,
      });
    }
  }

  // ۲. ایستگاه‌های ۱۳گانه روز ثبت‌نام
  for (const step of REGISTRATION_ONSITE_STEPS) {
    items.push({
      id: `step-${step.stepNumber}`,
      title: `${step.stepLabel || `ایستگاه ${toPersianDigits(step.stepNumber)}`}: ${step.title}`,
      subtitle: step.description,
      category: 'ایستگاه ثبت‌نام',
      to: '/guide#steps',
      keywords: `${step.title} ${step.description} ${(step.subSteps || []).join(' ')} ${step.badge || ''} مرحله گام`,
    });
  }

  // ۳. قرارهای هفتگی هیئت
  for (const prog of HEYAT_WEEKLY_SCHEDULE) {
    items.push({
      id: `heyat-${prog.id}`,
      title: `${prog.title} (${prog.dayLabel})`,
      subtitle: `${prog.timeRange} · ${prog.location}`,
      category: 'هیئت محبان‌الحسین',
      to: '/heyat',
      keywords: `${prog.title} ${prog.dayLabel} ${prog.location} ${prog.description} هیئت مراسم`,
    });
  }

  // ۴. ۲۵ کانون بسیج دانشجویی
  for (const cadre of OFFICIAL_BASIJ_CADRES) {
    items.push({
      id: `cadre-${cadre.name}`,
      title: cadre.name,
      subtitle: `محور ${cadre.category} — ${cadre.shortDesc}`,
      category: 'کانون بسیج',
      to: '/basij',
      keywords: `${cadre.name} ${cadre.category} ${cadre.shortDesc} ${cadre.tags.join(' ')} بسیج`,
    });
  }

  cachedIndex = items;
  return items;
}

/**
 * جستجوی فوری و آفلاین فارسی (سازگار با ی/ي، ک/ك و ارقام فارسی/انگلیسی)
 */
export function searchPortalQuick(query: string, limit = 10): QuickSearchItem[] {
  const index = buildQuickSearchIndex();
  const qNorm = normalizePersian(query).trim();
  if (!qNorm) {
    return CORE_SHORTCUTS.slice(0, Math.min(limit, 6));
  }

  const tokens = qNorm.split(/\s+/).filter(Boolean);
  const scored: { item: QuickSearchItem; score: number }[] = [];

  for (const item of index) {
    const titleNorm = normalizePersian(item.title);
    const subNorm = normalizePersian(item.subtitle);
    const kwNorm = normalizePersian(item.keywords);
    const haystack = `${titleNorm} ${subNorm} ${kwNorm}`;

    let score = 0;
    let matchedTokens = 0;

    if (titleNorm.includes(qNorm)) score += 30;
    else if (haystack.includes(qNorm)) score += 16;

    for (const tok of tokens) {
      if (titleNorm.includes(tok)) {
        score += 12;
        matchedTokens += 1;
      } else if (subNorm.includes(tok)) {
        score += 7;
        matchedTokens += 1;
      } else if (kwNorm.includes(tok)) {
        score += 5;
        matchedTokens += 1;
      }
    }

    if (matchedTokens === tokens.length && score > 0) {
      // اولویت ملایم به پاسخ مستقیم روز ثبت‌نام رشته و دسترسی‌های کلیدی
      if (item.category === 'روز ثبت‌نام رشته') score += 6;
      if (item.category === 'دسترسی سریع') score += 4;
      scored.push({ item, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
