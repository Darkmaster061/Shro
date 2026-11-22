import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  ChevronDown,
  Download,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from './LogoEmblem';
import { GeometricLatticeBg } from './GeometricLatticeBg';
import { OFFICIAL_REGISTRATION_DAYS } from '../data/orientation';
import {
  buildPassportSerial,
  findRegistrationDayForMajor,
  saveFreshmanProfile,
  type FreshmanProfile,
} from '../utils/freshmanPassport';

interface FreshmanPassportSectionProps {
  profile: FreshmanProfile | null;
  onProfileChange: (next: FreshmanProfile | null) => void;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * بخش تعاملی «گذرنامه یادگاری ورودی ۱۴۰۵ + تشخیص خودکار روز ثبت‌نام رشته»
 * ۱۰۰٪ محلی در مرورگر (بدون ارسال داده شخصی به سرور) با قابلیت دانلود استوری یادگاری ۱۰۸۰×۱۹۲۰
 */
export const FreshmanPassportSection: React.FC<FreshmanPassportSectionProps> = ({
  profile,
  onProfileChange,
}) => {
  const { settings, liteMode, showToast } = usePortal();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [major, setMajor] = useState(profile?.major || 'مهندسی کامپیوتر');
  const [downloading, setDownloading] = useState(false);

  // افکت سه‌بعدی و درخشش هولوگرافیک فلزی دنبال‌کننده نشانگر
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 72, gy: 24, active: false });

  const regDay = useMemo(() => findRegistrationDayForMajor(major), [major]);
  const displayName = fullName.trim() || 'دانشجوی عزیز ورودی ۱۴۰۵';
  const serial = useMemo(() => buildPassportSerial(displayName, major), [displayName, major]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (liteMode || e.pointerType === 'touch') return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 11,
      ry: (px - 0.5) * 11,
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 72, gy: 24, active: false });
  };

  const handleSavePersonalization = () => {
    const next: FreshmanProfile = { fullName: fullName.trim(), major };
    saveFreshmanProfile(next);
    onProfileChange(next);
    showToast(
      `پرتال برای رشته «${major}» شخصی‌سازی شد (${regDay?.dayTitle || 'ثبت‌نام ۱۴۰۵'}).`,
      'success'
    );
  };

  const handleClearPersonalization = () => {
    saveFreshmanProfile(null);
    onProfileChange(null);
    setFullName('');
    showToast('شخصی‌سازی کارت از حافظه مرورگر پاک شد.', 'info');
  };

  // تولید پوستر استوری ۱۰۸۰×۱۹۲۰ به‌صورت کاملاً محلی (آفلاین) روی Canvas
  const handleDownloadStory = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // پس‌زمینه زمردی عمیق
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#07241e');
      bgGrad.addColorStop(0.5, '#051512');
      bgGrad.addColorStop(1, '#092c24');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // لایه تصویر معماری گناباد در نیمه بالایی پوستر
      const archImg = await loadImage('/assets/hero-gonabad-arch.jpg');
      if (archImg) {
        ctx.save();
        ctx.globalAlpha = 0.42;
        const scale = Math.max(1080 / archImg.width, 960 / archImg.height);
        const w = archImg.width * scale;
        const h = archImg.height * scale;
        ctx.drawImage(archImg, (1080 - w) / 2, 0, w, h);
        ctx.restore();

        const fade = ctx.createLinearGradient(0, 260, 0, 1040);
        fade.addColorStop(0, 'rgba(5, 21, 18, 0.12)');
        fade.addColorStop(0.7, 'rgba(5, 21, 18, 0.92)');
        fade.addColorStop(1, 'rgba(5, 21, 18, 1)');
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, 1080, 1080);
      }

      // قاب طلایی دوخطی معماری
      ctx.strokeStyle = 'rgba(222, 177, 84, 0.65)';
      ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, 984, 1824);
      ctx.strokeStyle = 'rgba(222, 177, 84, 0.24)';
      ctx.lineWidth = 2;
      ctx.strokeRect(68, 68, 944, 1784);

      // نشان بسیج در بالای استوری
      const logoImg = await loadImage(settings.basijLogoUrl || '/assets/basij-logo-official.png');
      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 210, 82, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#deb154';
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(logoImg, 466, 136, 148, 148);
        ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.direction = 'rtl';

      ctx.fillStyle = '#deb154';
      ctx.font = 'bold 34px Vazirmatn, sans-serif';
      ctx.fillText('گذرنامه رسمی نوورودی ۱۴۰۵', 540, 365);

      ctx.fillStyle = '#f4f1e8';
      ctx.font = '800 56px Vazirmatn, sans-serif';
      ctx.fillText(settings.universityName, 540, 445);

      // خط جداکننده طلایی
      const lineGrad = ctx.createLinearGradient(220, 0, 860, 0);
      lineGrad.addColorStop(0, 'rgba(222,177,84,0)');
      lineGrad.addColorStop(0.5, 'rgba(222,177,84,0.85)');
      lineGrad.addColorStop(1, 'rgba(222,177,84,0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(220, 505, 640, 3);

      // کارت مرکزی مشخصات دانشجو
      ctx.fillStyle = 'rgba(11, 45, 38, 0.86)';
      ctx.strokeStyle = 'rgba(222, 177, 84, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(108, 610, 864, 720, 42);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a6bab4';
      ctx.font = '600 32px Vazirmatn, sans-serif';
      ctx.fillText('قبولیت در خانواده دانشگاه گناباد مبارک!', 540, 710);

      ctx.fillStyle = '#f7dc94';
      ctx.font = '900 66px Vazirmatn, sans-serif';
      ctx.fillText(displayName, 540, 825);

      ctx.fillStyle = '#f4f1e8';
      ctx.font = '700 42px Vazirmatn, sans-serif';
      ctx.fillText(`رشته: ${major}`, 540, 925);

      // باکس زمان ثبت‌نام حضوری
      if (regDay) {
        ctx.fillStyle = 'rgba(222, 177, 84, 0.14)';
        ctx.strokeStyle = 'rgba(222, 177, 84, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(168, 1005, 744, 195, 28);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#deb154';
        ctx.font = '700 30px Vazirmatn, sans-serif';
        ctx.fillText('روز مراجعه برای ثبت‌نام حضوری:', 540, 1072);

        ctx.fillStyle = '#f4f1e8';
        ctx.font = '800 38px Vazirmatn, sans-serif';
        ctx.fillText(`${regDay.dayTitle} · ${regDay.timeRange}`, 540, 1148);
      }

      ctx.fillStyle = 'rgba(244, 241, 232, 0.65)';
      ctx.font = '600 26px monospace';
      ctx.fillText(serial, 540, 1280);

      // امضای پایین استوری
      ctx.fillStyle = '#deb154';
      ctx.font = '700 32px Vazirmatn, sans-serif';
      ctx.fillText('بسیج دانشجویی (حوزه شهید شوریده) و هیئت محبان‌الحسین (ع)', 540, 1665);

      ctx.fillStyle = '#a6bab4';
      ctx.font = '500 28px Vazirmatn, sans-serif';
      ctx.fillText('همراه شما از گام صفر ثبت‌نام تا پایان تحصیل', 540, 1730);

      ctx.fillStyle = '#deb154';
      ctx.font = '600 26px monospace';
      ctx.fillText('@BasijUOG  ·  @mohebbanolhosein_uog', 540, 1795);

      const link = document.createElement('a');
      link.download = `gonabad-1405-pass-${serial}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('استوری یادگاری ورودی ۱۴۰۵ با کیفیت Full HD ذخیره شد!', 'success');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section
      id="passport"
      aria-labelledby="passport-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
    >
      <div className="rounded-[2rem] border border-gold/30 bg-surface p-6 sm:p-8 lg:p-10 shadow-[var(--shadow-card)] gold-top-accent overflow-hidden relative">
        <GeometricLatticeBg opacity={0.04} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* ستون فرم تعاملی و تشخیص روز ثبت‌نام */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>تجربه اختصاصی ورودی‌های ۱۴۰۵</span>
              </p>
              <h2
                id="passport-heading"
                className="text-2xl sm:text-3xl font-extrabold text-ink leading-snug"
              >
                گذرنامه یادگاری و{' '}
                <span className="text-gold-shimmer">تشخیص آنی روز ثبت‌نام تو</span>
              </h2>
              <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
                اسم و رشته‌ات را انتخاب کن تا دقیقاً بدانی کدام روز برای ثبت‌نام حضوری باید بیایی، پرتال با نام خودت شخصی‌سازی شود و پوستر استوری یادگاری ورودی ۱۴۰۵ دانشگاه گناباد را دانلود کنی.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="passport-name"
                  className="block text-xs font-semibold text-ink-muted mb-1.5"
                >
                  نام و نام‌خانوادگی (اختیاری)
                </label>
                <input
                  id="passport-name"
                  type="text"
                  maxLength={50}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="نام تو روی کارت..."
                  className="w-full min-h-[46px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink focus:border-gold"
                />
              </div>

              <div>
                <label
                  htmlFor="passport-major"
                  className="block text-xs font-semibold text-ink-muted mb-1.5"
                >
                  رشته قبولی تو در گناباد
                </label>
                <div className="relative">
                  <select
                    id="passport-major"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full min-h-[46px] appearance-none rounded-xl border border-line bg-canvas pl-10 pr-3.5 text-sm text-ink focus:border-gold cursor-pointer"
                  >
                    {OFFICIAL_REGISTRATION_DAYS.map((day) => (
                      <optgroup key={day.id} label={day.dayTitle}>
                        {day.majors.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="w-4 h-4 text-ink-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  />
                </div>
              </div>
            </div>

            {/* نتیجه فوری روز مراجعه رشته */}
            {regDay && (
              <motion.div
                key={regDay.id}
                initial={liteMode ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="rounded-2xl border border-gold/40 bg-gold-soft/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold text-[#071714] flex items-center justify-center shrink-0">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gold">روز رسمی ثبت‌نام حضوری رشته تو</p>
                    <p className="text-sm sm:text-base font-extrabold text-ink mt-0.5 tabular-nums">
                      {regDay.dayTitle} · ساعت {regDay.timeRange}
                    </p>
                  </div>
                </div>
                <Link
                  to="/guide#steps"
                  className="text-xs font-bold text-gold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>مراحل و مدارک</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            )}

            {/* دکمه‌های اقدام */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadStory}
                className="btn-sheen min-h-[46px] px-5 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'در حال ساخت پوستر...' : 'دانلود استوری یادگاری (۱۰۸۰×۱۹۲۰)'}</span>
              </button>

              <button
                type="button"
                onClick={handleSavePersonalization}
                className="min-h-[46px] px-4 rounded-xl border border-gold/40 bg-canvas hover:border-gold text-ink font-bold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                {profile?.major === major && profile?.fullName === fullName.trim() ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <UserCheck className="w-4 h-4 text-gold" />
                )}
                <span>شخصی‌سازی پرتال برای من</span>
              </button>

              {profile && (
                <button
                  type="button"
                  onClick={handleClearPersonalization}
                  aria-label="پاک کردن شخصی‌سازی"
                  className="min-h-[44px] px-3 rounded-xl border border-line text-ink-muted hover:text-ink text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-ink-muted flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>کاملاً خصوصی: این کارت فقط روی گوشی خودت ساخته می‌شود و هیچ داده‌ای به سرور ارسال نمی‌گردد.</span>
            </p>
          </div>

          {/* ستون کارت فلزی-هولوگرافیک سه‌بعدی تعاملی */}
          <div className="lg:col-span-6 order-first lg:order-last flex justify-center">
            <div
              ref={cardRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              data-testid="freshman-passport-card"
              style={{
                transform: liteMode
                  ? undefined
                  : `perspective(1100px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
              }}
              className="holo-passport relative w-full max-w-[460px] rounded-[1.75rem] p-6 sm:p-7 text-[#f4f1e8] overflow-hidden transition-transform duration-200 ease-out will-change-transform select-none"
            >
              <GeometricLatticeBg opacity={0.09} />

              {/* انعکاس نور طلایی-هولوگرافیک دنبال‌کننده نشانگر */}
              {!liteMode && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                  style={{
                    opacity: tilt.active ? 0.9 : 0.45,
                    background: `radial-gradient(380px circle at ${tilt.gx}% ${tilt.gy}%, rgba(247, 220, 148, 0.24), transparent 58%)`,
                  }}
                />
              )}

              {/* گوشه‌های معماری طلایی */}
              <span className="pointer-events-none absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-[#deb154]/60 rounded-tr-lg" />
              <span className="pointer-events-none absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-[#deb154]/60 rounded-tl-lg" />
              <span className="pointer-events-none absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-[#deb154]/60 rounded-br-lg" />
              <span className="pointer-events-none absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-[#deb154]/60 rounded-bl-lg" />

              <div className="relative z-10 space-y-5">
                {/* سرکارت */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <LogoEmblem type="basij" src={settings.basijLogoUrl} size="sm" />
                    <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="sm" />
                    <div>
                      <p className="text-[11px] font-bold text-[#deb154]">
                        {settings.universityName}
                      </p>
                      <p className="text-[11px] text-white/70">گذرنامه یادگاری نوورودی‌ها</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] tracking-widest text-[#deb154]/80 font-mono">
                      CLASS OF
                    </span>
                    <span className="block text-xl font-black text-[#f7dc94] tabular-nums leading-none">
                      ۱۴۰۵
                    </span>
                  </div>
                </div>

                {/* بدنه مشخصات */}
                <div className="py-4 border-y border-white/12 space-y-2.5">
                  <div>
                    <span className="block text-[11px] text-white/60">دارنده گذرنامه</span>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#f7dc94] truncate mt-0.5">
                      {displayName}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="block text-[11px] text-white/60">رشته تحصیلی</span>
                      <p className="text-sm font-bold text-white mt-0.5">{major}</p>
                    </div>
                    <div>
                      <span className="block text-[11px] text-white/60">موعد ثبت‌نام حضوری</span>
                      <p className="text-xs sm:text-sm font-bold text-[#deb154] mt-0.5 tabular-nums">
                        {regDay ? regDay.dayTitle : 'آذر ۱۴۰۵'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* پاورقی کارت */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-white/70">
                  <span>بسیج دانشجویی و هیئت محبان‌الحسین (ع)</span>
                  <span dir="ltr" className="font-mono text-[#deb154] tracking-wider whitespace-nowrap shrink-0">
                    {serial}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
