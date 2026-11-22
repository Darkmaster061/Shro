import type { CampusPhoto } from './campusGallery';

export type FatemiyehSubCategory =
  | 'all'
  | 'martyr'
  | 'lecture'
  | 'mourning'
  | 'hospitality';

export interface FatemiyehPhoto extends CampusPhoto {
  subCategory: Exclude<FatemiyehSubCategory, 'all'>;
  galleryHighlight?: boolean;
}

export const FATEMIYEH_CATEGORIES: { id: FatemiyehSubCategory; label: string }[] = [
  { id: 'all', label: 'همه تصاویر' },
  { id: 'martyr', label: 'وداع با شهید گمنام' },
  { id: 'lecture', label: 'سخنرانی و منبر' },
  { id: 'mourning', label: 'روضه و سینه‌زنی' },
  { id: 'hospitality', label: 'سفره مادر سادات (س)' },
];

export const FATEMIYEH_EVENT_META = {
  motto: 'هرچه داریم از سر لطف و نگاه فاطمه است',
  title: 'پنج شب مراسم عزاداری ایام فاطمیه',
  organizer: 'هیئت دانشجویی محبان‌الحسین (ع) دانشگاه گناباد',
  speaker: 'حجت‌الاسلام‌والمسلمین فاطمی',
  maddahan: 'کربلایی مهدی میری، کربلایی سجاد سالارباشی و کربلایی سجاد مختاری',
  schedule: 'چهارشنبه ۲۰ آبان‌ماه به مدت پنج شب، از ساعت ۱۹:۴۵',
  shuttle: 'ساعت ۱۹:۰۰ از درب خوابگاه پروین اعتصامی',
  location: 'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
  hospitality: 'میهمان سفره مادر سادات (س)',
  martyrGuest: 'پیکر مطهر شهید گمنام ۱۹ ساله دفاع مقدس — عملیات والفجر مقدماتی (منطقه فکه)',
};

export const FATEMIYEH_VIDEO_REPORT = {
  src: '/assets/heyat/fatemiyeh-report.mp4',
  poster: '/assets/heyat/fatemiyeh-video-poster.webp',
  title: 'مستند گزارش پنج شب عزاداری ایام فاطمیه و وداع با شهید گمنام',
  duration: '۰۲:۲۸',
  producer: 'کانون رسانه مجتمع آموزش عالی گناباد',
  summary:
    'روایت تصویری پنج شب سوگواری هیئت دانشجویی محبان‌الحسین (ع)، استقبال و وداع با پیکر مطهر شهید گمنام عملیات والفجر مقدماتی (فکه) و میهمانی سفره مادر سادات (س) در مسجد حضرت فاطمه زهرا (س).',
};

function makeFatemiyehPhoto(
  slug: string,
  meta: Omit<FatemiyehPhoto, 'id' | 'src' | 'thumbSrc' | 'category'>
): FatemiyehPhoto {
  return {
    id: slug,
    src: `/assets/heyat/${slug}.webp`,
    thumbSrc: `/assets/heyat/${slug}-sm.webp`,
    category: 'spiritual',
    ...meta,
  };
}

/**
 * آرشیو محلی و بهینه‌شده (WebP) گزارش تصویری پنج شب عزاداری ایام فاطمیه
 * هیئت دانشجویی محبان‌الحسین (ع) — مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد
 */
