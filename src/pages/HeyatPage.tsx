import React, { useEffect, useMemo, useState } from 'react';
import {
  Bus,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  History,
  MapPin,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from '../components/LogoEmblem';
import { JalaliDatePicker } from '../components/JalaliDatePicker';
import { GeometricLatticeBg } from '../components/GeometricLatticeBg';
import { HeyatAudioPlayer } from '../components/HeyatAudioPlayer';
import { HEYAT_OFFICIAL_INFO, HEYAT_WEEKLY_SCHEDULE } from '../data/orientation';
import { buildIcsContent, getCountdownParts } from '../utils/jalali';
import { toPersianDigits } from '../utils/persian';
import type { CouponLookupResult, HeyatProgram } from '../types/portal';

const COUPON_CACHE_KEY = 'gonabad_cached_coupon_card';
const PROGRAM_CATS = ['همه', 'صبحانه', 'هفتگی', 'مناسبتی', 'فرهنگی'] as const;

export const HeyatPage: React.FC = () => {
  const { settings, showToast } = usePortal();
  const [programs, setPrograms] = useState<HeyatProgram[]>([]);
  const [catFilter, setCatFilter] = useState<(typeof PROGRAM_CATS)[number]>('همه');

  // فرم دریافت ژتون صبحانه
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthJalali, setBirthJalali] = useState('1387/05/20');
  const [honeypot, setHoneypot] = useState('');
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [coupon, setCoupon] = useState<CouponLookupResult | null>(() => {
    try {
      const cached = localStorage.getItem(COUPON_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [qrDataUrl, setQrDataUrl] = useState('');

  const [nextCountdown, setNextCountdown] = useState(() =>
    getCountdownParts(settings.targetEventDateIso)
  );

  useEffect(() => {
    api.getHeyatPrograms().then(setPrograms).catch(() => {});
  }, []);

  // انتخاب نزدیک‌ترین برنامه آینده برای شمارش معکوس (جلوگیری از صفر شدن تایمر به خاطر مراسم‌های برگزارشده)
  const { upcomingProgram, upcomingList, pastArchiveList } = useMemo(() => {
    const now = Date.now();
    const future: HeyatProgram[] = [];
    const past: HeyatProgram[] = [];
    for (const p of programs) {
      const ts = Date.parse(p.dateIso);
      if (!Number.isNaN(ts) && ts > now) {
        future.push(p);
      } else {
        past.push(p);
      }
    }
    const sortedFuture = [...future].sort((a, b) => Date.parse(a.dateIso) - Date.parse(b.dateIso));
    const sortedPast = [...past].sort((a, b) => Date.parse(b.dateIso) - Date.parse(a.dateIso));
    return {
      upcomingProgram: sortedFuture[0] || null,
      upcomingList: sortedFuture,
      pastArchiveList: sortedPast,
    };
  }, [programs]);

  const countdownTargetIso = upcomingProgram?.dateIso || settings.targetEventDateIso;
  const heyatChannelUrl =
    settings.heyatTelegramUrl || settings.heyatEitaaUrl || HEYAT_OFFICIAL_INFO.telegramUrl;

  useEffect(() => {
    setNextCountdown(getCountdownParts(countdownTargetIso));
    const timer = window.setInterval(() => {
      setNextCountdown(getCountdownParts(countdownTargetIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdownTargetIso]);

  // تولید محلی QR (بدون هیچ درخواست خارجی)
  useEffect(() => {
    if (!coupon?.couponCode) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(coupon.couponCode, {
      width: 320,
      margin: 2,
      color: { dark: '#071714', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [coupon?.couponCode]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setLoadingCoupon(true);
    try {
      const result = await api.lookupCoupon({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthJalali,
        website: honeypot,
      });
      setCoupon(result);
      localStorage.setItem(COUPON_CACHE_KEY, JSON.stringify(result));
      showToast('کارت ژتون صبحانه آماده شد و برای نمایش آفلاین روی گوشی ذخیره گردید.', 'success');
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : 'اطلاعات یافت نشد، با مسئول هیئت تماس بگیر.'
      );
    } finally {
      setLoadingCoupon(false);
    }
  };

  // ذخیره تصویر کارت ژتون به صورت PNG (آفلاین با Canvas)
  const handleDownloadCard = async () => {
    if (!coupon || !qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // پس‌زمینه زمردی تیره و کادر طلایی
    ctx.fillStyle = '#071714';
    ctx.fillRect(0, 0, 720, 960);
    ctx.strokeStyle = '#deb154';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 672, 912);

    ctx.fillStyle = '#deb154';
    ctx.font = 'bold 28px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('کارت دیجیتال ژتون صبحانه نوورودی‌ها', 360, 100);

    ctx.fillStyle = '#a6bab4';
    ctx.font = '20px Vazirmatn, sans-serif';
    ctx.fillText(settings.universityName, 360, 142);

    ctx.fillStyle = '#f4f1e8';
    ctx.font = 'bold 38px Vazirmatn, sans-serif';
    ctx.fillText(`${coupon.firstName} ${coupon.lastName}`, 360, 224);

    if (coupon.note) {
      ctx.fillStyle = '#a6bab4';
      ctx.font = '20px Vazirmatn, sans-serif';
      ctx.fillText(coupon.note, 360, 268);
    }

    const img = new Image();
    img.src = qrDataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(190, 315, 340, 340);
    ctx.drawImage(img, 200, 325, 320, 320);

    ctx.fillStyle = '#deb154';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(coupon.couponCode, 360, 710);

    ctx.fillStyle = '#a6bab4';
    ctx.font = '18px Vazirmatn, sans-serif';
    ctx.fillText('سهمیه یک‌نوبته: این کارت فقط در روز ثبت‌نام شما (یک بار در کل روزها) معتبر است.', 360, 815);
    ctx.fillText(HEYAT_OFFICIAL_INFO.officialName, 360, 860);

    const link = document.createElement('a');
    link.download = `breakfast-coupon-${coupon.lastName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('تصویر کارت ژتون ذخیره شد.', 'success');
  };

  const downloadProgramIcs = (p: HeyatProgram) => {
    const ics = buildIcsContent({
      title: p.title,
      description: p.description,
      location: p.location,
      startIso: p.dateIso,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heyat-event-${p.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleUpcoming =
    catFilter === 'همه'
      ? upcomingList
      : upcomingList.filter((p) => p.category === catFilter);

  const visibleArchive =
    catFilter === 'همه'
      ? pastArchiveList
      : pastArchiveList.filter((p) => p.category === catFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
      {/* معرفی هیئت دانشجویی محبان‌الحسین (ع) با گره‌چینی معنوی و شمارش معکوس برنامه بعدی */}
      <section className="relative rounded-3xl border border-line bg-surface p-6 sm:p-10 overflow-hidden space-y-6">
        <GeometricLatticeBg opacity={0.08} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="md" />
              <div>
                <p className="text-xs font-semibold text-gold">
                  {HEYAT_OFFICIAL_INFO.mainVenue} · کانال رسمی{' '}
                  <span dir="ltr" className="inline-block font-mono">
                    {HEYAT_OFFICIAL_INFO.telegramHandle}
                  </span>
                </p>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-ink leading-tight">
                  هیئت دانشجویی محبان‌الحسین{'\u00A0'}(ع)
                </h1>
                <p className="text-sm font-semibold text-ink-muted mt-0.5">
                  برنامه‌های معنوی، قرارهای هفتگی و سامانه ژتون صبحانه
                </p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              {settings.heyatIntroText}
            </p>
            <blockquote className="border-r-2 border-gold/70 pr-3.5 text-xs sm:text-sm text-ink/90 italic">
              {HEYAT_OFFICIAL_INFO.motto}
            </blockquote>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <a
              href={heyatChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[46px] px-5 rounded-xl bg-gold hover:bg-gold-strong text-[#071714] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>عضویت در کانال تلگرام هیئت</span>
              <span dir="ltr" className="font-mono text-xs opacity-90">
                {HEYAT_OFFICIAL_INFO.telegramHandle}
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="#coupon"
              className="min-h-[44px] px-5 rounded-xl border border-gold/50 bg-gold-soft hover:bg-gold hover:text-[#071714] text-ink font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>دریافت سریع ژتون صبحانه نوورودی‌ها</span>
            </a>
          </div>
        </div>

        {/* نوار شمارش معکوس گرافیکی تا مراسم بعدی */}
        <div className="relative z-10 pt-5 border-t border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold">
              برنامه پیش‌روی هیئت · {upcomingProgram?.dateJalali || settings.targetEventDateJalali}
            </p>
            <p className="text-sm sm:text-base font-bold text-ink mt-0.5">
              {upcomingProgram?.title || settings.targetEventTitle}
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-center" data-testid="heyat-countdown">
            {[
              { val: nextCountdown.days, label: 'روز' },
              { val: nextCountdown.hours, label: 'ساعت' },
              { val: nextCountdown.minutes, label: 'دقیقه' },
              { val: nextCountdown.seconds, label: 'ثانیه' },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-[58px] rounded-xl border border-line bg-canvas px-2.5 py-2"
              >
                <div className="text-base sm:text-lg font-extrabold text-gold tabular-nums">
                  {toPersianDigits(String(item.val).padStart(2, '0'))}
                </div>
                <div className="text-[11px] text-ink-muted">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* قرارهای ثابت هفتگی هیئت دانشجویی محبان‌الحسین (ع) */}
      <section aria-labelledby="weekly-schedule-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gold">برنامه منظم طول ترم</p>
            <h2 id="weekly-schedule-heading" className="text-xl sm:text-2xl font-bold text-ink mt-1">
              قرارهای ثابت هفتگی {HEYAT_OFFICIAL_INFO.shortName}
            </h2>
          </div>
          <p className="text-xs text-ink-muted max-w-md">
            اطلاع‌رسانی دقیق سخنران، مداح و ساعت سرویس هر هفته در کانال رسمی{' '}
            <span className="font-mono text-gold" dir="ltr">
              {HEYAT_OFFICIAL_INFO.telegramHandle}
            </span>{' '}
            منتشر می‌شود.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {HEYAT_WEEKLY_SCHEDULE.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-gold/30 bg-surface p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-gold">{item.dayLabel}</span>
                  <span className="text-xs font-semibold text-ink-muted tabular-nums inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold" />
                    {item.timeRange}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-ink">{item.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{item.description}</p>
              </div>

              <div className="pt-4 border-t border-line space-y-2 text-xs text-ink-muted">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-ink">مکان:</strong> {item.location}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-ink">مخاطب:</strong> {item.audience}
                  </span>
                </p>
                {item.shuttleInfo && (
                  <p className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold-soft/50 px-3 py-2 text-ink">
                    <Bus className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <span>{item.shuttleInfo}</span>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* سامانه دریافت کارت ژتون صبحانه */}
      <section
        id="coupon"
        aria-labelledby="coupon-heading"
        className="scroll-mt-20 rounded-3xl border border-gold/35 bg-surface p-6 sm:p-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* فرم استعلام */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gold mb-1 inline-flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                <span>ویژه نوورودی‌های ثبت‌شده</span>
              </p>
              <h2 id="coupon-heading" className="text-xl sm:text-2xl font-bold text-ink">
                دریافت کارت دیجیتال ژتون صبحانه
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
                نام، نام‌خانوادگی و تاریخ تولد شمسی خود را وارد کن تا کارت QR اختصاصی تو نمایش داده شود. پس از اولین دریافت، کارت به‌صورت آفلاین روی گوشی ذخیره می‌ماند.
              </p>
              <p className="mt-2 text-xs text-gold font-semibold bg-gold-soft/45 border border-gold/25 rounded-xl px-3 py-2">
                نکته مهم: سهمیه صبحانه هر نوورودی در کل روزهای ثبت‌نام فقط یک نوبت و صرفاً در روز ثبت‌نام خودتان است (در صورت دریافت در روز اول، در روزهای بعد امکان دریافت مجدد وجود ندارد).
              </p>
            </div>

            <form onSubmit={handleLookup} className="space-y-4">
              {/* honeypot */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="coupon-first" className="block text-xs font-medium text-ink-muted mb-1.5">
                    نام
                  </label>
                  <input
                    id="coupon-first"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثلاً: علی"
                    className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="coupon-last" className="block text-xs font-medium text-ink-muted mb-1.5">
                    نام‌خانوادگی
                  </label>
                  <input
                    id="coupon-last"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="مثلاً: محمدی"
                    className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-ink-muted mb-1.5">
                  تاریخ تولد شمسی
                </span>
                <JalaliDatePicker
                  value={birthJalali}
                  onChange={setBirthJalali}
                  idPrefix="coupon-birth"
                />
              </div>

              {couponError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300"
                >
                  {couponError}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingCoupon}
                className="w-full min-h-[48px] rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {loadingCoupon ? 'در حال بررسی...' : 'نمایش کارت ژتون صبحانه'}
              </button>

              <p className="text-xs text-ink-muted flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <span>
                  حریم خصوصی: تاریخ تولد خام در سرور نگهداری نمی‌شود و تنها به صورت هش امن تطبیق داده می‌شود.
                </span>
              </p>

              <div className="rounded-xl border border-line bg-canvas p-3 text-xs text-ink-muted">
                راهنمای تست با داده نمونه: نام «علی»، نام‌خانوادگی «محمدی»، تاریخ تولد «۲۰ مرداد ۱۳۸۷» (پس از ورود لیست واقعی از پنل ادمین حذف می‌شود).
              </div>
            </form>
          </div>

          {/* نمایش کارت ژتون */}
          <div className="lg:col-span-6">
            {coupon ? (
              <div
                data-testid="digital-coupon-card"
                className="rounded-3xl border border-gold/50 bg-emerald-deep text-[#f4f1e8] p-6 sm:p-7 space-y-5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
                  <div className="flex items-center gap-3">
                    <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="sm" />
                    <div>
                      <p className="text-xs text-[#deb154] font-semibold">کارت دیجیتال ژتون صبحانه</p>
                      <h3 className="text-xl font-extrabold">
                        {coupon.firstName} {coupon.lastName}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(COUPON_CACHE_KEY);
                      setCoupon(null);
                    }}
                    aria-label="خروج از کارت ذخیره شده"
                    className="p-2 rounded-lg text-white/70 hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {coupon.note && (
                  <p className="text-xs text-white/75">{coupon.note}</p>
                )}

                <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`کد QR ژتون صبحانه ${coupon.firstName} ${coupon.lastName}`}
                      className="w-56 h-56 object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-600 text-xs">
                      در حال ساخت کد QR...
                    </div>
                  )}
                  <span className="mt-2 font-mono text-xs text-slate-700 select-all">
                    {coupon.couponCode}
                  </span>
                </div>

                {/* وضعیت سهمیه یک‌نوبته و وعده‌های فعال */}
                {(coupon.hasClaimedAny || coupon.claimedMealIds.length > 0) && (
                  <div className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-200 leading-relaxed">
                    <strong>سهمیه صبحانه شما دریافت شده است</strong>
                    {coupon.claimedMealName ? ` (${coupon.claimedMealName}` : ''}
                    {coupon.claimedDateJalali ? ` · ${coupon.claimedDateJalali})` : coupon.claimedMealName ? ')' : ''}
                    {' '}— سهمیه هر نوورودی در کل روزهای ثبت‌نام فقط یک نوبت است.
                  </div>
                )}

                {coupon.activeMeals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-[#deb154] font-semibold">
                      زمان‌بندی وعده‌های صبحانه (سهمیه یک‌نوبته در روز ثبت‌نام):
                    </p>
                    <div className="space-y-1.5">
                      {coupon.activeMeals.map((m) => {
                        const usedThisMeal = coupon.claimedMealIds.includes(m.id);
                        const usedAnyDay = Boolean(coupon.hasClaimedAny || coupon.claimedMealIds.length > 0);
                        return (
                          <div
                            key={m.id}
                            className="rounded-xl bg-white/8 px-3.5 py-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold block">{m.name}</span>
                              <span className="text-white/70 tabular-nums">
                                {m.dateJalali} · {m.startTime} تا {m.endTime}
                              </span>
                            </div>
                            <span
                              className={`font-semibold inline-flex items-center gap-1 ${
                                usedThisMeal
                                  ? 'text-amber-300'
                                  : usedAnyDay
                                  ? 'text-white/55'
                                  : 'text-emerald-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {usedThisMeal
                                ? 'دریافت شده'
                                : usedAnyDay
                                ? 'سهمیه مصرف شده'
                                : 'قابل استفاده در روز ثبت‌نام'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="no-print flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#deb154] text-[#071714] hover:bg-[#f0c76f] font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ذخیره تصویر کارت</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[44px] px-4 rounded-xl border border-white/25 hover:border-white/50 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[340px] rounded-3xl border border-dashed border-line bg-canvas p-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gold-soft text-gold flex items-center justify-center">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-ink">کارت ژتون دیجیتال تو اینجا نمایش داده می‌شود</h3>
                <p className="text-sm text-ink-muted max-w-sm">
                  اطلاعاتت را در فرم مقابل وارد کن تا QR اختصاصی تو ساخته شود و بدون نیاز به اینترنت هم همیشه همراهت باشد.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* پخش‌کننده صوتی بومی با موج صوتی (Waveform) */}
      <HeyatAudioPlayer />

      {/* تقویم شمسی برنامه‌های پیش‌رو و گزارش مراسم‌های برگزارشده از اول ترم ۱۴۰۵ */}
      <section aria-labelledby="programs-heading" className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold">تقویم اجرایی و کارنامه ترم پاییز ۱۴۰۵</p>
            <h2 id="programs-heading" className="text-xl sm:text-2xl font-bold text-ink mt-1">
              برنامه‌های پیش‌رو و مراسم‌های برگزارشده هیئت
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-surface border border-line p-1 rounded-xl">
            {PROGRAM_CATS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  catFilter === cat
                    ? 'bg-gold text-[#071714]'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* بخش ۱: برنامه‌های پیش‌رو و هفتگی */}
        {visibleUpcoming.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-gold" />
              <span>برنامه‌های پیش‌رو و قرارهای هفتگی ({toPersianDigits(visibleUpcoming.length)})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleUpcoming.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-gold/30 bg-surface p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-muted mb-2">
                      <span className="text-gold font-bold">{p.category}</span>
                      <span className="tabular-nums">{p.dateJalali}</span>
                    </div>
                    <h4 className="text-base font-bold text-ink">{p.title}</h4>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">{p.description}</p>
                    <div className="mt-3 space-y-1.5 text-xs text-ink-muted">
                      <p>
                        <strong className="text-ink">ساعت:</strong> {p.timeRange}
                      </p>
                      <p>
                        <strong className="text-ink">مکان:</strong> {p.location}
                      </p>
                      {p.speaker && p.speaker !== '—' && (
                        <p>
                          <strong className="text-ink">سخنران:</strong> {p.speaker}
                        </p>
                      )}
                      {p.maddah && p.maddah !== '—' && (
                        <p>
                          <strong className="text-ink">مداح:</strong> {p.maddah}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadProgramIcs(p)}
                    className="mt-4 pt-3 border-t border-line w-full text-xs text-gold hover:underline font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>افزودن به تقویم گوشی (ICS)</span>
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* بخش ۲: گزارش مراسم‌های برگزارشده از ابتدای ترم پاییز ۱۴۰۵ */}
        {visibleArchive.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                <History className="w-5 h-5 text-gold" />
                <span>
                  گزارش مراسم‌های برگزارشده از ابتدای ترم پاییز ۱۴۰۵ (
                  {toPersianDigits(visibleArchive.length)} مراسم)
                </span>
              </h3>
              <span className="text-xs text-ink-muted">
                منبع: آرشیو کانال رسمی{' '}
                <span dir="ltr" className="inline-block font-mono text-gold">
                  {HEYAT_OFFICIAL_INFO.telegramHandle}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleArchive.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-line bg-surface p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-muted mb-2">
                      <span className="text-gold font-semibold">{p.category}</span>
                      <span className="tabular-nums">{p.dateJalali}</span>
                    </div>
                    <h4 className="text-base font-bold text-ink">
                      {p.title.replace(/\s*\(برگزارشده\)\s*$/, '')}
                    </h4>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">{p.description}</p>
                    <div className="mt-3 pt-3 border-t border-line/70 space-y-1.5 text-xs text-ink-muted">
                      <p>
                        <strong className="text-ink">زمان:</strong> {p.timeRange}
                      </p>
                      <p>
                        <strong className="text-ink">مکان:</strong> {p.location}
                      </p>
                      {p.speaker && p.speaker !== '—' && (
                        <p>
                          <strong className="text-ink">سخنران:</strong> {p.speaker}
                        </p>
                      )}
                      {p.maddah && p.maddah !== '—' && (
                        <p>
                          <strong className="text-ink">با نوای:</strong> {p.maddah}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {visibleUpcoming.length === 0 && visibleArchive.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-canvas p-8 text-center text-sm text-ink-muted">
            مراسمی در این دسته‌بندی ثبت نشده است.
          </div>
        )}
      </section>
    </div>
  );
};
