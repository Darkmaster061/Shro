import type { CampusPhoto } from './campusGallery';

export type HeyatArchiveCategory =
  | 'all'
  | 'freshmen'
  | 'fatemiyeh'
  | 'celebrations'
  | 'ashqi'
  | 'imam-sadiq';

export interface HeyatArchivePhoto extends CampusPhoto {
  archiveCategory: Exclude<HeyatArchiveCategory, 'all'>;
  eventDate: string;
  eventVenue: string;
}

export interface HeyatArchiveCategoryTab {
  id: HeyatArchiveCategory;
  label: string;
}

export type HeyatTeamIconKey =
  | 'sponsor'
  | 'hospitality'
  | 'equipment'
  | 'logistics'
  | 'media'
  | 'decor'
  | 'social'
  | 'cleaning'
  | 'coordination'
  | 'order';

export interface HeyatExecutiveTeam {
  id: string;
  name: string;
  summary: string;
  icon: HeyatTeamIconKey;
}

export const HEYAT_ARCHIVE_CATEGORIES: HeyatArchiveCategoryTab[] = [
  { id: 'all', label: 'همه برنامه‌ها' },
  { id: 'freshmen', label: 'استقبال و پذیرایی نوورودها' },
  { id: 'fatemiyeh', label: 'نمایشگاه و محافل فاطمیه' },
  { id: 'celebrations', label: 'اعیاد و جشن‌ها' },
  { id: 'ashqi', label: 'عصرهای عاشقی' },
  { id: 'imam-sadiq', label: 'شهادت امام صادق (ع)' },
];

/**
 * تیم‌های فعال زیرمجموعه هیئت دانشجویی محبان‌الحسین (ع)
 * برگرفته از ساختار اجرایی رسمی هیئت برای آشنایی و مشارکت دانشجویان نوورود
 */
export const HEYAT_EXECUTIVE_TEAMS: HeyatExecutiveTeam[] = [
  {
    id: 'bani-yab',
    name: 'بخش بانی‌یاب',
    summary: 'جذب خیرین، حامیان و بانیان نذورات و برنامه‌های فرهنگی و مذهبی هیئت در طول ترم.',
    icon: 'sponsor',
  },
  {
    id: 'paziraei',
    name: 'بخش پذیرایی',
    summary: 'تدارک چای روضه، صبحانه نوورودی‌ها، افطاری و پذیرایی گرم و باسلیقه از میهمانان هیئت.',
    icon: 'hospitality',
  },
  {
    id: 'tajhizat',
    name: 'بخش تجهیزات',
    summary: 'راه‌اندازی، نگهداری و مدیریت سیستم صوتی، نورپردازی، نمایشگرها و تجهیزات فنی مراسم.',
    icon: 'equipment',
  },
  {
    id: 'tadarokat',
    name: 'بخش تدارکات و پشتیبانی',
    summary: 'تأمین اقلام مصرفی، خریدهای اجرایی و پشتیبانی میدانی در برپایی مراسم‌ها و موکب‌ها.',
    icon: 'logistics',
  },
  {
    id: 'rasaneh',
    name: 'بخش رسانه',
    summary: 'عکاسی، تصویربرداری، تدوین مستند، طراحی پوستر و ثبت ماندگار گزارش تصویری برنامه‌ها.',
    icon: 'media',
  },
  {
    id: 'fazasazi',
    name: 'بخش فضاسازی',
    summary: 'کتیبه‌آرایی شبستان، طراحی دکور نمایشگاه‌های مناسبتی (مانند بیت حضرت زهرا س) و نورپردازی محیط.',
    icon: 'decor',
  },
  {
    id: 'fazaye-majazi',
    name: 'بخش فضای مجازی',
    summary: 'مدیریت کانال رسمی، اطلاع‌رسانی به‌موقع مراسم‌ها، تولید محتوای متنی و ارتباط با مخاطبان.',
    icon: 'social',
  },
  {
    id: 'nezafat',
    name: 'بخش نظافت',
    summary: 'مرتب‌سازی، پاکیزگی و حفظ آراستگی مسجد و فضای مراسم پیش و پس از هر برنامه.',
    icon: 'cleaning',
  },
  {
    id: 'hamahangi',
    name: 'بخش هماهنگی',
    summary: 'برنامه‌ریزی تقویم اجرا، دعوت از سخنرانان و مداحان و هماهنگی سرویس خوابگاه‌ها و بخش‌های دانشگاه.',
    icon: 'coordination',
  },
  {
    id: 'entezamat',
    name: 'بخش انتظامات',
    summary: 'خوش‌آمدگویی، هدایت منظم شرکت‌کنندگان و حفظ آرامش و نظم در برنامه‌های پرجمعیت.',
    icon: 'order',
  },
];

