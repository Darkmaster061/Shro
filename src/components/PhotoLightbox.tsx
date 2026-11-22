import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { CampusPhoto } from '../data/campusGallery';
import { toPersianDigits } from '../utils/persian';

interface PhotoLightboxProps {
  photos: CampusPhoto[];
  activeIndex: number | null;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}

/**
 * نمایشگر تمام‌صفحه تصاویر (Lightbox) با پشتیبانی از کلیدهای جهت‌دار RTL، سوایپ لمسی، بزرگ‌نمایی و نوار بندانگشتی
 */
export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  activeIndex,
  onClose,
  onChangeIndex,
}) => {
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isOpen = activeIndex !== null && photos.length > 0 && Boolean(photos[activeIndex]);
  const current = isOpen && activeIndex !== null ? photos[activeIndex] : null;

  const goPrev = useCallback(() => {
    if (activeIndex === null || photos.length <= 1) return;
    setZoomed(false);
    onChangeIndex((activeIndex - 1 + photos.length) % photos.length);
  }, [activeIndex, photos.length, onChangeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex === null || photos.length <= 1) return;
    setZoomed(false);
    onChangeIndex((activeIndex + 1) % photos.length);
  }, [activeIndex, photos.length, onChangeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    setZoomed(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // در چیدمان راست‌به‌چپ: کلید راست = تصویر قبلی، کلید چپ = تصویر بعدی
      else if (e.key === 'ArrowRight') goPrev();
      else if (e.key === 'ArrowLeft') goNext();
      else if (e.key === '+' || e.key === '=') setZoomed(true);
      else if (e.key === '-') setZoomed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, goPrev, goNext]);

  if (!isOpen || !current || activeIndex === null) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || zoomed) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 42) return;
    // سوایپ به راست در RTL = تصویر بعدی، سوایپ به چپ = تصویر قبلی
    if (delta > 0) goNext();
    else goPrev();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`نمایش بزرگ تصویر: ${current.title}`}
      className="fixed inset-0 z-50 bg-[#030b09]/95 backdrop-blur-md flex flex-col justify-between text-[#f4f1e8]"
      onClick={onClose}
    >
      {/* نوار بالا */}
      <div
        className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[#deb154] font-semibold">
            <span>{current.album}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-white/70">
              {toPersianDigits(activeIndex + 1)} از {toPersianDigits(photos.length)}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
            {current.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={zoomed ? 'کوچک‌نمایی تصویر' : 'بزرگ‌نمایی تصویر'}
            onClick={() => setZoomed((z) => !z)}
            className="min-h-[40px] min-w-[40px] rounded-xl border border-white/15 bg-white/5 hover:border-[#deb154]/60 text-white inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          <button
            type="button"
            aria-label="بستن نمایشگر تصویر"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl border border-white/15 bg-white/5 hover:border-[#deb154]/60 text-white inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* بوم اصلی تصویر */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-auto p-4 sm:p-8 select-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="تصویر قبلی"
              onClick={goPrev}
              className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-black/55 hover:bg-black/80 hover:border-[#deb154] text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              type="button"
              aria-label="تصویر بعدی"
              onClick={goNext}
              className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-black/55 hover:bg-black/80 hover:border-[#deb154] text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </>
        )}

        <img
          key={current.id}
          src={current.src}
          alt={current.title}
          onClick={() => setZoomed((z) => !z)}
          className={`rounded-2xl shadow-2xl border border-white/10 transition-transform duration-300 ${
            zoomed
              ? 'max-w-none w-[150vw] sm:w-[1150px] cursor-zoom-out'
              : 'max-h-[68vh] max-w-full object-contain cursor-zoom-in'
          }`}
        />
      </div>

      {/* توضیح و نوار بندانگشتی پایین */}
      <div
        className="border-t border-white/10 bg-black/45 px-4 sm:px-6 py-3 space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs sm:text-sm text-white/80 text-center max-w-3xl mx-auto">
          {current.caption}
        </p>

        {photos.length > 1 && (
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1">
            {photos.map((photo, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={photo.id}
                  type="button"
                  aria-label={`نمایش ${photo.title}`}
                  onClick={() => {
                    setZoomed(false);
                    onChangeIndex(idx);
                  }}
                  className={`relative shrink-0 w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    active
                      ? 'border-[#deb154] opacity-100 scale-105'
                      : 'border-transparent opacity-55 hover:opacity-90'
                  }`}
                >
                  <img
                    src={photo.thumbSrc}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
