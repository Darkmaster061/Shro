import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Coffee,
  Download,
  GraduationCap,
  IdCard,
  KeyRound,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from '../components/LogoEmblem';
import { JalaliDatePicker } from '../components/JalaliDatePicker';
import { GeometricLatticeBg } from '../components/GeometricLatticeBg';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { getFreshmenWelcomePhotos } from '../data/heyatArchive';
import { HEYAT_OFFICIAL_INFO } from '../data/orientation';
import { ALL_OFFICIAL_MAJORS } from '../utils/freshmanPassport';
import {
  normalizeStudentNumber,
  validateIranianMobile,
  validateIranianNationalId,
  validateStudentNumber,
} from '../utils/studentValidation';
import { toPersianDigits } from '../utils/persian';
import type { CouponCheckResponse, CouponLookupResult } from '../types/portal';

const COUPON_CACHE_KEY = 'gonabad_cached_coupon_card';

export const CouponPage: React.FC = () => {
  const { settings, showToast } = usePortal();

  // گام ۱: بررسی شماره دانشجویی
  const [studentNumberInput, setStudentNumberInput] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [checkResult, setCheckResult] = useState<CouponCheckResponse | null>(null);
  const [checkError, setCheckError] = useState('');

  // گام ۲: فرم تکمیل مشخصات (فقط وقتی کد سبز شده باشد باز می‌شود)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthJalali, setBirthJalali] = useState('1386/06/15');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [major, setMajor] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState('');

  // حالت بازیابی امن کارت صادرشده (شماره دانشجویی + کد ملی)
  const [recoverNationalId, setRecoverNationalId] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState('');

  // حالت جایگزین استعلام قدیمی (برای لیست‌های CSV قدیمی در صورت وجود)
  const [showLegacyMode, setShowLegacyMode] = useState(false);
  const [legacyFirst, setLegacyFirst] = useState('');
  const [legacyLast, setLegacyLast] = useState('');
  const [legacyBirth, setLegacyBirth] = useState('1386/06/15');
  const [legacyDailyCode, setLegacyDailyCode] = useState('');
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState('');

  // کارت QR ذخیره‌شده
  const [coupon, setCoupon] = useState<CouponLookupResult | null>(() => {
    try {
      const cached = localStorage.getItem(COUPON_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [welcomeLightboxIdx, setWelcomeLightboxIdx] = useState<number | null>(null);
  const freshmenWelcomePhotos = useMemo(() => getFreshmenWelcomePhotos(), []);

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

  const handleCheckStudentNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckError('');
    setFormError('');
    setRecoverError('');

    const localValidation = validateStudentNumber(studentNumberInput, { require405: false });
    if (!localValidation.valid) {
      setCheckError(localValidation.error || 'شماره دانشجویی معتبر نیست.');
      setCheckResult(null);
      return;
    }

    setCheckingCode(true);
    try {
      const res = await api.checkStudentNumber(localValidation.normalized, honeypot);
      setCheckResult(res);
      if (res.status === 'authorized') {
        showToast('شماره دانشجویی شما تایید و سبز شد! حالا فرم زیر را تکمیل کنید.', 'success');
      }
    } catch (err) {
      setCheckResult(null);
      setCheckError(err instanceof Error ? err.message : 'خطا در بررسی شماره دانشجویی');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkResult || checkResult.status !== 'authorized') return;
    setFormError('');

    const natCheck = validateIranianNationalId(nationalId);
    if (!natCheck.valid) {
      setFormError(natCheck.error || 'کد ملی معتبر نیست.');
      return;
    }
    const phoneCheck = validateIranianMobile(phone);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.error || 'شماره تماس معتبر نیست.');
      return;
    }
    if (!major.trim()) {
      setFormError('لطفاً رشته تحصیلی خود را انتخاب کنید.');
      return;
    }

    setSubmittingForm(true);
    try {
      const result = await api.registerCouponByStudentNumber({
        studentNumber: checkResult.studentNumber,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthJalali,
        nationalId: natCheck.normalized,
        phone: phoneCheck.normalized,
        major: major.trim(),
        website: honeypot,
      });
      setCoupon(result);
      localStorage.setItem(COUPON_CACHE_KEY, JSON.stringify(result));
      setCheckResult(null);
      showToast('ژتون صبحانه شما با موفقیت صادر و برای نمایش آفلاین ذخیره شد!', 'success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ثبت مشخصات و صدور ژتون.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkResult || checkResult.status !== 'registered') return;
    setRecoverError('');

    const natCheck = validateIranianNationalId(recoverNationalId);
    if (!natCheck.valid) {
      setRecoverError(natCheck.error || 'کد ملی ۱۰ رقمی معتبر وارد کنید.');
      return;
    }

    setRecovering(true);
    try {
      const result = await api.recoverCouponByStudentNumber({
        studentNumber: checkResult.studentNumber,
        nationalId: natCheck.normalized,
        website: honeypot,
      });
      setCoupon(result);
      localStorage.setItem(COUPON_CACHE_KEY, JSON.stringify(result));
      setCheckResult(null);
      showToast('کارت ژتون صبحانه شما بازیابی و روی گوشی ذخیره شد.', 'success');
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : 'کد ملی با شماره دانشجویی تطابق ندارد.');
    } finally {
      setRecovering(false);
    }
  };

  const handleLegacyLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLegacyError('');
    setLegacyLoading(true);
    try {
      const result = await api.lookupCoupon({
        firstName: legacyFirst.trim(),
        lastName: legacyLast.trim(),
        birthJalali: legacyBirth,
        dailyCode: settings.couponWalkinEnabled ? legacyDailyCode.trim() : undefined,
        website: honeypot,
      });
      setCoupon(result);
      localStorage.setItem(COUPON_CACHE_KEY, JSON.stringify(result));
      showToast('کارت ژتون صبحانه آماده شد و روی گوشی ذخیره گردید.', 'success');
    } catch (err) {
      setLegacyError(
        err instanceof Error ? err.message : 'اطلاعات یافت نشد، با مسئول میز استقبال تماس بگیر.'
      );
    } finally {
      setLegacyLoading(false);
    }
  };

  // ذخیره تصویر کارت ژتون به صورت PNG کاملاً آفلاین با Canvas
  const handleDownloadCard = async () => {
    if (!coupon || !qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#071714';
    ctx.fillRect(0, 0, 720, 1000);
    ctx.strokeStyle = '#deb154';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 672, 952);

    ctx.fillStyle = '#deb154';
    ctx.font = 'bold 28px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('کارت دیجیتال ژتون صبحانه نوورودی‌ها', 360, 95);

    ctx.fillStyle = '#a6bab4';
    ctx.font = '20px Vazirmatn, sans-serif';
    ctx.fillText(settings.universityName, 360, 136);

    ctx.fillStyle = '#f4f1e8';
    ctx.font = 'bold 38px Vazirmatn, sans-serif';
    ctx.fillText(`${coupon.firstName} ${coupon.lastName}`, 360, 212);

    const subMeta = [
      coupon.studentNumber ? `شماره دانشجویی: ${toPersianDigits(coupon.studentNumber)}` : '',
      coupon.major || coupon.note || '',
    ]
      .filter(Boolean)
      .join('  ·  ');
    if (subMeta) {
      ctx.fillStyle = '#deb154';
      ctx.font = '19px Vazirmatn, sans-serif';
      ctx.fillText(subMeta, 360, 258);
    }

    const img = new Image();
    img.src = qrDataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(190, 305, 340, 340);
    ctx.drawImage(img, 200, 315, 320, 320);

    ctx.fillStyle = '#deb154';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(coupon.couponCode, 360, 700);

    if (coupon.cohortGroup) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 20px Vazirmatn, sans-serif';
      ctx.fillText(coupon.cohortGroup, 360, 750);
    }

    ctx.fillStyle = '#a6bab4';
    ctx.font = '18px Vazirmatn, sans-serif';
    ctx.fillText('سهمیه یک‌نوبته: این کارت فقط در روز ثبت‌نام شما (یک بار در کل روزها) معتبر است.', 360, 845);
    ctx.fillText(HEYAT_OFFICIAL_INFO.officialName, 360, 892);

    const link = document.createElement('a');
    link.download = `breakfast-coupon-${coupon.studentNumber || coupon.lastName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('تصویر کارت ژتون ذخیره شد.', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      {/* هدر اختصاصی سامانه ژتون صبحانه (جدا از صفحه هیئت) */}
      <section className="relative overflow-hidden rounded-3xl border border-gold/35 bg-surface p-6 sm:p-9">
        <GeometricLatticeBg opacity={0.075} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center -space-x-2 space-x-reverse">
                <LogoEmblem type="basij" src={settings.basijLogoUrl} size="sm" />
                <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="sm" />
              </div>
              <span className="text-xs font-bold text-gold">
                سامانه اختصاصی پذیرایی صبحانه · {settings.universityName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-ink leading-tight">
              دریافت کارت دیجیتال <span className="text-gold">ژتون صبحانه</span> نوورودی‌ها
            </h1>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              مهمان سفره گرم صبحانه روزهای ثبت‌نام باشید! پس از تایید شماره دانشجویی در{' '}
              <strong className="text-ink">میز استقبال لابی</strong>، کد شما اینجا{' '}
              <strong className="text-emerald-500">سبز</strong> می‌شود و بلافاصله با تکمیل مشخصات،
              کارت QR اختصاصی‌تان صادر خواهد شد.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 shrink-0 lg:w-80 text-xs">
            {[
              { n: '۱', title: 'ثبت کد ۴۰۵ در میز استقبال', desc: 'در لابی ورود شماره دانشجویی‌ات را بگو تا تایید شود' },
              { n: '۲', title: 'سبز شدن کد و تکمیل فرم', desc: 'شماره دانشجویی را همین‌جا بزن و فرم مشخصات را پر کن' },
              { n: '۳', title: 'تحویل صبحانه با کد QR', desc: 'کارت دیجیتال روی گوشی ذخیره می‌شود و آفلاین هم باز است' },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-line bg-canvas/85 px-3.5 py-2.5 flex items-start gap-2.5"
              >
                <span className="w-6 h-6 rounded-lg bg-gold text-[#071714] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </span>
                <div>
                  <p className="font-bold text-ink">{s.title}</p>
                  <p className="text-ink-muted leading-5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* بدنه اصلی: فرم استعلام و ثبت‌نام + نمایش کارت VIP */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ستون فرم‌های تعاملی دانشجو */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
                  <IdCard className="w-4 h-4" />
                  <span>گام اول · بررسی شماره دانشجویی</span>
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-ink mt-1">
                  شماره دانشجویی خود را وارد کن
                </h2>
              </div>
              {checkResult?.status === 'authorized' && (
                <span
                  data-testid="student-id-green-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/45 text-emerald-500 text-xs font-extrabold shrink-0"
                >
                  <BadgeCheck className="w-4 h-4" />
                  <span>تایید و سبز شد</span>
                </span>
              )}
            </div>

            <form onSubmit={handleCheckStudentNumber} className="space-y-3.5">
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

              <div>
                <label
                  htmlFor="coupon-student-number"
                  className="block text-xs font-semibold text-ink-muted mb-1.5"
                >
                  شماره دانشجویی (ورودی ۱۴۰۵ با شروع ۴۰۵ یا کد تاییدشده مدیریت)
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="coupon-student-number"
                    data-testid="coupon-student-number-input"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    required
                    value={studentNumberInput}
                    onChange={(e) => {
                      setStudentNumberInput(e.target.value);
                      if (checkResult && normalizeStudentNumber(e.target.value) !== checkResult.studentNumber) {
                        setCheckResult(null);
                      }
                      setCheckError('');
                    }}
                    placeholder="مثلاً: 4051232173"
                    className={`flex-1 min-h-[50px] rounded-xl border px-4 text-base sm:text-lg font-mono font-bold text-center tracking-widest bg-canvas text-ink transition-colors ${
                      checkResult?.status === 'authorized'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/25 text-emerald-500'
                        : checkResult?.status === 'not_found' || checkResult?.status === 'inactive'
                        ? 'border-amber-500/70'
                        : 'border-line focus:border-gold'
                    }`}
                  />
                  <button
                    type="submit"
                    data-testid="coupon-check-btn"
                    disabled={checkingCode}
                    className="btn-sheen min-h-[50px] px-6 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-extrabold text-sm cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {checkingCode ? 'در حال بررسی...' : 'بررسی شماره دانشجویی'}
                  </button>
                </div>
              </div>

              {checkError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-600 dark:text-red-300 font-medium"
                >
                  {checkError}
                </div>
              )}

              {/* نتیجه بررسی: وضعیت تاییدنشده */}
              {checkResult && (checkResult.status === 'not_found' || checkResult.status === 'inactive') && (
                <div
                  role="alert"
                  data-testid="coupon-not-authorized-box"
                  className="rounded-2xl border border-amber-500/45 bg-amber-500/10 p-4 space-y-2 text-xs sm:text-sm text-ink"
                >
                  <p className="font-bold text-amber-600 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>این شماره دانشجویی هنوز سبز نشده است</span>
                  </p>
                  <p className="text-ink-muted leading-6">{checkResult.message}</p>
                </div>
              )}
            </form>

            {/* گام ۲ — سبز شدن شماره دانشجویی و باز شدن فرم مشخصات */}
            {checkResult?.status === 'authorized' && (
              <div
                data-testid="coupon-green-register-panel"
                className="pt-5 border-t border-emerald-500/35 space-y-5"
              >
                <div className="rounded-2xl border-2 border-emerald-500/55 bg-emerald-500/12 p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-sm sm:text-base text-emerald-700 dark:text-emerald-300">
                        کد دانشجویی {toPersianDigits(checkResult.studentNumber)} تایید و سبز شد!
                      </p>
                      {checkResult.cohortGroup && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 text-[11px] font-bold">
                          {checkResult.cohortGroup}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted leading-6">
                      مشخصات زیر را با دقت تکمیل کن تا کارت QR دیجیتال ژتون صبحانه همان لحظه برایت صادر شود.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-first" className="block text-xs font-semibold text-ink-muted mb-1.5">
                        نام *
                      </label>
                      <input
                        id="reg-first"
                        data-testid="reg-first-name"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="مثلاً: محمدمهدی"
                        className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-last" className="block text-xs font-semibold text-ink-muted mb-1.5">
                        نام‌خانوادگی *
                      </label>
                      <input
                        id="reg-last"
                        data-testid="reg-last-name"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="مثلاً: رضایی"
                        className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-national-id" className="block text-xs font-semibold text-ink-muted mb-1.5">
                        کد ملی (۱۰ رقمی) *
                      </label>
                      <input
                        id="reg-national-id"
                        data-testid="reg-national-id"
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        required
                        maxLength={12}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="0013520849"
                        className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm font-mono text-center text-ink focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-semibold text-ink-muted mb-1.5">
                        شماره تماس (موبایل) *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="reg-phone"
                          data-testid="reg-phone"
                          type="tel"
                          inputMode="tel"
                          dir="ltr"
                          required
                          maxLength={15}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="09151234567"
                          className="w-full min-h-[44px] rounded-xl border border-line bg-canvas pr-9 pl-3.5 text-sm font-mono text-center text-ink focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-ink-muted mb-1.5">
                      تاریخ تولد شمسی *
                    </span>
                    <JalaliDatePicker
                      value={birthJalali}
                      onChange={setBirthJalali}
                      idPrefix="coupon-reg-birth"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-major" className="block text-xs font-semibold text-ink-muted mb-1.5">
                      رشته تحصیلی *
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-gold absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="reg-major"
                        data-testid="reg-major"
                        required
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className="w-full min-h-[46px] rounded-xl border border-line bg-canvas pr-10 pl-3.5 text-sm text-ink focus:border-emerald-500"
                      >
                        <option value="">انتخاب رشته تحصیلی...</option>
                        {ALL_OFFICIAL_MAJORS.map((m) => (
                          <option key={m.major} value={m.major}>
                            {m.major}
                          </option>
                        ))}
                        <option value="سایر رشته‌ها / عضو انجمن و کانون">
                          سایر رشته‌ها / عضو انجمن و کانون
                        </option>
                      </select>
                    </div>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-600 dark:text-red-300 font-medium"
                    >
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    data-testid="reg-submit-btn"
                    disabled={submittingForm}
                    className="btn-sheen w-full min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-emerald-600/20"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{submittingForm ? 'در حال صدور کارت ژتون...' : 'تایید مشخصات و صدور فوری کارت QR صبحانه'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* حالت بازیابی امن کارت صادرشده */}
            {checkResult?.status === 'registered' && (
              <div
                data-testid="coupon-recover-panel"
                className="pt-5 border-t border-gold/30 space-y-4"
              >
                <div className="rounded-2xl border border-gold/40 bg-gold-soft/45 p-4 space-y-1">
                  <p className="font-bold text-sm text-ink flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-gold" />
                    <span>ژتون این شماره دانشجویی قبلاً صادر شده است</span>
                  </p>
                  <p className="text-xs text-ink-muted leading-6">
                    برای حفظ حریم خصوصی و نمایش مجدد کارت QR، کد ملی ۱۰ رقمی خود را وارد کنید.
                  </p>
                </div>

                <form onSubmit={handleRecoverSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="recover-nat" className="block text-xs font-semibold text-ink-muted mb-1.5">
                      کد ملی ۱۰ رقمی جهت تایید هویت
                    </label>
                    <input
                      id="recover-nat"
                      data-testid="recover-national-id"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      required
                      maxLength={12}
                      value={recoverNationalId}
                      onChange={(e) => setRecoverNationalId(e.target.value)}
                      placeholder="کد ملی ۱۰ رقمی خود را وارد کنید"
                      className="w-full min-h-[46px] rounded-xl border border-line bg-canvas px-4 text-sm font-mono text-center text-ink focus:border-gold"
                    />
                  </div>
                  {recoverError && (
                    <p role="alert" className="text-xs text-red-500 font-medium">
                      {recoverError}
                    </p>
                  )}
                  <button
                    type="submit"
                    data-testid="recover-submit-btn"
                    disabled={recovering}
                    className="w-full min-h-[46px] rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-extrabold text-sm cursor-pointer disabled:opacity-60"
                  >
                    {recovering ? 'در حال بازیابی...' : 'نمایش مجدد کارت QR صبحانه'}
                  </button>
                </form>
              </div>
            )}

            <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
              <p className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <span>
                  سهمیه هر دانشجو در کل روزهای ثبت‌نام فقط <strong>یک نوبت</strong> صبحانه است.
                </span>
              </p>
              <button
                type="button"
                onClick={() => setShowLegacyMode((v) => !v)}
                className="text-gold hover:underline font-semibold cursor-pointer"
              >
                {showLegacyMode ? 'بستن استعلام با نام و تاریخ تولد' : 'ثبت‌نام قبلی بدون شماره دانشجویی؟'}
              </button>
            </div>
          </div>

          {/* فرم جایگزین استعلام قدیمی (فقط در صورت باز کردن توسط کاربر) */}
          {showLegacyMode && (
            <form
              onSubmit={handleLegacyLookup}
              className="rounded-3xl border border-line bg-surface p-6 space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-ink">استعلام با نام و تاریخ تولد (لیست‌های قبلی)</h3>
                <p className="text-xs text-ink-muted mt-1">
                  مخصوص افرادی که پیش‌تر از طریق لیست اکسل بدون شماره دانشجویی در سامانه ثبت شده‌اند.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={legacyFirst}
                  onChange={(e) => setLegacyFirst(e.target.value)}
                  placeholder="نام"
                  className="min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                />
                <input
                  type="text"
                  required
                  value={legacyLast}
                  onChange={(e) => setLegacyLast(e.target.value)}
                  placeholder="نام‌خانوادگی"
                  className="min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                />
              </div>
              <JalaliDatePicker value={legacyBirth} onChange={setLegacyBirth} idPrefix="legacy-birth" />
              {settings.couponWalkinEnabled && (
                <div className="rounded-xl border border-gold/35 bg-gold-soft/30 p-3 space-y-1.5">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-gold" />
                    <span>کد روزانه میز استقبال</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={legacyDailyCode}
                    onChange={(e) => setLegacyDailyCode(e.target.value)}
                    placeholder="کد امروز میز استقبال"
                    className="w-full min-h-[40px] rounded-lg border border-line bg-canvas px-3 text-sm font-mono text-center text-ink"
                  />
                </div>
              )}
              {legacyError && <p className="text-xs text-red-500">{legacyError}</p>}
              <button
                type="submit"
                disabled={legacyLoading}
                className="w-full min-h-[42px] rounded-xl border border-gold/50 bg-gold-soft text-ink hover:bg-gold hover:text-[#071714] font-bold text-xs cursor-pointer transition-colors"
              >
                {legacyLoading ? 'در حال استعلام...' : 'نمایش کارت با نام و تاریخ تولد'}
              </button>
            </form>
          )}
        </div>

        {/* ستون نمایش کارت VIP بلیت دیجیتال ژتون صبحانه */}
        <div className="lg:col-span-6">
          {coupon ? (
            <div
              data-testid="digital-coupon-card"
              className="ticket-surface gold-top-accent relative overflow-hidden rounded-3xl border border-gold/45 text-[#f4f1e8] p-6 sm:p-7 space-y-5"
            >
              <GeometricLatticeBg opacity={0.07} />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2 space-x-reverse">
                    <LogoEmblem type="basij" src={settings.basijLogoUrl} size="sm" />
                    <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="sm" />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#deb154] font-bold tracking-wide">
                      بلیت دیجیتال صبحانه نوورودی‌ها · {settings.universityName}
                    </p>
                    <h3 className="text-xl font-extrabold mt-0.5">
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
                  className="p-2 rounded-xl border border-white/15 bg-white/5 text-white/75 hover:text-white hover:border-gold/50 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {(coupon.studentNumber || coupon.major || coupon.cohortGroup) && (
                <div className="relative z-10 flex flex-wrap items-center gap-2 text-xs">
                  {coupon.studentNumber && (
                    <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 font-bold tabular-nums text-[#deb154]">
                      شماره دانشجویی: {toPersianDigits(coupon.studentNumber)}
                    </span>
                  )}
                  {coupon.cohortGroup && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 font-bold">
                      {coupon.cohortGroup}
                    </span>
                  )}
                  {coupon.major && (
                    <span className="px-3 py-1 rounded-xl bg-white/8 border border-white/10 text-white/90">
                      {coupon.major}
                    </span>
                  )}
                </div>
              )}

              <div className="ticket-divider relative z-10 my-1" aria-hidden="true" />

              <div className="relative z-10 flex flex-col items-center justify-center rounded-2xl bg-white p-5 shadow-inner">
                <div className="relative p-2">
                  <span className="pointer-events-none absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#b88224] rounded-tr-md" />
                  <span className="pointer-events-none absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#b88224] rounded-tl-md" />
                  <span className="pointer-events-none absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#b88224] rounded-br-md" />
                  <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#b88224] rounded-bl-md" />
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`کد QR ژتون صبحانه ${coupon.firstName} ${coupon.lastName}`}
                      className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center text-slate-600 text-xs">
                      در حال ساخت کد QR...
                    </div>
                  )}
                </div>
                <span className="mt-2 font-mono text-xs font-bold tracking-wider text-slate-700 select-all">
                  {coupon.couponCode}
                </span>
              </div>

              {(coupon.hasClaimedAny || coupon.claimedMealIds.length > 0) && (
                <div className="relative z-10 rounded-xl border border-amber-400/45 bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-200 leading-relaxed">
                  <strong>سهمیه صبحانه شما دریافت شده است</strong>
                  {coupon.claimedMealName ? ` (${coupon.claimedMealName}` : ''}
                  {coupon.claimedDateJalali
                    ? ` · ${coupon.claimedDateJalali})`
                    : coupon.claimedMealName
                    ? ')'
                    : ''}{' '}
                  — سهمیه هر دانشجو در کل روزهای ثبت‌نام فقط یک نوبت است.
                </div>
              )}

              {coupon.activeMeals.length > 0 && (
                <div className="relative z-10 space-y-2">
                  <p className="text-xs text-[#deb154] font-bold">
                    زمان‌بندی وعده‌های صبحانه (قابل استفاده در روز ثبت‌نام):
                  </p>
                  <div className="space-y-1.5">
                    {coupon.activeMeals.map((m) => {
                      const usedThisMeal = coupon.claimedMealIds.includes(m.id);
                      const usedAnyDay = Boolean(
                        coupon.hasClaimedAny || coupon.claimedMealIds.length > 0
                      );
                      return (
                        <div
                          key={m.id}
                          className="rounded-xl border border-white/10 bg-white/6 px-3.5 py-2.5 flex items-center justify-between text-xs"
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
                              : 'آماده استفاده'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="no-print relative z-10 flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="btn-sheen flex-1 min-h-[44px] px-4 rounded-xl bg-[#deb154] text-[#071714] hover:bg-[#f0c76f] font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ذخیره تصویر کارت</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[44px] px-4 rounded-xl border border-white/25 hover:border-gold/60 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden min-h-[380px] rounded-3xl border border-dashed border-gold/40 bg-surface p-8 flex flex-col items-center justify-center text-center space-y-4">
              <GeometricLatticeBg opacity={0.045} />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gold-soft border border-gold/30 text-gold flex items-center justify-center shadow-sm">
                <Coffee className="w-8 h-8" />
              </div>
              <h3 className="relative z-10 text-lg sm:text-xl font-extrabold text-ink">
                کارت ژتون دیجیتال صبحانه اینجا ظاهر می‌شود
              </h3>
              <p className="relative z-10 text-sm text-ink-muted max-w-md leading-relaxed">
                شماره دانشجویی تاییدشده خود را در کادر مقابل وارد کن؛ به‌محض سبز شدن، مشخصاتت را ثبت کن تا کارت QR اختصاصی‌ات ساخته شود و حتی بدون اینترنت روی گوشی همراهت بماند.
              </p>
              <div className="relative z-10 pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-canvas">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span>ذخیره خودکار آفلاین</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-canvas">
                  <QrCode className="w-3.5 h-3.5 text-gold" />
                  <span>اسکن آنی در ایستگاه پذیرایی</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* نوار مستند تصاویر واقعی استقبال و صبحانه گرم نوورودی‌ها */}
      <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-gold">
              میزبان صبحانه گرم شما: {HEYAT_OFFICIAL_INFO.officialName}
            </p>
            <h2 className="text-base sm:text-lg font-extrabold text-ink mt-0.5">
              گزارش تصویری ایستگاه صبحانه و میز استقبال نوورودی‌ها
            </h2>
          </div>
          <Link
            to="/heyat"
            className="text-xs font-bold text-gold hover:underline inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>آشنایی با هیئت محبان‌الحسین (ع) و برنامه‌ها</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div
          data-testid="freshmen-welcome-strip"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {freshmenWelcomePhotos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setWelcomeLightboxIdx(idx)}
              aria-label={`مشاهده بزرگ تصویر ${photo.title}`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-line bg-[#071714] text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <img
                src={photo.thumbSrc}
                srcSet={`${photo.thumbSrc} 640w, ${photo.src} 1280w`}
                sizes="(max-width: 640px) 50vw, 25vw"
                alt={photo.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <span className="pointer-events-none absolute inset-x-2.5 bottom-2 text-[11px] font-semibold text-white line-clamp-1">
                {photo.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      <PhotoLightbox
        photos={freshmenWelcomePhotos}
        activeIndex={welcomeLightboxIdx}
        onChangeIndex={setWelcomeLightboxIdx}
        onClose={() => setWelcomeLightboxIdx(null)}
      />
    </div>
  );
};
