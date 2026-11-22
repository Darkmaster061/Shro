import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Clock } from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from './LogoEmblem';
import { toPersianDigits } from '../utils/persian';

/**
 * صفحه خوش‌آمد اولیه (Soft Gate)
 * پس از کلیک روی هر دو کانال بسیج و هیئت و گذشت ۵ ثانیه، دکمه ادامه فعال می‌شود.
 */
export const WelcomeGate: React.FC = () => {
  const { settings, gatePassed, completeGate } = usePortal();
  const [basijClicked, setBasijClicked] = useState(false);
  const [heyatClicked, setHeyatClicked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const bothClicked = basijClicked && heyatClicked;

  useEffect(() => {
    if (!bothClicked) return;
    setCountdown(5);
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [bothClicked]);

  if (gatePassed) return null;

  const canContinue = bothClicked && countdown === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 dark:bg-[#040d0c]/95 backdrop-blur-xl p-4 overflow-y-auto"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-20 dark:opacity-30 bg-cover bg-center"
        style={{ backgroundImage: 'url(/assets/hero-gonabad-arch.webp)' }}
      />
      <div className="relative z-10 w-full max-w-3xl rounded-3xl glass-panel gold-top-accent p-6 sm:p-8 my-auto">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-5">
            <LogoEmblem type="basij" src={settings.basijLogoUrl} size="md" />
            <span className="h-8 w-px bg-gold/40" aria-hidden="true" />
            <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="md" />
          </div>

          <p className="text-xs font-bold text-gold mb-2">
            {settings.universityName} · ورودی ۱۴۰۵
          </p>
          <h1
            id="welcome-gate-title"
            className="text-2xl sm:text-3xl font-extrabold text-ink leading-snug"
          >
            به خانواده دانشجویی <span className="text-gold-shimmer">خوش آمدی</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-xl">
            لطفاً عضو هر دو کانال اطلاع‌رسانی شو تا اطلاعیه‌های ثبت‌نام، خوابگاه، کانون‌ها و زمان‌بندی صبحانه از دستت نرود.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
          {/* کارت کانال بسیج */}
          <div
            className={`rounded-2xl border p-5 transition-colors ${
              basijClicked
                ? 'border-emerald-500/50 bg-emerald-500/8'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <LogoEmblem type="basij" src={settings.basijLogoUrl} size="sm" />
                <div>
                  <h2 className="font-bold text-ink text-base">کانال بسیج دانشجویی</h2>
                  <p className="text-xs text-ink-muted">اطلاعیه‌های ثبت‌نام، کانون‌ها و مهارت‌آموزی</p>
                </div>
              </div>
              {basijClicked && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-label="بازدید شد" />
              )}
            </div>

            <a
              href={settings.basijTelegramUrl || 'https://t.me/BasijUOG'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setBasijClicked(true)}
              className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <span>عضویت در کانال تلگرام بسیج</span>
              <span dir="ltr" className="font-mono text-xs opacity-90">
                @BasijUOG
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span>پیام‌رسان و لینک‌های رسمی:</span>
              {settings.basijEitaaUrl && (
                <a
                  href={settings.basijEitaaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setBasijClicked(true)}
                  className="text-gold hover:underline font-medium"
                >
                  کانال ایتا
                </a>
              )}
              <a
                href="https://zil.ink/basijuog"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setBasijClicked(true)}
                className="text-gold hover:underline font-medium"
              >
                پروفایل (zil.ink)
              </a>
              {settings.basijBaleUrl && (
                <a
                  href={settings.basijBaleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setBasijClicked(true)}
                  className="text-gold hover:underline font-medium"
                >
                  بله
                </a>
              )}
              {settings.basijRubikaUrl && (
                <a
                  href={settings.basijRubikaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setBasijClicked(true)}
                  className="text-gold hover:underline font-medium"
                >
                  روبیکا
                </a>
              )}
            </div>
          </div>

          {/* کارت کانال هیئت */}
          <div
            className={`rounded-2xl border p-5 transition-colors ${
              heyatClicked
                ? 'border-emerald-500/50 bg-emerald-500/8'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="sm" />
                <div>
                  <h2 className="font-bold text-ink text-base">هیئت دانشجویی محبان‌الحسین (ع)</h2>
                  <p className="text-xs text-ink-muted">برنامه‌های هفتگی، مناسبتی و اطلاع‌رسانی صبحانه</p>
                </div>
              </div>
              {heyatClicked && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-label="بازدید شد" />
              )}
            </div>

            <a
              href={settings.heyatTelegramUrl || 'https://t.me/mohebbanolhosein_uog'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setHeyatClicked(true)}
              className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <span>عضویت در کانال تلگرام هیئت</span>
              <span dir="ltr" className="font-mono text-xs opacity-90">
                @mohebbanolhosein_uog
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {(settings.heyatEitaaUrl || settings.heyatBaleUrl || settings.heyatRubikaUrl) && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                <span>پیام‌رسان جایگزین:</span>
                {settings.heyatEitaaUrl && (
                  <a
                    href={settings.heyatEitaaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setHeyatClicked(true)}
                    className="text-gold hover:underline font-medium"
                  >
                    ایتا
                  </a>
                )}
                {settings.heyatBaleUrl && (
                  <a
                    href={settings.heyatBaleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setHeyatClicked(true)}
                    className="text-gold hover:underline font-medium"
                  >
                    بله
                  </a>
                )}
                {settings.heyatRubikaUrl && (
                  <a
                    href={settings.heyatRubikaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setHeyatClicked(true)}
                    className="text-gold hover:underline font-medium"
                  >
                    روبیکا
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={!canContinue}
            onClick={completeGate}
            className={`w-full sm:w-auto min-w-[240px] min-h-[48px] px-7 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              canContinue
                ? 'bg-gold text-[#071714] hover:bg-gold-strong shadow-lg cursor-pointer'
                : 'bg-surface-elevated text-ink-muted cursor-not-allowed border border-line'
            }`}
          >
            {!bothClicked && <span>ابتدا روی لینک هر دو کانال کلیک کن</span>}
            {bothClicked && countdown !== null && countdown > 0 && (
              <>
                <Clock className="w-4 h-4" />
                <span>آماده‌سازی ورود ({toPersianDigits(countdown)} ثانیه)...</span>
              </>
            )}
            {canContinue && <span>عضو شدم، ادامه به پرتال</span>}
          </button>

          <p className="text-xs text-ink-muted text-center">
            این پنجره فقط یک بار هنگام اولین ورود نمایش داده می‌شود و نیازی به وارد کردن شماره تماس یا رمز نیست.
          </p>
        </div>
      </div>
    </div>
  );
};
