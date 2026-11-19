import type { CadreItem } from '../types/portal';

/**
 * سیستم هویت بصری ۶ محور رسمی بسیج دانشجویی (برگرفته از چارت قرار قیام ۹)
 * هر محور دارای رنگ ثانویه هماهنگ با تم زمردی/طلایی، توضیح کوتاه و ترتیب نمایش ثابت است.
 */
export interface AxisVisualMeta {
  key: string;
  title: string;
  shortLabel: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  iconKey: 'book' | 'heart' | 'scale' | 'palette' | 'cpu' | 'globe';
}

export const BASIJ_AXIS_META: AxisVisualMeta[] = [
  {
    key: 'فرهنگی',
    title: 'محور فرهنگی',
    shortLabel: 'فرهنگی',
    subtitle: 'معنویت، هویت، کتاب، اردو و سبک زندگی',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.14)',
    accentBorder: 'rgba(52, 211, 153, 0.38)',
    iconKey: 'book',
  },
  {
    key: 'جهادی',
    title: 'محور جهادی',
    shortLabel: 'جهادی',
    subtitle: 'خدمت‌رسانی تخصصی، مواسات و محرومیت‌زدایی',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.14)',
    accentBorder: 'rgba(245, 158, 11, 0.38)',
    iconKey: 'heart',
  },
  {
    key: 'سیاسی',
    title: 'محور سیاسی',
    shortLabel: 'سیاسی',
    subtitle: 'آزاداندیشی، مطالبه‌گری صنفی و تحلیل مسائل روز',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.14)',
    accentBorder: 'rgba(96, 165, 250, 0.38)',
    iconKey: 'scale',
  },
  {
    key: 'هنر و رسانه',
    title: 'محور هنر و رسانه',
    shortLabel: 'هنر و رسانه',
    subtitle: 'گرافیک، تدوین، نشریه، تئاتر و فضای مجازی',
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.14)',
    accentBorder: 'rgba(244, 114, 182, 0.38)',
    iconKey: 'palette',
  },
  {
    key: 'علمی',
    title: 'محور علمی',
    shortLabel: 'علمی',
    subtitle: 'هسته‌های مسئله‌محور، بوت‌کمپ، فناوری و پیشرفت',
    accent: '#2dd4bf',
    accentSoft: 'rgba(45, 212, 191, 0.14)',
    accentBorder: 'rgba(45, 212, 191, 0.38)',
    iconKey: 'cpu',
  },
  {
    key: 'سایر موضوعات',
    title: 'سایر موضوعات',
    shortLabel: 'سایر موضوعات',
    subtitle: 'بین‌الملل و مقاومت، زن و خانواده، تربیت بدنی',
    accent: '#fb923c',
    accentSoft: 'rgba(251, 146, 60, 0.14)',
    accentBorder: 'rgba(251, 146, 60, 0.38)',
    iconKey: 'globe',
  },
];

export const AXIS_META_MAP: Record<string, AxisVisualMeta> = Object.fromEntries(
  BASIJ_AXIS_META.map((m) => [m.key, m])
);

export function getAxisMeta(category: string): AxisVisualMeta {
  return AXIS_META_MAP[category] || BASIJ_AXIS_META[0];
}

/**
 * پیشنهاد هوشمند کانون‌ها بر اساس رشته تحصیلی نوورود در مجتمع آموزش عالی گناباد
 */
export interface MajorRecommendation {
  id: string;
  label: string;
  reason: string;
  preferredNames: string[];
}

