import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Camera, Expand, Images } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { PhotoLightbox } from '../components/PhotoLightbox';
import {
  CAMPUS_GALLERY_PHOTOS,
  GALLERY_CATEGORIES,
  filterCampusPhotos,
  type GalleryCategoryId,
} from '../data/campusGallery';
import { toPersianDigits } from '../utils/persian';

function isValidCategory(val: string | null): val is GalleryCategoryId {
  return GALLERY_CATEGORIES.some((c) => c.id === val);
}

/**
 * صفحه اختصاصی «گالری تصاویر مجتمع آموزش عالی گناباد»
 * تمامی تصاویر به‌صورت WebP محلی و چندسایزی (srcset) با لود تنبلانه و بدون هیچ لینک خارجی بارگذاری می‌شوند.
 */
export const GalleryPage: React.FC = () => {
  const { liteMode } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get('cat');
  const [activeCategory, setActiveCategory] = useState<GalleryCategoryId>(
    isValidCategory(initialCat) ? initialCat : 'all'
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visiblePhotos = useMemo(
    () => filterCampusPhotos(activeCategory),
    [activeCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<GalleryCategoryId, number> = {
      all: CAMPUS_GALLERY_PHOTOS.length,
      campus: 0,
      dorms: 0,
      facilities: 0,
      spiritual: 0,
      sports: 0,
    };
    for (const p of CAMPUS_GALLERY_PHOTOS) {
      counts[p.category] += 1;
    }
    return counts;
  }, []);

  const handleSelectCategory = (cat: GalleryCategoryId) => {
    setActiveCategory(cat);
    setLightboxIndex(null);
    if (cat === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ cat }, { replace: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* سرصفحه گالری */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-line pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            <span>تصاویر واقعی مجتمع آموزش عالی گناباد</span>
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink">
            گالری تصاویر پردیس، امکانات و خوابگاه‌ها
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
            پیش از ورود به گناباد با فضای واقعی دانشکده، کتابخانه مرکزی، سلف، مسجد حضرت فاطمه (س)، گلزار شهدا، سالن ورزشی و سراهای دانشجویی آشنا شو. روی هر عکس بزن تا با کیفیت کامل و امکان زوم ببینی.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <span className="min-h-[40px] px-3.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink-muted inline-flex items-center gap-2 tabular-nums">
            <Images className="w-4 h-4 text-gold" />
            <span>{toPersianDigits(visiblePhotos.length)} تصویر نمایش‌داده‌شده</span>
          </span>
          <Link
            to="/dorms#dorm-gallery"
            className="min-h-[40px] px-4 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-4 h-4 text-gold" />
            <span>صفحه کامل خوابگاه‌ها</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* فیلتر دسته‌بندی آلبوم‌ها */}
      <div
        role="tablist"
        aria-label="فیلتر دسته‌بندی گالری تصاویر"
        className="flex flex-wrap items-center gap-2"
      >
        {GALLERY_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectCategory(cat.id)}
              className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'border-gold bg-gold text-[#071714] shadow-[var(--shadow-glow-gold)]'
                  : 'border-line bg-surface text-ink-muted hover:text-ink hover:border-gold/45'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-md ${
                  active ? 'bg-[#071714]/15 text-[#071714]' : 'bg-canvas text-ink-muted'
                }`}
              >
                {toPersianDigits(categoryCounts[cat.id])}
              </span>
            </button>
          );
        })}
      </div>

      {/* پل ارتباطی هوشمند هنگام انتخاب دسته خوابگاه‌ها */}
      {activeCategory === 'dorms' && (
        <div className="rounded-2xl border border-gold/35 bg-gradient-to-l from-gold-soft/50 via-surface to-surface p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-gold">اطلاعات تکمیلی سراهای دانشجویی</p>
            <p className="text-sm text-ink font-medium">
              برای دیدن تعرفه رسمی هر ترم، نشانی دقیق نشان و بلد، برنامه سرویس و مقایسه اتاق‌ها به بخش خوابگاه‌ها برو.
            </p>
          </div>
          <Link
            to="/dorms"
            className="min-h-[40px] px-4 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>مشاهده اطلاعات و تعرفه خوابگاه‌ها</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* شبکه تصاویر واقعی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visiblePhotos.map((photo, idx) => {
          const isLead = activeCategory === 'all' && idx === 0;
          return (
            <motion.article
              key={photo.id}
              initial={liteMode ? false : { opacity: 0, y: 12 }}
              whileInView={liteMode ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.32, delay: Math.min(idx * 0.03, 0.2) }}
              className={`group rounded-2xl border border-line bg-surface overflow-hidden hover:border-gold/50 transition-all shadow-[var(--shadow-card)] flex flex-col ${
                isLead ? 'sm:col-span-2 lg:col-span-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(idx)}
                aria-label={`بزرگ‌نمایی ${photo.title}`}
                className={`relative w-full h-full flex-1 overflow-hidden bg-emerald-deep/40 text-right cursor-pointer block ${
                  isLead ? 'min-h-[250px] sm:min-h-[300px] lg:min-h-[340px]' : 'min-h-[230px] sm:min-h-[260px]'
                }`}
              >
                <img
                  src={photo.thumbSrc}
                  srcSet={`${photo.thumbSrc} 640w, ${photo.src} 1280w`}
                  sizes={
                    isLead
                      ? '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw'
                      : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                  }
                  alt={photo.title}
                  loading={idx < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#04100e]/85 via-[#04100e]/15 to-transparent opacity-85 group-hover:opacity-95 transition-opacity"
                />

                {/* برچسب آلبوم و آیکون بزرگ‌نمایی */}
                <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#051210]/75 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-[#f4f1e8]">
                    {photo.album}
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-[#051210]/70 backdrop-blur-md border border-white/15 text-[#deb154] flex items-center justify-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all">
                    <Expand className="w-4 h-4" />
                  </span>
                </div>

                {/* عنوان روی تصویر */}
                <div className="absolute bottom-3 right-3.5 left-3.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                    {photo.title}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-white/80 mt-0.5 line-clamp-1">
                    {photo.caption}
                  </p>
                </div>
              </button>
            </motion.article>
          );
        })}
      </div>

      {/* نمایشگر تمام‌صفحه تصاویر */}
      <PhotoLightbox
        photos={visiblePhotos}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={setLightboxIndex}
      />
    </div>
  );
};
