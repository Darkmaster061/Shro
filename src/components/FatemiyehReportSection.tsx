import React, { useMemo, useState } from 'react';
import {
  Bus,
  Calendar,
  Camera,
  Film,
  Flame,
  HeartHandshake,
  MapPin,
  Maximize2,
  Mic2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  FATEMIYEH_CATEGORIES,
  FATEMIYEH_EVENT_META,
  FATEMIYEH_PHOTOS,
  FATEMIYEH_VIDEO_REPORT,
  filterFatemiyehPhotos,
  type FatemiyehSubCategory,
} from '../data/heyatFatemiyeh';
import { PhotoLightbox } from './PhotoLightbox';
import { GeometricLatticeBg } from './GeometricLatticeBg';
import { toPersianDigits } from '../utils/persian';

/**
 * گزارش تصویری و مستند پنج شب عزاداری ایام فاطمیه
 * هیئت دانشجویی محبان‌الحسین (ع) — با پخش ویدیوی کاملاً محلی (بدون autoplay) و گالری Lightbox
 */
export const FatemiyehReportSection: React.FC = () => {
  const [activeSubCat, setActiveSubCat] = useState<FatemiyehSubCategory>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visiblePhotos = useMemo(() => filterFatemiyehPhotos(activeSubCat), [activeSubCat]);

  const counts = useMemo(() => {
    const map: Record<FatemiyehSubCategory, number> = {
      all: FATEMIYEH_PHOTOS.length,
      martyr: 0,
      lecture: 0,
      mourning: 0,
      hospitality: 0,
    };
    for (const p of FATEMIYEH_PHOTOS) {
      map[p.subCategory] += 1;
    }
    return map;
  }, []);

  return (
    <section
      id="fatemiyeh-report"
      aria-labelledby="fatemiyeh-report-heading"
      className="scroll-mt-20 space-y-6"
    >
      {/* قاب ویژه معرفی و مستند پنج شب فاطمیه */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/35 bg-surface p-6 sm:p-8 space-y-6">
        <GeometricLatticeBg opacity={0.05} />

        {/* سرعنوان بخش */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              <span>ویژه‌برنامه برگزارشده · {FATEMIYEH_EVENT_META.organizer}</span>
            </p>
            <h2
              id="fatemiyeh-report-heading"
              className="text-2xl sm:text-3xl font-extrabold text-ink leading-tight"
            >
              گزارش تصویری و مستند {FATEMIYEH_EVENT_META.title}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              «{FATEMIYEH_EVENT_META.motto}» — مروری بر پنج شب همدلی، روضه، وداع با پیکر مطهر شهید گمنام و سفره مادر سادات (س) تا نوورودی‌ها از نزدیک با فضای صمیمی هیئت دانشگاه آشنا شوند.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold-soft/50 px-3 py-1.5 text-ink font-semibold">
              <Film className="w-3.5 h-3.5 text-gold" />
              <span>مستند {FATEMIYEH_VIDEO_REPORT.duration}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 font-semibold text-ink">
              <Camera className="w-3.5 h-3.5 text-gold" />
              <span>{toPersianDigits(FATEMIYEH_PHOTOS.length)} قاب منتخب</span>
            </span>
          </div>
        </div>

        {/* ردیف پخش مستند ویدیویی + شناسنامه رسمی مراسم */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* ستون پخش‌کننده محلی مستند (بدون autoplay) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-line bg-canvas overflow-hidden">
            <div className="relative aspect-video bg-[#04100e]">
              <video
                data-testid="fatemiyeh-video-player"
                controls
                playsInline
                preload="metadata"
                poster={FATEMIYEH_VIDEO_REPORT.poster}
                aria-label={FATEMIYEH_VIDEO_REPORT.title}
                className="w-full h-full object-contain bg-black"
              >
                <source src={FATEMIYEH_VIDEO_REPORT.src} type="video/mp4" />
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
              </video>
            </div>
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-2.5 border-t border-line">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-gold inline-flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    <span>{FATEMIYEH_VIDEO_REPORT.producer}</span>
                  </span>
                  <span className="text-ink-muted tabular-nums">
                    مدت مستند: {FATEMIYEH_VIDEO_REPORT.duration}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-ink">
                  {FATEMIYEH_VIDEO_REPORT.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {FATEMIYEH_VIDEO_REPORT.summary}
                </p>
              </div>
            </div>
          </div>

          {/* ستون شناسنامه رسمی مراسم (برگرفته از اطلاعیه رسمی هیئت) */}
          <div className="lg:col-span-5 rounded-2xl border border-gold/30 bg-canvas p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3.5">
              <div className="pb-3 border-b border-line">
                <p className="text-[11px] font-bold text-gold">شناسنامه رسمی مراسم</p>
                <p className="text-sm font-extrabold text-ink mt-1">
                  «{FATEMIYEH_EVENT_META.motto}»
                </p>
              </div>

              <dl className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-ink-muted text-[11px]">به کلام</dt>
                    <dd className="font-bold text-ink">{FATEMIYEH_EVENT_META.speaker}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mic2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-ink-muted text-[11px]">با نوای</dt>
                    <dd className="font-semibold text-ink leading-relaxed">
                      {FATEMIYEH_EVENT_META.maddahan}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-ink-muted text-[11px]">زمان برگزاری</dt>
                    <dd className="font-semibold text-ink">{FATEMIYEH_EVENT_META.schedule}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-ink-muted text-[11px]">مکان</dt>
                    <dd className="font-semibold text-ink">{FATEMIYEH_EVENT_META.location}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Bus className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-ink-muted text-[11px]">سرویس ایاب‌وذهاب</dt>
                    <dd className="font-semibold text-ink">{FATEMIYEH_EVENT_META.shuttle}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <HeartHandshake className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-ink-muted text-[11px]">پذیرایی</dt>
                    <dd className="font-semibold text-ink">{FATEMIYEH_EVENT_META.hospitality}</dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-gold/35 bg-gold-soft/50 px-3.5 py-3 text-xs leading-relaxed text-ink flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span>
                <strong className="text-gold">میهمان ویژه محفل:</strong>{' '}
                {FATEMIYEH_EVENT_META.martyrGuest}
              </span>
            </div>
          </div>
        </div>

        {/* فیلتر موضوعی تصاویر پنج شب فاطمیه */}
        <div className="relative z-10 pt-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-extrabold text-ink flex items-center gap-2">
              <Camera className="w-5 h-5 text-gold" />
              <span>آلبوم تصاویر پنج شب فاطمیه</span>
            </h3>

            <div
              role="tablist"
              aria-label="فیلتر موضوعی تصاویر پنج شب فاطمیه"
              className="flex flex-wrap gap-1.5 bg-canvas border border-line p-1 rounded-xl"
            >
              {FATEMIYEH_CATEGORIES.map((cat) => {
                const active = activeSubCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setActiveSubCat(cat.id);
                      setLightboxIndex(null);
                    }}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                      active
                        ? 'bg-gold text-[#071714]'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="tabular-nums opacity-75">
                      ({toPersianDigits(counts[cat.id])})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* شبکه یکدست تصاویر با نسبت ثابت ۴ به ۳ و باز شدن تمام‌صفحه */}
          <div
            data-testid="fatemiyeh-photo-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            {visiblePhotos.map((photo, idx) => (
              <figure
                key={photo.id}
                className="group relative rounded-2xl overflow-hidden border border-line bg-canvas flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={`مشاهده بزرگ تصویر ${photo.title}`}
                  className="relative aspect-[4/3] w-full overflow-hidden text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <img
                    src={photo.thumbSrc}
                    srcSet={`${photo.thumbSrc} 640w, ${photo.src} 1280w`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    alt={photo.title}
                    loading={idx < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <span className="pointer-events-none absolute top-2.5 left-2.5 w-8 h-8 rounded-xl bg-black/50 backdrop-blur-sm border border-white/15 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </button>
                <figcaption className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                  <p className="text-xs font-bold text-ink leading-snug line-clamp-2">
                    {photo.title}
                  </p>
                  <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                    {photo.caption}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>

      {/* نمایشگر تمام‌صفحه Lightbox */}
      <PhotoLightbox
        photos={visiblePhotos}
        activeIndex={lightboxIndex}
        onChangeIndex={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </section>
  );
};