function makeArchivePhoto(
  num: number,
  meta: Omit<HeyatArchivePhoto, 'id' | 'src' | 'thumbSrc' | 'category'>
): HeyatArchivePhoto {
  const padded = String(num).padStart(2, '0');
  const slug = `heyat-prog-${padded}`;
  return {
    id: slug,
    src: `/assets/heyat/archive/${slug}.webp`,
    thumbSrc: `/assets/heyat/archive/${slug}-sm.webp`,
    category: 'spiritual',
    ...meta,
  };
}

/**
 * آرشیو ۳۱ تصویر رسمی و بهینه‌شده (WebP محلی) از برنامه‌های هیئت دانشجویی محبان‌الحسین (ع)
 * تمامی تصاویر با دقت با صحنه واقعی هر قاب تطبیق داده شده‌اند.
 */
export const HEYAT_ARCHIVE_PHOTOS: HeyatArchivePhoto[] = [
  // ─── ۱. استقبال و پذیرایی از دانشجویان نوورود (۴ تصویر) ───
  makeArchivePhoto(1, {
    title: 'توزیع صبحانه گرم در محوطه دانشگاه',
    caption:
      'پذیرایی صبحگاهی خادمان هیئت محبان‌الحسین (ع) از دانشجویان نوورود و همراهانشان در بازه سه‌روزه ثبت‌نام.',
    album: 'استقبال و پذیرایی نوورودها',
    archiveCategory: 'freshmen',
    eventDate: 'بازه سه‌روزه ثبت‌نام نوورودی‌ها',
    eventVenue: 'محوطه مرکزی مجتمع آموزش عالی گناباد',
  }),
  makeArchivePhoto(2, {
    title: 'میز استقبال و راهنمای دانشجویان نوورود',
    caption:
      'ایستگاه راهنمایی، تحویل فرم‌های عضویت و خوش‌آمدگویی صمیمی به ورودی‌های جدید در روزهای ثبت‌نام.',
    album: 'استقبال و پذیرایی نوورودها',
    archiveCategory: 'freshmen',
    eventDate: 'بازه سه‌روزه ثبت‌نام نوورودی‌ها',
    eventVenue: 'لابی و محوطه ثبت‌نام دانشگاه گناباد',
  }),
  makeArchivePhoto(3, {
    title: 'کارت خوش‌آمدگویی «به دانشگاه گناباد خوش آمدید»',
    caption:
      'نمای نزدیک میز استقبال نوورودی‌ها شامل کارت خوش‌آمدگویی اختصاصی، فرم آشنایی با هیئت، کد QR و پذیرایی.',
    album: 'استقبال و پذیرایی نوورودها',
    archiveCategory: 'freshmen',
    eventDate: 'بازه سه‌روزه ثبت‌نام نوورودی‌ها',
    eventVenue: 'میز استقبال هیئت دانشجویی محبان‌الحسین (ع)',
  }),
  makeArchivePhoto(4, {
    title: 'سفره املت گرم و پذیرایی صبحانه نوورودی‌ها',
    caption:
      'آماده‌سازی ظرف‌های صبحانه گرم و سینی بیسکوییت برای پذیرایی از دانشجویان جدیدالورود در حیاط دانشگاه.',
    album: 'استقبال و پذیرایی نوورودها',
    archiveCategory: 'freshmen',
    eventDate: 'بازه سه‌روزه ثبت‌نام نوورودی‌ها',
    eventVenue: 'محوطه مجتمع آموزش عالی گناباد',
  }),

  // ─── ۲. نمایشگاه فاطمیه و محافل عزاداری (۹ تصویر) ───
  makeArchivePhoto(29, {
    title: 'نمای شبانه نمایشگاه «فاطمیه شناسنامه ماست»',
    caption:
      'ماکت گلی بازسازی‌شده بیت حضرت زهرا (س) با دیوارنگاره «ما همه بچه نام زهراییم» و نورپردازی زمردی در محوطه دانشگاه.',
    album: 'نمایشگاه فاطمیه · هیئت محبان‌الحسین (ع)',
    archiveCategory: 'fatemiyeh',
    eventDate: 'ایام فاطمیه دوم',
    eventVenue: 'محوطه مجتمع آموزش عالی گناباد',
  }),
  makeArchivePhoto(31, {
    title: 'فضای داخلی بازسازی‌شده بیت حضرت زهرا (س)',
    caption:
      'اجرای دقیق دیوارنگاره‌های مرثیه، سقف حصیری و کوزه‌های سفالی توسط تیم فضاسازی هیئت در نمایشگاه فاطمیه.',
    album: 'نمایشگاه فاطمیه · هیئت محبان‌الحسین (ع)',
    archiveCategory: 'fatemiyeh',
    eventDate: 'ایام فاطمیه دوم',
    eventVenue: 'نمایشگاه فاطمیه دانشگاه گناباد',
  }),
  makeArchivePhoto(30, {
    title: 'طاقچه نورانی «یا زهرا (س)» و نشان هیئت',
    caption:
      'جزئیات هنری طاقچه خشتی نمایشگاه فاطمیه با نشان هیئت دانشجویی محبان‌الحسین (ع)، شمع روشن و گل نرگس.',
    album: 'نمایشگاه فاطمیه · هیئت محبان‌الحسین (ع)',
    archiveCategory: 'fatemiyeh',
    eventDate: 'ایام فاطمیه دوم',
    eventVenue: 'نمایشگاه فاطمیه دانشگاه گناباد',
  }),
  makeArchivePhoto(13, {
    title: 'چیدمان نمادین کوزه سفالی و گلبرگ‌های سرخ',
    caption:
      'فضاسازی معنوی شب دوم فاطمیه با کوزه سفالی، فانوس و گلبرگ‌های سرخ در مسجد حضرت فاطمه (س).',
    album: 'شب دوم فاطمیه',
    archiveCategory: 'fatemiyeh',
    eventDate: 'جمعه ۱ آبان ۱۴۰۵',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(9, {
    title: 'کاسه‌های شله‌زرد نذری با نقش «یا زهرا (س)»',
    caption:
      'توزیع شله‌زرد نذری مزین به نام مبارک حضرت زهرا (س) با دارچین در مراسم عزاداری ایام فاطمیه.',
    album: 'محافل ایام فاطمیه',
    archiveCategory: 'fatemiyeh',
    eventDate: 'ایام فاطمیه',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(10, {
    title: 'استکان‌های چای «یا اباعبدالله الشهید» در شبستان',
    caption:
      'پذیرایی چای روضه توسط خادمان بخش پذیرایی در محفل عزاداری شب دوم فاطمیه دانشگاه گناباد.',
    album: 'شب دوم فاطمیه',
    archiveCategory: 'fatemiyeh',
    eventDate: 'جمعه ۱ آبان ۱۴۰۵',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(11, {
    title: 'توزیع کیک یزدی تازه میان حاضران محفل',
    caption:
      'پذیرایی صمیمی بخش پذیرایی هیئت از دانشجویان شرکت‌کننده در محافل معنوی و شبانه مسجد دانشگاه.',
    album: 'محافل ایام فاطمیه',
    archiveCategory: 'fatemiyeh',
    eventDate: 'ایام فاطمیه',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(12, {
    title: 'سینی خرما و بیسکوییت پذیرایی عزاداران',
    caption:
      'آماده‌سازی باسلیقه خرما و بیسکوییت برای پذیرایی از دانشجویان در شب‌های عزاداری فاطمیه.',
    album: 'شب دوم فاطمیه',
    archiveCategory: 'fatemiyeh',
    eventDate: 'جمعه ۱ آبان ۱۴۰۵',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(8, {
    title: 'آماده‌سازی بسته‌های خرما در پشت‌صحنه پذیرایی',
    caption:
      'تلاش صمیمی خادمان بخش پذیرایی برای بسته‌بندی خرما و نذورات پیش از شروع مراسم.',
    album: 'محافل ایام فاطمیه',
    archiveCategory: 'fatemiyeh',
    eventDate: 'ایام فاطمیه',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),

  // ─── ۳. اعیاد و جشن‌ها: عید غدیر، میلاد حضرت زهرا (س) و حضرت زینب (س) (۱۱ تصویر) ───
  makeArchivePhoto(28, {
    title: 'فضای پرشور موکب مردمی عید سعید غدیر',
    caption:
      'حضور گرم خانواده‌ها، کودکان و دانشجویان در ایستگاه جشن خیابانی عید غدیر خم با همراهی هیئت محبان‌الحسین (ع).',
    album: 'جشن عید سعید غدیر',
    archiveCategory: 'celebrations',
    eventDate: 'عید سعید غدیر خم',
    eventVenue: 'ایستگاه جشن عید غدیر · گناباد',
  }),
  makeArchivePhoto(27, {
    title: 'توزیع شیرینی و بسته‌های عیدی توسط خادمان دانشجو',
    caption:
      'خادمان دانشجوی هیئت در حال اهدای شیرینی و بسته‌های متبرک عید غدیر به شهروندان و خانواده‌ها.',
    album: 'جشن عید سعید غدیر',
    archiveCategory: 'celebrations',
    eventDate: 'عید سعید غدیر خم',
    eventVenue: 'موکب جشن عید غدیر · گناباد',
  }),
  makeArchivePhoto(25, {
    title: 'پذیرایی شربت زعفران در ایستگاه صلواتی غدیر',
    caption:
      'آماده‌سازی و سرو شربت خنک زعفرانی توسط تیم پذیرایی هیئت در جشن عید سعید غدیر خم.',
    album: 'جشن عید سعید غدیر',
    archiveCategory: 'celebrations',
    eventDate: 'عید سعید غدیر خم',
    eventVenue: 'موکب جشن عید غدیر · گناباد',
  }),
  makeArchivePhoto(26, {
    title: 'لبخند کودک خردسال با عیدی غدیر',
    caption:
      'لحظه دلنشین اهدای عیدی و شیرینی غدیر به کودکان در برنامه مردمی هیئت دانشجویی محبان‌الحسین (ع).',
    album: 'جشن عید سعید غدیر',
    archiveCategory: 'celebrations',
    eventDate: 'عید سعید غدیر خم',
    eventVenue: 'موکب جشن عید غدیر · گناباد',
  }),
  makeArchivePhoto(22, {
    title: 'مولودی‌خوانی زیر کتیبه «إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ»',
    caption:
      'جشن پرنشاط میلاد حضرت فاطمه زهرا (س) با مولودی‌خوانی و همراهی صمیمی دانشجویان در مسجد دانشگاه.',
    album: 'جشن میلاد حضرت فاطمه زهرا (س)',
    archiveCategory: 'celebrations',
    eventDate: 'میلاد حضرت فاطمه زهرا (س)',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(23, {
    title: 'تکریم مقام مادر در جشن میلاد کوثر',
    caption:
      'بخش ویژه تقدیر و گفت‌وگوی صمیمی در جشن میلاد حضرت زهرا (س) و گرامیداشت روز مادر در دانشگاه.',
    album: 'جشن میلاد حضرت فاطمه زهرا (س)',
    archiveCategory: 'celebrations',
    eventDate: 'میلاد حضرت فاطمه زهرا (س)',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(24, {
    title: 'اجتماع دانشجویی جشن میلاد حضرت زهرا (س)',
    caption:
      'حضور صمیمی دانشجویان در شبستان مسجد حضرت فاطمه (س) زیر ریسه‌ها و کتیبه جشن میلاد کوثر.',
    album: 'جشن میلاد حضرت فاطمه زهرا (س)',
    archiveCategory: 'celebrations',
    eventDate: 'میلاد حضرت فاطمه زهرا (س)',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(21, {
    title: 'توزیع بسته‌های پذیرایی در شب میلاد کوثر',
    caption:
      'اهدای بسته‌های آبمیوه و کیک به دانشجویان شرکت‌کننده در جشن شبانه میلاد حضرت زهرا (س).',
    album: 'جشن میلاد حضرت فاطمه زهرا (س)',
    archiveCategory: 'celebrations',
    eventDate: 'میلاد حضرت فاطمه زهرا (س)',
    eventVenue: 'محوطه مسجد دانشگاه گناباد',
  }),
  makeArchivePhoto(7, {
    title: 'فضاسازی جشن میلاد حضرت زینب کبری (س)',
    caption:
      'کتیبه فیروزه‌ای «أسعد الله ایامکم» و تزئین شبستان به مناسبت میلاد عقیلةالعرب حضرت زینب (س).',
    album: 'میلاد حضرت زینب کبری (س)',
    archiveCategory: 'celebrations',
    eventDate: 'سه‌شنبه ۲۱ مهرماه ۱۴۰۵',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(6, {
    title: 'چایخانه «یا زینب الکبری (س)» در شب میلاد',
    caption:
      'پذیرایی چای داغ در استکان‌های منقش به نام مبارک حضرت زینب کبری (س) در جشن شبانه مسجد دانشگاه.',
    album: 'میلاد حضرت زینب کبری (س)',
    archiveCategory: 'celebrations',
    eventDate: 'سه‌شنبه ۲۱ مهرماه ۱۴۰۵',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(5, {
    title: 'شیرینی تازه جشن میلاد عقیلةالعرب (س)',
    caption:
      'سینی شیرینی زبان در شبستان مسجد حضرت فاطمه (س) برای کام‌شیرین کردن دانشجویان در شب میلاد.',
    album: 'میلاد حضرت زینب کبری (س)',
    archiveCategory: 'celebrations',
    eventDate: 'سه‌شنبه ۲۱ مهرماه ۱۴۰۵',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),

  // ─── ۴. قرار هفتگی «عصرهای عاشقی» در مزار شهدای گمنام (۴ تصویر) ───
  makeArchivePhoto(15, {
    title: 'نشست صمیمی دانشجویان در قرار «عصرهای عاشقی»',
    caption:
      'هفته بیست‌وهفتم قرار عصرهای عاشقی با حضور دانشجویان و گفت‌وگوی صمیمی در جوار مزار شهدای گمنام دانشگاه.',
    album: 'عصرهای عاشقی · هفته بیست‌وهفتم',
    archiveCategory: 'ashqi',
    eventDate: 'سه‌شنبه ۶ خرداد ۱۴۰۴',
    eventVenue: 'مزار شهدای گمنام دانشگاه گناباد',
  }),
  makeArchivePhoto(17, {
    title: 'روایتگری راوی دفاع مقدس در غروب مزار شهدا',
    caption:
      'نقل خاطرات ایثار و ایستادگی توسط راوی مدعو در فضای آرام و صمیمی جوار شهدای گمنام مجتمع.',
    album: 'عصرهای عاشقی · هفته بیست‌وهفتم',
    archiveCategory: 'ashqi',
    eventDate: 'سه‌شنبه ۶ خرداد ۱۴۰۴',
    eventVenue: 'مزار شهدای گمنام دانشگاه گناباد',
  }),
  makeArchivePhoto(16, {
    title: 'ایستگاه چای و شربت با نشان هیئت محبان‌الحسین (ع)',
    caption:
      'میزبانی خادمان هیئت در محوطه دانشگاه با سماور، شربت زعفران و شیرینی در حاشیه قرار عصرهای عاشقی.',
    album: 'عصرهای عاشقی · هفته بیست‌وهفتم',
    archiveCategory: 'ashqi',
    eventDate: 'سه‌شنبه ۶ خرداد ۱۴۰۴',
    eventVenue: 'محوطه مزار شهدای گمنام دانشگاه گناباد',
  }),
  makeArchivePhoto(14, {
    title: 'غرفه کتاب‌های سیره شهدا در حاشیه عصرهای عاشقی',
    caption:
      'نمایشگاه کتاب‌های دفاع مقدس و زندگی‌نامه شهدا برای مطالعه و امانت‌گیری دانشجویان در جوار مزار شهدا.',
    album: 'عصرهای عاشقی · هفته بیست‌وهفتم',
    archiveCategory: 'ashqi',
    eventDate: 'سه‌شنبه ۶ خرداد ۱۴۰۴',
    eventVenue: 'مزار شهدای گمنام دانشگاه گناباد',
  }),

  // ─── ۵. جلسه هفتگی شام شهادت امام جعفر صادق (ع) (۳ تصویر) ───
  makeArchivePhoto(19, {
    title: 'سخنرانی جلسه هفتگی شام شهادت امام صادق (ع)',
    caption:
      'سخنرانی معرفتی و عزاداری شام شهادت رئیس مذهب جعفری (ع) در مسجد حضرت فاطمه (س) دانشگاه گناباد.',
    album: 'شام شهادت امام جعفر صادق (ع)',
    archiveCategory: 'imam-sadiq',
    eventDate: 'پنج‌شنبه ۴ اردیبهشت ۱۴۰۴',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(18, {
    title: 'اهدای پاکت‌های دست‌ساز فرهنگی به دانشجویان',
    caption:
      'توزیع یادبودهای دست‌ساز کرافت تهیه‌شده توسط خادمان هیئت در جلسه هفتگی شام شهادت امام صادق (ع).',
    album: 'شام شهادت امام جعفر صادق (ع)',
    archiveCategory: 'imam-sadiq',
    eventDate: 'پنج‌شنبه ۴ اردیبهشت ۱۴۰۴',
    eventVenue: 'مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
  makeArchivePhoto(20, {
    title: 'میز کتاب و هم‌صحبتی اساتید و دانشجویان پس از مراسم',
    caption:
      'بازدید اساتید و دانشجویان از غرفه کتاب‌های معرفتی در پایان مراسم شام شهادت امام جعفر صادق (ع).',
    album: 'شام شهادت امام جعفر صادق (ع)',
    archiveCategory: 'imam-sadiq',
    eventDate: 'پنج‌شنبه ۴ اردیبهشت ۱۴۰۴',
    eventVenue: 'محوطه مسجد حضرت فاطمه (س) دانشگاه گناباد',
  }),
];

export function filterHeyatArchivePhotos(category: HeyatArchiveCategory): HeyatArchivePhoto[] {
  if (category === 'all') return HEYAT_ARCHIVE_PHOTOS;
  return HEYAT_ARCHIVE_PHOTOS.filter((photo) => photo.archiveCategory === category);
}

export function getFreshmenWelcomePhotos(): HeyatArchivePhoto[] {
  return HEYAT_ARCHIVE_PHOTOS.filter((photo) => photo.archiveCategory === 'freshmen');
}
