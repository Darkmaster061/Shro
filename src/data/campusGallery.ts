export type GalleryCategoryId =
  | 'all'
  | 'campus'
  | 'dorms'
  | 'facilities'
  | 'spiritual'
  | 'sports';

export type DormPhotoKey = 'parvin' | 'khatam' | 'andisheh';

export interface CampusPhoto {
  id: string;
  src: string;
  thumbSrc: string;
  title: string;
  caption: string;
  album: string;
  category: Exclude<GalleryCategoryId, 'all'>;
  dormKey?: DormPhotoKey;
  featured?: boolean;
}

export interface GalleryCategoryTab {
  id: GalleryCategoryId;
  label: string;
}

export const GALLERY_CATEGORIES: GalleryCategoryTab[] = [
  { id: 'all', label: 'همه تصاویر' },
  { id: 'campus', label: 'پردیس و دانشکده' },
  { id: 'dorms', label: 'خوابگاه‌ها' },
  { id: 'facilities', label: 'کتابخانه، سلف و رفاهی' },
  { id: 'spiritual', label: 'مسجد، شهدا و هیئت' },
  { id: 'sports', label: 'ورزش و نشاط' },
];

export const DORM_ALBUM_META: Record<
  DormPhotoKey,
  { id: DormPhotoKey; title: string; subtitle: string; genderLabel: string }
> = {
  parvin: {
    id: 'parvin',
    title: 'سرای دانشجویی پروین اعتصامی',
    subtitle: 'ویژه خواهران · نمای ساختمان، محوطه و فضاهای داخلی',
    genderLabel: 'ویژه خواهران',
  },
  khatam: {
    id: 'khatam',
    title: 'سرای دانشجویی خاتم‌الانبیاء',
    subtitle: 'ویژه برادران · بلوار جانباز، نمای محوطه و امکانات خوابگاه',
    genderLabel: 'ویژه برادران',
  },
  andisheh: {
    id: 'andisheh',
    title: 'سرای دانشجویی اندیشه',
    subtitle: 'ویژه برادران · حیاط مرکزی و نمای سرا',
    genderLabel: 'ویژه برادران',
  },
};

function makePhoto(
  slug: string,
  meta: Omit<CampusPhoto, 'id' | 'src' | 'thumbSrc'>
): CampusPhoto {
  return {
    id: slug,
    src: `/assets/campus/${slug}.webp`,
    thumbSrc: `/assets/campus/${slug}-sm.webp`,
    ...meta,
  };
}

/**
 * مجموعه تصاویر رسمی و بهینه‌شده (WebP محلی) مجتمع آموزش عالی گناباد
 * منبع: گالری چندرسانه‌ای رسمی دانشگاه گناباد (ذخیره‌شده به‌صورت کاملاً محلی بدون لینک خارجی)
 */