export const FATEMIYEH_PHOTOS: FatemiyehPhoto[] = [
  // ─── وداع با شهید گمنام (۵ تصویر) ───
  makeFatemiyehPhoto('fatemiyeh-01', {
    title: 'میزبانی مسجد دانشگاه از پیکر مطهر شهید گمنام',
    caption:
      'پیکر مطهر شهید گمنام دوران دفاع مقدس در قاب پرچم سه‌رنگ، گلبرگ‌های سرخ و سربندهای یادبود در شب‌های فاطمیه',
    album: 'پنج شب فاطمیه · وداع با شهید گمنام',
    subCategory: 'martyr',
    galleryHighlight: true,
  }),
  makeFatemiyehPhoto('fatemiyeh-02', {
    title: 'شهید گمنام ۱۹ ساله عملیات والفجر مقدماتی (فکه)',
    caption:
      'نشان و مشخصات شهید گمنام میهمان دانشگاه گناباد؛ رزمنده ۱۹ ساله عملیات والفجر مقدماتی در منطقه عملیاتی فکه',
    album: 'پنج شب فاطمیه · وداع با شهید گمنام',
    subCategory: 'martyr',
  }),
  makeFatemiyehPhoto('fatemiyeh-03', {
    title: 'حال‌وهوای شبانه وداع در شبستان مسجد فاطمه (س)',
    caption:
      'نورپردازی معنوی و سکوت سرشار از احترام در جوار تابوت شهید گمنام پیش از آغاز روضه شبانه',
    album: 'پنج شب فاطمیه · وداع با شهید گمنام',
    subCategory: 'martyr',
  }),
  makeFatemiyehPhoto('fatemiyeh-04', {
    title: 'استقبال و تشییع شبانه شهید بر دستان دانشجویان',
    caption:
      'لحظه ورود پیکر مطهر شهید گمنام به محوطه مجتمع آموزش عالی گناباد با استقبال پرشور دانشجویان',
    album: 'پنج شب فاطمیه · وداع با شهید گمنام',
    subCategory: 'martyr',
  }),
  makeFatemiyehPhoto('fatemiyeh-05', {
    title: 'فضاسازی یادمان شهید و نشان هیئت محبان‌الحسین (ع)',
    caption:
      'چیدمان معنوی کوله دفاع مقدس، چفیه، سربندها و قاب شهدای دانشگاه در حاشیه محفل پنج شب فاطمیه',
    album: 'پنج شب فاطمیه · وداع با شهید گمنام',
    subCategory: 'martyr',
  }),

  // ─── سخنرانی و منبر (۴ تصویر) ───
  makeFatemiyehPhoto('fatemiyeh-07', {
    title: 'سخنرانی حجت‌الاسلام‌والمسلمین فاطمی در شب‌های فاطمیه',
    caption:
      'بیان معارف فاطمی و سبک زندگی دانشجویی در منبر پنج شب عزاداری ایام فاطمیه با حضور دانشجویان و نوجوانان',
    album: 'پنج شب فاطمیه · سخنرانی و منبر',
    subCategory: 'lecture',
    galleryHighlight: true,
  }),
  makeFatemiyehPhoto('fatemiyeh-13', {
    title: 'منبر معرفتی در شبستان مسجد حضرت فاطمه زهرا (س)',
    caption:
      'نمای کامل جایگاه سخنرانی با کتیبه فاطمی و نشان رسمی هیئت دانشجویی محبان‌الحسین (ع)',
    album: 'پنج شب فاطمیه · سخنرانی و منبر',
    subCategory: 'lecture',
  }),
  makeFatemiyehPhoto('fatemiyeh-17', {
    title: 'قرائت قرآن و زیارت حضرت زهرا (س) در آغاز مجلس',
    caption:
      'تلاوت آیات نور و زمزمه زیارت پیش از آغاز سخنرانی در شبستان مسجد دانشگاه گناباد',
    album: 'پنج شب فاطمیه · سخنرانی و منبر',
    subCategory: 'lecture',
  }),
  makeFatemiyehPhoto('fatemiyeh-10', {
    title: 'اجتماع پرشور دانشجویان و دانشگاهیان در مسجد دانشگاه',
    caption:
      'حضور صمیمی دانشجویان، اساتید و مهمانان در شبستان مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
    album: 'پنج شب فاطمیه · سخنرانی و منبر',
    subCategory: 'lecture',
  }),

  // ─── روضه و سینه‌زنی (۳ تصویر) ───
  makeFatemiyehPhoto('fatemiyeh-11', {
    title: 'نوای مداحی و روضه‌خوانی زیر کتیبه یا فاطمة الزهرا',
    caption:
      'اجرای مرثیه‌سرایی با نوای مداحان اهل بیت (ع) در فضای نورپردازی‌شده شبستان مسجد دانشگاه',
    album: 'پنج شب فاطمیه · روضه و سینه‌زنی',
    subCategory: 'mourning',
    galleryHighlight: true,
  }),
  makeFatemiyehPhoto('fatemiyeh-12', {
    title: 'حلقه سوگواری و سینه‌زنی دانشجویان',
    caption:
      'همنوایی صمیمی دانشجویان در آیین سینه‌زنی پنج شب عزاداری ایام شهادت حضرت زهرا (س)',
    album: 'پنج شب فاطمیه · روضه و سینه‌زنی',
    subCategory: 'mourning',
  }),
  makeFatemiyehPhoto('fatemiyeh-19', {
    title: 'نمای فراگیر مجلس عزاداری شب‌های فاطمیه',
    caption:
      'صفوف یکدل عزاداران دانشجویی در شبستان مسجد حضرت فاطمه زهرا (س) مجتمع آموزش عالی گناباد',
    album: 'پنج شب فاطمیه · روضه و سینه‌زنی',
    subCategory: 'mourning',
  }),

  // ─── سفره مادر سادات (س) و پذیرایی صمیمی (۸ تصویر) ───
  makeFatemiyehPhoto('fatemiyeh-09', {
    title: 'نذر شله‌زرد فاطمی در محوطه دانشگاه گناباد',
    caption:
      'توزیع ظروف نذری شله‌زرد با عطر زعفران و گلاب هنگام غروب در محوطه مجتمع آموزش عالی گناباد',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
    galleryHighlight: true,
  }),
  makeFatemiyehPhoto('fatemiyeh-15', {
    title: 'سینی چای روضه در استکان‌های منقش به یا اباعبدالله (ع)',
    caption:
      'پذیرایی گرم چای روضه توسط خادمان دانشجویی هیئت در میان برنامه‌های پنج شب فاطمیه',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
  makeFatemiyehPhoto('fatemiyeh-20', {
    title: 'یک جرعه چای روضه در جمع گرم خانواده‌ها',
    caption:
      'سادگی و صمیمیت پذیرایی هیئت دانشجویی محبان‌الحسین (ع) از مهمانان کوچک و بزرگ مجلس',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
  makeFatemiyehPhoto('fatemiyeh-06', {
    title: 'بسته‌های متبرک پذیرایی با طومار حدیث حضرت زهرا (س)',
    caption:
      'تدارک باسلیقه خادمان هیئت شامل شیرینی و طومارهای حدیث فاطمی با روبان مشکی عزاداری',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
  makeFatemiyehPhoto('fatemiyeh-18', {
    title: 'سفره صمیمی شام دانشجویی در پایان مراسم',
    caption:
      'دورهمی گرم و صمیمی دانشجویان سر سفره اطعام مادر سادات (س) پس از اتمام مجلس عزاداری',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
  makeFatemiyehPhoto('fatemiyeh-14', {
    title: 'همسفرگی خانواده‌ها و دانشجویان در سفره مادر سادات (س)',
    caption:
      'لحظات صمیمی و به‌یادماندنی میهمانی شام در کنار خانواده‌ها و دانشجویان در شب‌های فاطمیه',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
  makeFatemiyehPhoto('fatemiyeh-08', {
    title: 'پذیرایی کلوچه سنتی نذری در حاشیه مراسم',
    caption:
      'آماده‌سازی بسته‌های تمیز و مرتب پذیرایی برای توزیع میان عزاداران دانشجویی',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
  makeFatemiyehPhoto('fatemiyeh-16', {
    title: 'هدایای فرهنگی با مهر رسمی هیئت محبان‌الحسین (ع)',
    caption:
      'بسته‌های یادبود و هدایای فرهنگی هیئت دانشجویی برای شرکت‌کنندگان در برنامه‌های فاطمیه',
    album: 'پنج شب فاطمیه · سفره مادر سادات (س)',
    subCategory: 'hospitality',
  }),
];

export function filterFatemiyehPhotos(subCategory: FatemiyehSubCategory): FatemiyehPhoto[] {
  if (subCategory === 'all') return FATEMIYEH_PHOTOS;
  return FATEMIYEH_PHOTOS.filter((photo) => photo.subCategory === subCategory);
}

export function getFatemiyehGalleryHighlights(): FatemiyehPhoto[] {
  return FATEMIYEH_PHOTOS.filter((photo) => photo.galleryHighlight);
}
