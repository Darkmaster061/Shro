import React, { useEffect } from 'react';
import {
  Bookmark,
  Building2,
  ExternalLink,
  Layers,
  MapPin,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import { getAxisMeta } from '../data/basijVisuals';
import { BASIJ_OFFICIAL_INFO } from '../data/orientation';
import { AxisIcon } from './BasijOrgChart';
import { GeometricLatticeBg } from './GeometricLatticeBg';
import { toPersianDigits } from '../utils/persian';
import type { CadreItem } from '../types/portal';

interface CadreDossierModalProps {
  cadre: CadreItem | null;
  isSaved: boolean;
  onToggleSave: (cadreId: number) => void;
  onClose: () => void;
}

/**
 * شناسنامه گرافیکی و مجله‌ای هر کانون (جایگزین مطالعه خام صفحات PDF)
 * شامل مأموریت، اهداف و شرح کامل، کارت‌های شماره‌دار کارگروه‌ها، نشان‌گذاری و اطلاعات عضویت دانشگاه.
 */
export const CadreDossierModal: React.FC<CadreDossierModalProps> = ({
  cadre,
  isSaved,
  onToggleSave,
  onClose,
}) => {
  useEffect(() => {
    if (!cadre) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cadre, onClose]);

  if (!cadre) return null;
  const meta = getAxisMeta(cadre.category);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`شناسنامه ${cadre.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* سرصفحه گرافیکی با الگوی گره‌چینی و رنگ اختصاصی محور */}
        <div
          className="relative p-6 sm:p-7 border-b border-line overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${meta.accentSoft}, transparent 68%)`,
          }}
        >
          <GeometricLatticeBg opacity={0.09} strokeColor={meta.accent} />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: meta.accentSoft,
                  color: meta.accent,
                  border: `1px solid ${meta.accentBorder}`,
                }}
              >
                <AxisIcon iconKey={meta.iconKey} className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span className="font-bold" style={{ color: meta.accent }}>
                    {meta.title}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>ساختار رسمی قرار قیام ۹</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-1">
                  {cadre.name}
                </h2>
                <p className="text-xs text-ink-muted mt-1">{meta.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onToggleSave(cadre.id)}
                aria-label={isSaved ? 'حذف از کانون‌های نشان‌شده' : 'نشان کردن این کانون'}
                aria-pressed={isSaved}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSaved
                    ? 'border-gold bg-gold text-[#071714]'
                    : 'border-line bg-canvas/80 text-ink hover:border-gold/50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isSaved ? 'نشان‌شده' : 'نشان کن'}</span>
              </button>

              <button
                type="button"
                aria-label="بستن شناسنامه کانون"
                onClick={onClose}
                className="min-h-[40px] min-w-[40px] rounded-xl border border-line bg-canvas/80 flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* بدنه شناسنامه مجله‌ای */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* نقل‌قول مأموریت */}
          <div className="py-4 border-y border-line space-y-2">
            <p className="text-xs font-bold text-gold">مأموریت اصلی کانون</p>
            <p className="text-base font-semibold text-ink leading-relaxed">
              {cadre.shortDesc}
            </p>
            <p className="text-sm text-ink-muted leading-relaxed pt-1">
              {cadre.fullDesc}
            </p>
          </div>

          {/* کارگروه‌ها و حوزه‌های فعالیت (کارت‌های شماره‌دار) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink inline-flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" />
                <span>واحدها و کارگروه‌های اجرایی</span>
              </h3>
              <span className="text-xs text-ink-muted tabular-nums">
                {toPersianDigits(cadre.highlights.length)} حوزه تخصصی
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cadre.highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-line bg-canvas/80 p-3.5 flex items-start gap-3"
                >
                  <span
                    className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tabular-nums mt-0.5"
                    style={{
                      backgroundColor: meta.accentSoft,
                      color: meta.accent,
                    }}
                  >
                    {toPersianDigits(idx + 1)}
                  </span>
                  <p className="text-xs sm:text-sm text-ink leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* کلیدواژه‌های فعالیت بدون کپسول شلوغ */}
          {cadre.tags.length > 0 && (
            <div className="text-xs text-ink-muted flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">محورهای مهارتی:</span>
              <span>{cadre.tags.join(' · ')}</span>
            </div>
          )}

          {/* راه‌های رسمی عضویت در کانون (بسیج دانشجویی دانشگاه گناباد) */}
          <div className="rounded-2xl border border-gold/30 bg-canvas p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-gold inline-flex items-center gap-1.5 text-xs sm:text-sm">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>راه‌های عضویت در این کانون — کانال رسمی حوزه بسیج دانشجویی دانشگاه گناباد</span>
              </p>
              <p className="text-ink-muted leading-relaxed">
                برای عضویت در <strong className="text-ink">{cadre.name}</strong> می‌توانید به آیدی ادمین‌های رسمی پیام دهید، یا به‌صورت حضوری در روزهای ثبت‌نام به میز بسیج و در طول ترم به پایگاه مراجعه کنید:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={BASIJ_OFFICIAL_INFO.brothersAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] rounded-xl border border-gold/35 bg-surface hover:border-gold px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                  <Send className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>ادمین برادران</span>
                </span>
                <span dir="ltr" className="font-mono font-bold text-gold">
                  {BASIJ_OFFICIAL_INFO.brothersAdminHandle}
                </span>
              </a>

              <a
                href={BASIJ_OFFICIAL_INFO.sistersAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] rounded-xl border border-gold/35 bg-surface hover:border-gold px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                  <Send className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>ادمین خواهران</span>
                </span>
                <span dir="ltr" className="font-mono font-bold text-gold">
                  {BASIJ_OFFICIAL_INFO.sistersAdminHandle}
                </span>
              </a>
            </div>

            <div className="pt-2 border-t border-line/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] text-ink-muted">
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                <span>مراجعه حضوری به <strong className="text-ink">میز استقبال بسیج دانشجویی</strong> در روزهای ثبت‌نام</span>
              </p>
              <p className="flex items-start gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                <span>مراجعه به <strong className="text-ink">پایگاه بسیج دانشجویی</strong> در طول ترم تحصیلی</span>
              </p>
            </div>
          </div>

          {/* دکمه‌های اقدام */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={BASIJ_OFFICIAL_INFO.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[46px] px-5 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>کانال رسمی بسیج ({BASIJ_OFFICIAL_INFO.telegramHandle})</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-sm font-semibold text-ink cursor-pointer"
            >
              بازگشت به چارت
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