export const MAJOR_RECOMMENDATIONS: MajorRecommendation[] = [
  {
    id: 'all',
    label: 'همه رشته‌ها',
    reason: 'نمایش کامل همه ۲۵ کانون در ۶ محور تخصصی بدون فیلتر رشته‌ای.',
    preferredNames: [],
  },
  {
    id: 'computer',
    label: 'مهندسی کامپیوتر',
    reason: 'مناسب برای تقویت مهارت‌های برنامه‌نویسی، هوش مصنوعی، تولیدات دیجیتال و شبکه‌سازی فناورانه.',
    preferredNames: ['کانون پژوهش و فناوری', 'کانون تولیدات رسانه‌ای', 'کانون جبهه مجازی', 'کانون پیشران علمی'],
  },
  {
    id: 'electrical',
    label: 'مهندسی برق',
    reason: 'هم‌راستا با هسته‌های رباتیک، پروژه‌های آزمایشگاهی، بازدیدهای صنعتی و کلاس‌های مهارتی.',
    preferredNames: ['کانون پژوهش و فناوری', 'کانون پیشران علمی', 'کانون امید و پیشرفت', 'هیئت'],
  },
  {
    id: 'civil',
    label: 'مهندسی عمران',
    reason: 'فرصت عالی برای تجربه میدانی عمرانی در اردوهای جهادی، پروژه‌های بومی و مطالبه‌گری زیرساختی.',
    preferredNames: ['کانون هجرت', 'کانون پیشران علمی', 'کانون کارآمدسازی و عدالتخواهی', 'کانون امید و پیشرفت'],
  },
  {
    id: 'mechanics',
    label: 'مهندسی مکانیک',
    reason: 'مناسب برای ورود به هسته‌های طراحی و ساخت صنعتی، راهیان پیشرفت و بوت‌کمپ‌های تخصصی.',
    preferredNames: ['کانون پژوهش و فناوری', 'کانون امید و پیشرفت', 'کانون پیشران علمی', 'کانون هجرت'],
  },
  {
    id: 'industrial',
    label: 'مهندسی صنایع و مدیریت',
    reason: 'تقویت تحلیل سیستم‌ها، اقتصاد مقاومتی، سازماندهی کارزارها و مدیریت پویش‌های دانشجویی.',
    preferredNames: ['کانون جنگ اقتصادی', 'کانون کارآمدسازی و عدالتخواهی', 'کانون پویش‌های جهادی و خیریه', 'کانون مطالبات صنفی دانشگاهی'],
  },
  {
    id: 'science',
    label: 'علوم پایه و سایر رشته‌ها',
    reason: 'ترکیب پژوهش، نویسندگی، حلقه‌های آزاداندیشی و همراهی آموزشی با دانشجویان جدیدالورود.',
    preferredNames: ['کانون پیشران علمی', 'کانون گفتمان‌سازی و آزاداندیشی', 'کانون ادبی', 'کانون قرآن و عترت'],
  },
];

/**
 * تطبیق کانون‌ها با رشته انتخاب‌شده (تابع خالص برای تست واحد و استفاده در چارت)
 */
export function matchCadresByMajor(majorId: string, cadres: CadreItem[]): CadreItem[] {
  const major = MAJOR_RECOMMENDATIONS.find((m) => m.id === majorId);
  if (!major || major.preferredNames.length === 0) return [];
  const preferredSet = new Set(major.preferredNames);
  return cadres.filter((c) => preferredSet.has(c.name));
}

/**
 * گروه‌بندی مرتب کانون‌ها بر اساس ۶ محور رسمی چارت
 */
export function groupCadresByAxis(
  cadres: CadreItem[]
): Array<{ meta: AxisVisualMeta; items: CadreItem[] }> {
  return BASIJ_AXIS_META.map((meta) => ({
    meta,
    items: cadres.filter((c) => c.category === meta.key),
  })).filter((g) => g.items.length > 0);
}

/**
 * افزودن یا حذف یک کانون از فهرست نشان‌شده‌های کاربر بدون تکرار
 */
export function toggleSavedCadreId(savedIds: number[], cadreId: number): number[] {
  if (savedIds.includes(cadreId)) {
    return savedIds.filter((id) => id !== cadreId);
  }
  return [...savedIds, cadreId];
}