export const CAMPUS_GALLERY_PHOTOS: CampusPhoto[] = [
  // ─── پردیس و دانشکده‌ها ───
  makePhoto('campus-1', {
    title: 'نمای هوایی پردیس مجتمع آموزش عالی گناباد',
    caption: 'چشم‌انداز کلی مجموعه ساختمان‌های آموزشی، محوطه سبز و بلوار ورودی دانشگاه گناباد',
    album: 'چشم‌انداز پردیس',
    category: 'campus',
    featured: true,
  }),
  makePhoto('faculty-1', {
    title: 'ساختمان دانشکده علوم و بخش اداری',
    caption: 'محل برگزاری بخش عمده کلاس‌ها و انجام امور اداری و آموزشی دانشجویان نوورود',
    album: 'دانشکده علوم و بخش اداری',
    category: 'campus',
    featured: true,
  }),
  makePhoto('campus-2', {
    title: 'چشم‌انداز گسترده پردیس دانشگاه',
    caption: 'نمای هوایی فضاهای آموزشی، رفاهی و مسیرهای دسترسی داخل پردیس',
    album: 'چشم‌انداز پردیس',
    category: 'campus',
  }),
  makePhoto('campus-3', {
    title: 'ورودی و محوطه مرکزی دانشگاه',
    caption: 'سردر و فضای باز مقابل ساختمان‌های اصلی در روزهای دانشجویی',
    album: 'چشم‌انداز پردیس',
    category: 'campus',
  }),
  makePhoto('faculty-2', {
    title: 'فضای آموزشی و سالن‌های دانشکده',
    caption: 'محیط آرام و روشن کلاس‌ها و راهروهای دانشکده علوم و بخش اداری',
    album: 'دانشکده علوم و بخش اداری',
    category: 'campus',
  }),
  makePhoto('gardens-1', {
    title: 'بوستان‌ها و فضای سبز محوطه',
    caption: 'فضای سبز و نشیمن‌های دانشجویی بین کلاس‌ها در محوطه پردیس',
    album: 'بوستان‌ها',
    category: 'campus',
  }),

  // ─── خوابگاه پروین اعتصامی (ویژه خواهران) ───
  makePhoto('parvin-1', {
    title: 'سرای دانشجویی پروین اعتصامی — فضای اتاق‌ها',
    caption: 'نمای داخلی اتاق‌های مجهز خوابگاه رسمی ویژه خواهران مجتمع آموزش عالی گناباد',
    album: 'سرای دانشجویی پروین اعتصامی (خواهران)',
    category: 'dorms',
    dormKey: 'parvin',
    featured: true,
  }),
  makePhoto('parvin-2', {
    title: 'سرای دانشجویی پروین اعتصامی — راهرو و پلکان داخلی',
    caption: 'فضای داخلی طبقات و دسترسی منظم اتاق‌ها در سرای خواهران پروین اعتصامی',
    album: 'سرای دانشجویی پروین اعتصامی (خواهران)',
    category: 'dorms',
    dormKey: 'parvin',
  }),
  makePhoto('parvin-3', {
    title: 'سرای دانشجویی پروین اعتصامی — سوئیت و امکانات اتاق',
    caption: 'اتاق‌های خوابگاه خواهران مجهز به تخت، یخچال و فضای راحت برای مطالعه و استراحت',
    album: 'سرای دانشجویی پروین اعتصامی (خواهران)',
    category: 'dorms',
    dormKey: 'parvin',
  }),
  makePhoto('parvin-4', {
    title: 'سرای دانشجویی پروین اعتصامی — فضای نشیمن و سوئیت‌ها',
    caption: 'نمای داخلی هال و ورودی اتاق‌ها در مجموعه خوابگاه خواهران پروین اعتصامی',
    album: 'سرای دانشجویی پروین اعتصامی (خواهران)',
    category: 'dorms',
    dormKey: 'parvin',
  }),

  // ─── خوابگاه خاتم‌الانبیاء (ویژه برادران) ───
  makePhoto('khatam-1', {
    title: 'سرای دانشجویی خاتم‌الانبیاء — نمای اصلی',
    caption: 'خوابگاه رسمی ویژه برادران در بلوار جانباز گناباد',
    album: 'سرای دانشجویی خاتم‌الانبیاء (برادران)',
    category: 'dorms',
    dormKey: 'khatam',
    featured: true,
  }),
  makePhoto('khatam-2', {
    title: 'سرای دانشجویی خاتم‌الانبیاء — فضاهای خوابگاهی',
    caption: 'نمای محوطه و بخش‌های اسکان دانشجویان برادر در خوابگاه خاتم‌الانبیاء',
    album: 'سرای دانشجویی خاتم‌الانبیاء (برادران)',
    category: 'dorms',
    dormKey: 'khatam',
  }),
  makePhoto('khatam-3', {
    title: 'سرای دانشجویی خاتم‌الانبیاء — امکانات و سالن‌ها',
    caption: 'فضای عمومی و دسترسی به امکانات روزمره در سرای خاتم‌الانبیاء',
    album: 'سرای دانشجویی خاتم‌الانبیاء (برادران)',
    category: 'dorms',
    dormKey: 'khatam',
  }),
  makePhoto('khatam-4', {
    title: 'سرای دانشجویی خاتم‌الانبیاء — حیاط و ساختمان',
    caption: 'محوطه باز خوابگاه برادران با سرویس رفت‌وآمد منظم به دانشگاه',
    album: 'سرای دانشجویی خاتم‌الانبیاء (برادران)',
    category: 'dorms',
    dormKey: 'khatam',
  }),

  // ─── سرای دانشجویی اندیشه (برادران) ───
  makePhoto('andisheh-1', {
    title: 'سرای دانشجویی اندیشه — نمای پانورامای حیاط مرکزی',
    caption: 'معماری حیاط مرکزی و فضای سبز سرای دانشجویی اندیشه (ویژه برادران)',
    album: 'سرای دانشجویی اندیشه (برادران)',
    category: 'dorms',
    dormKey: 'andisheh',
  }),
  makePhoto('andisheh-2', {
    title: 'سرای دانشجویی اندیشه — نمای مجموعه',
    caption: 'ساختمان و فضای بیرونی سرای دانشجویی اندیشه گناباد',
    album: 'سرای دانشجویی اندیشه (برادران)',
    category: 'dorms',
    dormKey: 'andisheh',
  }),

  // ─── کتابخانه، سلف و امکانات رفاهی ───
  makePhoto('library-1', {
    title: 'کتابخانه مرکزی دانشگاه گناباد',
    caption: 'مخزن کتاب‌های تخصصی، منابع درسی و سالن مطالعه آرام برای دانشجویان',
    album: 'کتابخانه مرکزی',
    category: 'facilities',
    featured: true,
  }),
  makePhoto('library-2', {
    title: 'فضای مطالعه و پژوهش کتابخانه مرکزی',
    caption: 'میزهای مطالعه و دسترسی به منابع علمی در کتابخانه دانشگاه',
    album: 'کتابخانه مرکزی',
    category: 'facilities',
  }),
  makePhoto('dining-1', {
    title: 'بوفه و سالن سلف‌سرویس دانشجویی',
    caption: 'سالن غذاخوری و بوفه دانشجویی در محوطه مجتمع آموزش عالی گناباد',
    album: 'بوفه و سلف',
    category: 'facilities',
  }),
  makePhoto('computers-1', {
    title: 'سایت‌های رایانه دانشگاه',
    caption: 'کارگاه‌های کامپیوتر مجهز برای دروس عملی و پروژه‌های دانشجویی',
    album: 'سایت‌های رایانه',
    category: 'facilities',
  }),
  makePhoto('counseling-1', {
    title: 'مرکز مشاوره سلامت و سبک زندگی',
    caption: 'فضای تخصصی مشاوره رایگان دانشجویی و خدمات سلامت دانشگاه',
    album: 'مرکز مشاوره سلامت و سبک زندگی',
    category: 'facilities',
  }),

  // ─── مسجد و گلزار شهدای گمنام ───
  makePhoto('mosque-1', {
    title: 'مسجد حضرت فاطمه زهرا (س) دانشگاه',
    caption: 'میزبان نماز جماعت و مجالس هفتگی سه‌شنبه‌شب‌های هیئت دانشجویی محبان‌الحسین (ع)',
    album: 'مسجد حضرت فاطمه (س)',
    category: 'spiritual',
    featured: true,
  }),
  makePhoto('mosque-2', {
    title: 'شبستان مسجد حضرت فاطمه زهرا (س)',
    caption: 'فضای معنوی و آرام شبستان مسجد دانشگاه گناباد',
    album: 'مسجد حضرت فاطمه (س)',
    category: 'spiritual',
  }),
  makePhoto('martyrs-1', {
    title: 'گلزار شهدای گمنام دانشگاه گناباد',
    caption: 'میعادگاه قرار هفتگی «عصرهای عاشقی» یکشنبه‌ها ساعت ۱۵:۳۰ در جوار شهدای گمنام',
    album: 'گلزار شهدای گمنام',
    category: 'spiritual',
  }),
  {
    id: 'fatemiyeh-01',
    src: '/assets/heyat/fatemiyeh-01.webp',
    thumbSrc: '/assets/heyat/fatemiyeh-01-sm.webp',
    title: 'وداع با پیکر مطهر شهید گمنام (پنج شب فاطمیه)',
    caption:
      'میزبانی مسجد حضرت فاطمه (س) و هیئت دانشجویی محبان‌الحسین (ع) از پیکر مطهر شهید گمنام ۱۹ ساله فکه',
    album: 'پنج شب فاطمیه · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'fatemiyeh-07',
    src: '/assets/heyat/fatemiyeh-07.webp',
    thumbSrc: '/assets/heyat/fatemiyeh-07-sm.webp',
    title: 'سخنرانی پنج شب عزاداری ایام فاطمیه',
    caption: 'نشست معرفتی و سخنرانی حجت‌الاسلام‌والمسلمین فاطمی در مسجد حضرت فاطمه (س) دانشگاه',
    album: 'پنج شب فاطمیه · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'fatemiyeh-11',
    src: '/assets/heyat/fatemiyeh-11.webp',
    thumbSrc: '/assets/heyat/fatemiyeh-11-sm.webp',
    title: 'روضه‌خوانی و عزاداری شبانه در مسجد دانشگاه',
    caption: 'نوای مداحی و همدلی دانشجویان زیر کتیبه «یا فاطمة الزهرا» در شب‌های فاطمیه',
    album: 'پنج شب فاطمیه · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'fatemiyeh-09',
    src: '/assets/heyat/fatemiyeh-09.webp',
    thumbSrc: '/assets/heyat/fatemiyeh-09-sm.webp',
    title: 'نذر شله‌زرد فاطمی در محوطه دانشگاه گناباد',
    caption: 'میهمانی سفره مادر سادات (س) و توزیع شله‌زرد نذری میان دانشجویان در غروب دانشگاه',
    album: 'پنج شب فاطمیه · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'heyat-prog-03',
    src: '/assets/heyat/archive/heyat-prog-03.webp',
    thumbSrc: '/assets/heyat/archive/heyat-prog-03-sm.webp',
    title: 'میز استقبال و کارت «به دانشگاه گناباد خوش آمدید»',
    caption: 'استقبال صمیمی و پذیرایی صبحانه گرم از دانشجویان نوورود در بازه سه‌روزه ثبت‌نام دانشگاه',
    album: 'استقبال نوورودها · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'heyat-prog-29',
    src: '/assets/heyat/archive/heyat-prog-29.webp',
    thumbSrc: '/assets/heyat/archive/heyat-prog-29-sm.webp',
    title: 'نمایشگاه شبانه «فاطمیه شناسنامه ماست»',
    caption: 'بازسازی هنری بیت حضرت زهرا (س) توسط تیم فضاسازی هیئت دانشجویی محبان‌الحسین (ع) در محوطه دانشگاه',
    album: 'نمایشگاه فاطمیه · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'heyat-prog-28',
    src: '/assets/heyat/archive/heyat-prog-28.webp',
    thumbSrc: '/assets/heyat/archive/heyat-prog-28-sm.webp',
    title: 'موکب و جشن مردمی عید سعید غدیر خم',
    caption: 'برپایی ایستگاه صلواتی، پذیرایی شربت زعفران و اهدای عیدی غدیر توسط خادمان دانشجوی هیئت',
    album: 'جشن عید غدیر · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },
  {
    id: 'heyat-prog-15',
    src: '/assets/heyat/archive/heyat-prog-15.webp',
    thumbSrc: '/assets/heyat/archive/heyat-prog-15-sm.webp',
    title: 'نشست صمیمی قرار «عصرهای عاشقی» در مزار شهدا',
    caption: 'هفته بیست‌وهفتم قرار عصرهای عاشقی با روایتگری دفاع مقدس و پذیرایی در جوار شهدای گمنام دانشگاه',
    album: 'عصرهای عاشقی · هیئت محبان‌الحسین (ع)',
    category: 'spiritual',
  },

  // ─── ورزش و نشاط ───
  makePhoto('turf-1', {
    title: 'زمین چمن مصنوعی دانشگاه',
    caption: 'نمای هوایی زمین فوتبال چمن مصنوعی در محوطه ورزشی مجتمع',
    album: 'چمن مصنوعی',
    category: 'sports',
  }),
  makePhoto('sports-1', {
    title: 'مجموعه ورزشی چندمنظوره',
    caption: 'سالن سرپوشیده برای ورزش‌های فوتسال، والیبال، بسکتبال و فعالیت‌های دانشجویی',
    album: 'مجموعه ورزشی چندمنظوره',
    category: 'sports',
  }),
];

export function filterCampusPhotos(category: GalleryCategoryId): CampusPhoto[] {
  if (category === 'all') return CAMPUS_GALLERY_PHOTOS;
  return CAMPUS_GALLERY_PHOTOS.filter((photo) => photo.category === category);
}

export function getDormPhotos(dormKey: DormPhotoKey): CampusPhoto[] {
  return CAMPUS_GALLERY_PHOTOS.filter((photo) => photo.dormKey === dormKey);
}

export function getFeaturedCampusPhotos(): CampusPhoto[] {
  return CAMPUS_GALLERY_PHOTOS.filter((photo) => photo.featured);
}

export function resolveDormKeyByName(name: string, gender?: string): DormPhotoKey | null {
  const normalized = name.trim();
  if (normalized.includes('پروین') || gender === 'دختران') return 'parvin';
  if (normalized.includes('خاتم')) return 'khatam';
  if (normalized.includes('اندیشه')) return 'andisheh';
  if (gender === 'پسران') return 'khatam';
  return null;
}
