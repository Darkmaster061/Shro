import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold-soft text-ink hover:bg-gold hover:text-[#071714] transition-colors font-medium whitespace-nowrap cursor-pointer ${
          compact ? 'px-3 py-1.5 text-xs min-h-[36px]' : 'px-4 py-2 text-sm min-h-[44px]'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>نصب نسخه اپلیکیشن (PWA)</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface hover:border-gold/40 text-ink transition-colors font-medium whitespace-nowrap cursor-pointer ${
          compact ? 'px-3 py-1.5 text-xs min-h-[36px]' : 'px-4 py-2 text-sm min-h-[44px]'
        }`}
      >
        <Smartphone className="w-4 h-4 shrink-0 text-gold" />
        <span>{isIOS ? 'نصب روی آیفون' : 'راهنمای نصب روی گوشی'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="راهنمای نصب نسخه آفلاین روی گوشی"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl glass-panel p-6 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">افزودن پرتال به صفحه اصلی گوشی</h3>
              <button
                type="button"
                aria-label="بستن راهنما"
                onClick={() => setShowGuide(false)}
                className="p-2 rounded-lg text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-ink-muted">
              <p>
                با افزودن این پرتال به صفحه اصلی گوشی، صفحات راهنما، چک‌لیست و کارت ژتون صبحانه حتی بدون اینترنت هم در دسترس خواهند بود:
              </p>
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1.5">
                <p className="font-semibold text-ink">در گوشی‌های آیفون (Safari):</p>
                <p>۱. دکمه اشتراک‌گذاری (Share) در پایین مرورگر را لمس کن.</p>
                <p>۲. گزینه «Add to Home Screen» را انتخاب و تأیید کن.</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1.5">
                <p className="font-semibold text-ink">در گوشی‌های اندروید (Chrome):</p>
                <p>۱. منوی سه‌نقطه بالای مرورگر را باز کن.</p>
                <p>۲. گزینه «نصب برنامه / Add to Home screen» را بزن.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-gold text-[#071714] font-bold text-sm"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-16 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3.5 py-2 text-xs font-medium shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>حالت آفلاین فعال است — نمایش اطلاعات ذخیره‌شده</span>
    </div>
  );
};
