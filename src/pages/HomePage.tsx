import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Coffee,
  Compass,
  Expand,
  Feather,
  FileCheck2,
  Flag,
  KeyRound,
  QrCode,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { AuroraHeroCanvas } from '../components/AuroraHeroCanvas';
import { GeometricLatticeBg } from '../components/GeometricLatticeBg';
import { LogoEmblem } from '../components/LogoEmblem';
import { TiltCard } from '../components/TiltCard';
import { FreshmanPassportSection } from '../components/FreshmanPassportSection';
import { MobileCollapsibleSection } from '../components/MobileCollapsibleSection';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { REGISTRATION_CHECKLIST, REGISTRATION_ONSITE_STEPS } from '../data/orientation';
import { BASIJ_AXIS_META } from '../data/basijVisuals';
import { CAMPUS_GALLERY_PHOTOS, getFeaturedCampusPhotos } from '../data/campusGallery';
import {
  findRegistrationDayForMajor,
  loadSavedFreshmanProfile,
  type FreshmanProfile,
} from '../utils/freshmanPassport';
import { formatJalaliVerbose, getCountdownParts } from '../utils/jalali';
import { toPersianDigits } from '../utils/persian';
import type { AnnouncementItem } from '../types/portal';

// شش محور رنگی شاخص هیئت دانشجویی محبان‌الحسین (ع) متناظر با کارت بسیج
const HEYAT_HIGHLIGHT_PILLARS = [
  { key: 'weekly', label: 'مراسم هفتگی', accent: '#deb154' },
  { key: 'fatemiyeh', label: 'پنج شب فاطمیه', accent: '#f43f5e' },
  { key: 'breakfast', label: 'صبحانه نوورودی', accent: '#10b981' },
  { key: 'theater', label: 'نمایشگاه و تئاتر', accent: '#a855f7' },
  { key: 'audio', label: 'صوت و مداحی', accent: '#38bdf8' },
  { key: 'teams', label: '۱۰ تیم خادمی', accent: '#f59e0b' },
];

// مسیر ۴ ایستگاه طلایی روز ثبت‌نام
const DAY_ONE_MILESTONES = [
  {
    step: 'گام ۰',
    title: 'میز استقبال بسیج (لابی)',
    desc: 'دریافت نقشه مسیر، مشاوره سریع و راهنمایی حضوری از نخستین قدم ورود',
    to: '/guide#steps',
    icon: Flag,
  },
  {
    step: 'ایستگاه صبحانه',
    title: 'صبحانه مهمان هیئت محبان‌الحسین (ع)',
    desc: 'ارائه کارت QR دیجیتال یک‌نوبته در روز ثبت‌نام و تجدید انرژی پیش از مراحل',
    to: '/coupon',
    icon: Coffee,
  },
  {
    step: 'گام ۱ تا ۱۰',
    title: 'پذیرش، مدارک و تشکیل پرونده',
    desc: 'تحویل اصل مدارک، احراز هویت آموزشی و امضاهای لازم در سالن مرکزی',
    to: '/guide#map',
    icon: FileCheck2,
  },
  {
    step: 'گام ۱۱ و ۱۲',
    title: 'کارت دانشجویی و اسکان خوابگاه',
    desc: 'دریافت کارت تغذیه/دانشجویی و مراجعه به خوابگاه برادران یا خواهران',
    to: '/dorms',
    icon: KeyRound,
  },
];

// شمارنده انیمیشنی برای اعداد واقعی سامانه (در حالت کم‌حجم یا reduced-motion فوری نمایش داده می‌شود)
const AnimatedCount: React.FC<{ target: number; liteMode: boolean }> = ({ target, liteMode }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 'some' });
  const [val, setVal] = useState(target);
  const animatedOnce = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (liteMode || reduced || animatedOnce.current) {
      setVal(target);
      return;
    }
    if (!inView) return;
    animatedOnce.current = true;
    let raf = 0;
    const startVal = target > 5 ? Math.max(1, Math.floor(target * 0.4)) : 1;
    const duration = 560;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(startVal + eased * (target - startVal)));
      if (progress < 1) {
        raf = window.requestAnimationFrame(step);
      }
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [inView, target, liteMode]);

  return (
    <span ref={ref} className="tabular-nums">
      {toPersianDigits(val)}
    </span>
  );
};

const VERIFIED_HIGHLIGHTS = [
  {
    count: REGISTRATION_ONSITE_STEPS.length,
    title: 'ایستگاه راهنمای ثبت‌نام',
    sub: 'از گام صفر بسیج تا تکمیل پرونده',
    to: '/guide',
  },
  {
    count: 25,
    title: 'کانون تخصصی بسیج',
    sub: 'در ۶ محور علمی، فرهنگی و مهارتی',
    to: '/basij',
  },
  {
    count: 2,
    title: 'مجتمع خوابگاهی رسمی',
    sub: 'اطلاعات کامل خوابگاه خواهران و برادران',
    to: '/dorms',
  },
  {
    count: 3,
    title: 'روز پذیرش حضوری ۱۴۰۵',
    sub: 'یکشنبه ۱ تا سه‌شنبه ۳ آذر (۸ تا ۱۴)',
    to: '/guide#timeline',
  },
];

export const HomePage: React.FC = () => {
  const {
    settings,
    completedSteps,
    checklistProgress,
    showToast,
    liteMode,
    mobileFocusMode,
    setMobileFocusMode,
    openQuickSearch,
  } = usePortal();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [profile, setProfile] = useState<FreshmanProfile | null>(() =>
    loadSavedFreshmanProfile()
  );

  const personalRegDay = useMemo(
    () => (profile?.major ? findRegistrationDayForMajor(profile.major) : null),
    [profile]
  );

  const activeCountdownIso = personalRegDay?.dateIso || settings.targetEventDateIso;

  const [countdown, setCountdown] = useState(() => getCountdownParts(activeCountdownIso));
  const [regScore, setRegScore] = useState(5);
  const [foodScore, setFoodScore] = useState(5);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySent, setSurveySent] = useState(false);
  const [galleryLightboxIdx, setGalleryLightboxIdx] = useState<number | null>(null);
  const [passportForceOpen, setPassportForceOpen] = useState(false);
  const featuredPhotos = useMemo(() => getFeaturedCampusPhotos(), []);

  useEffect(() => {
    api
      .getAnnouncements()
      .then((list) => setAnnouncements(list.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingAnn(false));
  }, []);

  useEffect(() => {
    setCountdown(getCountdownParts(activeCountdownIso));
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(activeCountdownIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeCountdownIso]);

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.submitSurvey({
        registrationScore: regScore,
        breakfastScore: foodScore,
        comment: surveyComment,
      });
      setSurveySent(true);
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ثبت نظر', 'error');
    }
  };

  const encouragement =
    checklistProgress === 100
      ? 'آفرین! همه مراحل اصلی چک‌لیست ثبت‌نام را کامل کردی.'
      : checklistProgress >= 50
      ? 'بخش زیادی از مسیر را رفتی؛ چند گام کوتاه تا پایان ثبت‌نام باقی مانده.'
      : 'قدم‌به‌قدم تیک بزن تا در روزهای ثبت‌نام هیچ مدرک یا مرحله‌ای جا نماند.';

  return (
    <div>
      {/* بخش Hero سینمایی با معماری گناباد در گرگ‌ومیش، شفق تعاملی و گره‌چینی */}
      <section className="relative overflow-hidden border-b border-line">
        {/* تصویر معماری اختصاصی محلی (WebP 107KB) با پوشش خوانایی دوگانه تاریک/روشن */}
        <picture aria-hidden="true" className="pointer-events-none absolute inset-0">
          <source srcSet="/assets/hero-gonabad-arch.webp" type="image/webp" />
          <img
            src="/assets/hero-gonabad-arch.jpg"
            alt=""
            fetchPriority="high"
            className="w-full h-full object-cover object-left sm:object-center opacity-80 dark:opacity-70 scale-[1.01]"
          />
        </picture>
        <div aria-hidden="true" className="hero-arch-veil pointer-events-none absolute inset-0" />
        <AuroraHeroCanvas />
        <GeometricLatticeBg opacity={0.055} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 lg:py-22">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-stretch">
            {/* ستون اصلی معرفی */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <motion.div
                initial={liteMode ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38 }}
                className="flex items-center gap-3.5 mb-6"
              >
                <div className="flex items-center gap-2">
                  <LogoEmblem type="basij" src={settings.basijLogoUrl} size="md" />
                  <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="md" />
                </div>
                <div className="h-8 w-px bg-gold/35 hidden sm:block" aria-hidden="true" />
                <div className="text-xs sm:text-sm text-ink-muted">
                  <p className="font-bold text-ink">{settings.universityName}</p>
                  <p className="tabular-nums">{formatJalaliVerbose(new Date())}</p>
                </div>
              </motion.div>

              {profile && (
                <motion.p
                  initial={liteMode ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2.5 text-sm font-bold text-gold inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {profile.fullName
                      ? `خوش آمدی ${profile.fullName} عزیز · رشته ${profile.major}`
                      : `خوش آمدی نوورودی عزیز رشته ${profile.major}`}
                  </span>
                </motion.p>
              )}

              <motion.h1
                initial={liteMode ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.05 }}
                className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold text-ink leading-[1.3]"
              >
                همه‌چیز برای روزهای اول دانشگاه،{' '}
                <span className="text-gold-shimmer">شفاف و در یک‌جا</span>
              </motion.h1>

              <motion.p
                initial={liteMode ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.12 }}
                className="mt-5 text-base text-ink-muted max-w-2xl leading-relaxed"
              >
                از چک‌لیست مرحله‌به‌مرحله ثبت‌نام و اطلاعات خوابگاه‌ها تا معرفی کانون‌های بسیج دانشجویی، برنامه‌های هیئت و دریافت کارت دیجیتال ژتون صبحانه — همراه صمیمی شما و خانواده‌های گرامی از نخستین روز ورود به گناباد.
              </motion.p>

              <motion.div
                initial={liteMode ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.18 }}
                className="mt-8 flex flex-wrap items-center gap-3.5"
              >
                <Link
                  to="/guide"
                  className="btn-sheen group min-h-[50px] px-7 py-3 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-extrabold text-sm inline-flex items-center gap-2.5"
                >
                  <span>شروع راهنمای ثبت‌نام</span>
                  <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                </Link>
                <Link
                  to="/coupon"
                  className="group min-h-[50px] px-6 py-3 rounded-xl border border-gold/40 bg-surface/85 hover:border-gold hover:bg-gold-soft/50 text-ink font-bold text-sm inline-flex items-center gap-2.5 transition-all backdrop-blur-md"
                >
                  <QrCode className="w-4 h-4 text-gold transition-transform duration-200 group-hover:scale-110" />
                  <span>دریافت ژتون صبحانه</span>
                </Link>
                <a
                  href="#passport-wrapper"
                  onClick={() => setPassportForceOpen(true)}
                  className="min-h-[50px] px-4 py-3 text-gold-strong dark:text-gold hover:underline font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ساخت کارت یادگاری ۱۴۰۵</span>
                </a>
              </motion.div>
            </div>

            {/* ستون شمارنده معکوس و پیشرفت */}
            <motion.div
              initial={liteMode ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, delay: 0.14 }}
              className="lg:col-span-5 flex flex-col gap-4 justify-center"
            >
              <div className="rounded-3xl glass-panel gold-top-accent p-6 sm:p-7">
                <div className="flex items-center justify-between gap-2 text-xs text-ink-muted mb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-gold font-bold">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {personalRegDay
                        ? 'شمارش معکوس روز ثبت‌نام رشته تو'
                        : 'شمارش معکوس رویداد پیش‌رو'}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {personalRegDay ? personalRegDay.dateJalali : settings.targetEventDateJalali}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-ink leading-snug">
                  {personalRegDay
                    ? `ثبت‌نام حضوری ${profile?.major} (${personalRegDay.dayTitle})`
                    : settings.targetEventTitle}
                </h2>

                <div className="mt-5 grid grid-cols-4 gap-2.5 text-center">
                  {[
                    { val: countdown.days, label: 'روز' },
                    { val: countdown.hours, label: 'ساعت' },
                    { val: countdown.minutes, label: 'دقیقه' },
                    { val: countdown.seconds, label: 'ثانیه' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-gold/25 bg-surface/90 py-3.5 px-2 shadow-[inset_0_1px_0_rgba(244,241,232,0.1)]"
                    >
                      <div className="text-2xl sm:text-3xl font-extrabold text-gold tabular-nums tracking-tight">
                        {toPersianDigits(String(item.val).padStart(2, '0'))}
                      </div>
                      <div className="text-[11px] font-medium text-ink-muted mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* کارت پیشرفت شخصی نوورود */}
              <div className="rounded-2xl glass-panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">پیشرفت چک‌لیست ثبت‌نام تو</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{encouragement}</p>
                  </div>
                  <span className="text-xl font-extrabold text-gold tabular-nums shrink-0">
                    {toPersianDigits(checklistProgress)}٪
                  </span>
                </div>
                <div className="mt-3.5 h-2.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-gold-strong via-gold to-emerald-mid transition-all duration-500"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                  <span className="tabular-nums">
                    {toPersianDigits(completedSteps.length)} از{' '}
                    {toPersianDigits(REGISTRATION_CHECKLIST.length)} مرحله انجام شده
                  </span>
                  <Link
                    to="/guide"
                    className="text-gold hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>ادامه چک‌لیست</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* دستیار جستجوی فوری سراسری + کنترل نمای خلوت/کامل ویژه موبایل (بدون حذف هیچ محتوایی) */}
      <section aria-label="جستجوی سریع و تنظیم نمای موبایل" className="border-b border-line bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col lg:flex-row lg:items-center gap-3">
          <button
            type="button"
            data-testid="home-quick-finder-trigger"
            onClick={openQuickSearch}
            className="flex-1 min-h-[50px] rounded-2xl border border-gold/40 bg-canvas hover:border-gold px-4 py-2.5 flex items-center justify-between gap-3 text-right transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-gold shrink-0" />
              <span className="text-xs sm:text-sm text-ink-muted group-hover:text-ink truncate">
                الان دنبال چی هستی؟ نام رشته، خوابگاه، ژتون صبحانه یا مرحله ثبت‌نام را بنویس...
              </span>
            </span>
            <span className="text-[11px] font-bold text-gold whitespace-nowrap shrink-0">
              جستجوی فوری
            </span>
          </button>

          {/* سوئیچ دوحالته نمای موبایل: خلوت و مرحله‌ای (پیش‌فرض) یا نمایش کامل همه بخش‌ها */}
          <div
            data-testid="mobile-focus-toggle"
            className="lg:hidden flex items-center justify-between gap-2 rounded-2xl border border-line bg-canvas p-1.5"
          >
            <button
              type="button"
              onClick={() => setMobileFocusMode(true)}
              aria-pressed={mobileFocusMode}
              className={`flex-1 min-h-[38px] px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                mobileFocusMode
                  ? 'bg-gold text-[#071714]'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              نمای خلوت موبایل
            </button>
            <button
              type="button"
              onClick={() => setMobileFocusMode(false)}
              aria-pressed={!mobileFocusMode}
              className={`flex-1 min-h-[38px] px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                !mobileFocusMode
                  ? 'bg-gold text-[#071714]'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              نمایش کامل همه بخش‌ها
            </button>
          </div>
        </div>
      </section>

      {/* دسترسی سریع به ۶ بخش اصلی — بلافاصله در دسترس نوورود روی موبایل و دسکتاپ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-xs font-bold text-gold mb-1">نقشه راه نوورودی‌ها</p>
            <h2 className="text-xl sm:text-3xl font-extrabold text-ink">
              هر آنچه در هفته اول نیاز داری
            </h2>
          </div>
          <Link
            to="/guide#map"
            className="group text-xs sm:text-sm text-gold hover:underline font-bold inline-flex items-center gap-1.5"
          >
            <span>مشاهده نقشه تعاملی دانشگاه</span>
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* چیدمان نامتقارن Bento Grid: ۰۱ راهنما · ۰۲ بسیج · ۰۳ هیئت · ۰۴ ژتون · ۰۵ خوابگاه · ۰۶ اطلاعیه‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* کارت ۰۱: نقشه راه روز اول (راهنمای ثبت‌نام، نقشه و FAQ) */}
          <motion.div
            initial={liteMode ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{ duration: 0.45 }}
            className="md:col-span-6 lg:col-span-5"
          >
            <TiltCard>
              <Link
                to="/guide"
                data-testid="bento-card-guide"
                className="gold-top-accent relative block h-full rounded-3xl border border-gold/30 bg-surface hover:border-gold/70 p-6 sm:p-7 overflow-hidden transition-colors group shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-col justify-between h-full gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-gold">۰۱ · نقشه راه روز اول</span>
                      <div className="w-9 h-9 rounded-xl bg-gold-soft text-gold flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-gold transition-colors">
                      راهنمای ثبت‌نام، نقشه و FAQ
                    </h3>
                    <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
                      چک‌لیست مرحله‌به‌مرحله، مدارک لازم، نقشه معماری ساختمان‌های دانشگاه، ویدیوی آموزشی همگام با گام‌ها و جستجوی هوشمند سوالات متداول.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-line flex items-center justify-between text-xs">
                    <span className="text-ink-muted tabular-nums">
                      پیشرفت تو:{' '}
                      <strong className="text-gold">{toPersianDigits(checklistProgress)}٪</strong>
                    </span>
                    <span className="text-gold font-bold inline-flex items-center gap-1">
                      <span>باز کردن راهنما</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </motion.div>

          {/* کارت ۰۲: بسیج دانشجویی و چارت گرافیکی ۲۵ کانون */}
          <motion.div
            initial={liteMode ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="md:col-span-6 lg:col-span-7"
          >
            <TiltCard>
              <Link
                to="/basij"
                data-testid="bento-card-basij"
                className="gold-top-accent relative block h-full rounded-3xl border border-gold/35 bg-surface hover:border-gold/75 p-6 sm:p-7 overflow-hidden transition-colors group shadow-[var(--shadow-card)]"
              >
                <GeometricLatticeBg opacity={0.065} />
                <div className="relative z-10 flex flex-col justify-between h-full gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-gold">
                        ۰۲ · چارت تعاملی قرار قیام ۹
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-gold-soft text-gold flex items-center justify-center">
                        <Compass className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-gold transition-colors">
                      بسیج دانشجویی و چارت گرافیکی ۲۵ کانون
                    </h3>
                    <p className="mt-2.5 text-sm text-ink-muted leading-relaxed max-w-xl">
                      به‌جای دفترچه‌های طولانی، همه ۲۵ کانون تخصصی را روی چارت تعاملی ببین، بر اساس رشته تحصیلی‌ات پیشنهاد بگیر و پوستر استوری آزمون علاقه‌مندی بساز.
                    </p>
                  </div>

                  {/* نوار ۶ محور رنگی بسیج */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-line text-xs">
                    {BASIJ_AXIS_META.map((ax) => (
                      <span
                        key={ax.key}
                        className="inline-flex items-center gap-1.5 font-semibold text-ink-muted"
                      >
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: ax.accent }}
                        />
                        <span>{ax.shortLabel}</span>
                      </span>
                    ))}
                    <span className="mr-auto text-gold font-bold inline-flex items-center gap-1">
                      <span>ورود به چارت</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </motion.div>

          {/* کارت ۰۳: هیئت دانشجویی محبان‌الحسین (ع) — طراحی ویژه هم‌تراز با کارت بسیج */}
          <motion.div
            initial={liteMode ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="md:col-span-6 lg:col-span-7"
          >
            <TiltCard>
              <Link
                to="/heyat"
                data-testid="bento-card-heyat"
                className="gold-top-accent relative block h-full rounded-3xl border border-gold/35 bg-surface hover:border-gold/75 p-6 sm:p-7 overflow-hidden transition-colors group shadow-[var(--shadow-card)]"
              >
                <GeometricLatticeBg opacity={0.07} />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl"
                />
                <div className="relative z-10 flex flex-col justify-between h-full gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-gold">
                        ۰۳ · محفل دانشجویی از سال ۱۴۰۱
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-gold flex items-center justify-center">
                        <Feather className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-gold transition-colors">
                      هیئت دانشجویی محبان‌الحسین (ع)
                    </h3>
                    <p className="mt-2.5 text-sm text-ink-muted leading-relaxed max-w-xl">
                      فضایی معنوی و صمیمی با مراسم‌های هفتگی، پنج شب فاطمیه، استقبال از شهید گمنام، نمایشگاه و تئاتر، پذیرایی صبحانه نوورودی‌ها و ۱۰ تیم خادمی برای همراهی دانشجویان جدید.
                    </p>
                  </div>

                  {/* نوار ۶ محور رنگی هیئت */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-line text-xs">
                    {HEYAT_HIGHLIGHT_PILLARS.map((pillar) => (
                      <span
                        key={pillar.key}
                        className="inline-flex items-center gap-1.5 font-semibold text-ink-muted"
                      >
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: pillar.accent }}
                        />
                        <span>{pillar.label}</span>
                      </span>
                    ))}
                    <span className="mr-auto text-gold font-bold inline-flex items-center gap-1">
                      <span>ورود به هیئت</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </motion.div>

          {/* کارت ۰۴: دریافت ژتون صبحانه */}
          <motion.div
            initial={liteMode ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="md:col-span-6 lg:col-span-5"
          >
            <TiltCard>
              <Link
                to="/coupon"
                data-testid="bento-card-coupon"
                className="relative block h-full rounded-3xl border border-emerald-500/35 bg-surface hover:border-gold/70 p-6 sm:p-7 overflow-hidden transition-colors group shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-col justify-between h-full gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-gold">۰۴ · پذیرایی روز ثبت‌نام</span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-gold transition-colors">
                      دریافت ژتون صبحانه
                    </h3>
                    <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
                      پس از تایید شماره دانشجویی در میز استقبال لابی، فرم کوتاه را کامل کن و کارت QR یک‌نوبته صبحانه مهمان هیئت محبان‌الحسین (ع) را آنی دریافت کن.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-line flex items-center justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      صدور آنی کارت QR دیجیتال
                    </span>
                    <span className="text-gold font-bold inline-flex items-center gap-1">
                      <span>دریافت ژتون</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </motion.div>

          {/* کارت ۰۵: خوابگاه‌ها و مقایسه */}
          <motion.div
            initial={liteMode ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="md:col-span-3 lg:col-span-6"
          >
            <TiltCard>
              <Link
                to="/dorms"
                data-testid="bento-card-dorms"
                className="flex flex-col justify-between h-full rounded-3xl border border-line bg-surface hover:border-gold/55 p-5 sm:p-6 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-soft text-gold flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-ink-muted tabular-nums">۰۵</span>
                  </div>
                  <h3 className="text-lg font-bold text-ink group-hover:text-gold transition-colors">
                    خوابگاه‌ها و مقایسه
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                    امکانات، قوانین، گالری تصاویر واقعی سراهای دانشجویی، مسیر دسترسی روی نشان و بلد، جدول مقایسه و چک‌لیست وسایل موردنیاز.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line/70 flex items-center justify-end text-xs font-bold text-gold opacity-85 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1">
                    <span>مشاهده خوابگاه‌ها</span>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </TiltCard>
          </motion.div>

          {/* کارت ۰۶: اطلاعیه‌ها و تقویم */}
          <motion.div
            initial={liteMode ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="md:col-span-3 lg:col-span-6"
          >
            <TiltCard>
              <Link
                to="/announcements"
                data-testid="bento-card-announcements"
                className="flex flex-col justify-between h-full rounded-3xl border border-line bg-surface hover:border-gold/55 p-5 sm:p-6 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-soft text-gold flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                      <Bell className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-ink-muted tabular-nums">۰۶</span>
                  </div>
                  <h3 className="text-lg font-bold text-ink group-hover:text-gold transition-colors">
                    اطلاعیه‌ها و تقویم
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                    آخرین اخبار روزهای ثبت‌نام، برنامه‌های استقبال و رویدادهای هفته اول با امکان افزودن مستقیم به تقویم گوشی (.ics).
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line/70 flex items-center justify-end text-xs font-bold text-gold opacity-85 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1">
                    <span>مشاهده اطلاعیه‌ها</span>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* بخش‌های تکمیلی و غنی — در نمای خلوت موبایل به‌صورت کشویی مرتب و بدون حذف هیچ محتوایی */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 pt-2 pb-1 flex items-center justify-between text-xs text-ink-muted">
        <span className="font-bold text-ink">ابزارهای تکمیلی و گالری دانشگاه</span>
        <span>{mobileFocusMode ? 'برای مشاهده هر بخش لمس کن' : 'نمایش کامل فعال است'}</span>
      </div>

      {/* ۱. گذرنامه یادگاری ورودی ۱۴۰۵ + تشخیص آنی روز ثبت‌نام */}
      <MobileCollapsibleSection
        id="passport-wrapper"
        testId="mobile-collapse-passport"
        title="گذرنامه یادگاری ۱۴۰۵ و روز ثبت‌نام"
        subtitle="رشته‌ات را انتخاب کن تا روز ثبت‌نامت مشخص شود و استوری یادگاری بسازی"
        meta="۲۰ رشته"
        icon={Sparkles}
        collapsedOnMobile={mobileFocusMode}
        forceOpen={passportForceOpen}
      >
        <FreshmanPassportSection profile={profile} onProfileChange={setProfile} />
      </MobileCollapsibleSection>

      {/* ۲. مسیر ۴ ایستگاه روز ثبت‌نام + خلاصه آماری پرتال */}
      <MobileCollapsibleSection
        testId="mobile-collapse-journey"
        title="مسیر روز ثبت‌نام (۴ ایستگاه طلایی)"
        subtitle="از میز استقبال بسیج و صبحانه تا تحویل مدارک و خوابگاه + آمار پرتال"
        meta="۱۳ ایستگاه"
        icon={Flag}
        collapsedOnMobile={mobileFocusMode}
      >
        {/* نوار آمار واقعی و تاییدشده پرتال */}
        <section aria-label="خلاصه بخش‌های پرتال" className="border-y border-line bg-surface/75">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {VERIFIED_HIGHLIGHTS.map((stat, idx) => (
                <motion.div
                  key={stat.title}
                  initial={liteMode ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 'some' }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                >
                  <Link
                    to={stat.to}
                    className="group block rounded-2xl border border-line bg-surface hover:border-gold/45 p-4 sm:p-5 transition-all"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-gold">
                        <AnimatedCount target={stat.count} liteMode={liteMode} />
                      </span>
                      <ArrowLeft className="w-4 h-4 text-ink-muted group-hover:text-gold group-hover:-translate-x-1 transition-all" />
                    </div>
                    <p className="mt-2 text-xs sm:text-sm font-bold text-ink group-hover:text-gold transition-colors">
                      {stat.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] sm:text-xs text-ink-muted leading-relaxed">
                      {stat.sub}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* نوار اسکرول روایی مسیر روز ثبت‌نام در ۴ ایستگاه کلیدی (اسلایدر افقی روی موبایل) */}
        <section
          aria-labelledby="journey-heading"
          className="border-b border-line bg-surface/55 py-8 sm:py-14"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <p className="text-xs font-bold text-gold mb-1">تصویر کلی روز ثبت‌نام</p>
                <h2 id="journey-heading" className="text-xl sm:text-3xl font-extrabold text-ink">
                  از لحظه ورود به درِ دانشگاه تا پایان روز اول
                </h2>
              </div>
              <Link
                to="/guide#steps"
                className="group text-xs sm:text-sm text-gold hover:underline font-bold inline-flex items-center gap-1.5"
              >
                <span>مشاهده کامل ۱۳ ایستگاه با ویدیوی راهنما</span>
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="hidden lg:block absolute top-11 right-12 left-12 h-[2px] bg-gradient-to-l from-gold/55 via-emerald-mid/55 to-gold/30"
              />
              <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 pb-2 sm:pb-0">
                {DAY_ONE_MILESTONES.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.step}
                      initial={liteMode ? false : { opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 'some' }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      className="w-[78vw] max-w-[290px] sm:w-auto sm:max-w-none shrink-0 snap-start"
                    >
                      <Link
                        to={item.to}
                        className="group relative flex flex-col justify-between h-full rounded-2xl border border-line bg-surface hover:border-gold/60 p-5 transition-all hover:-translate-y-1 shadow-[var(--shadow-card)]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-deep text-[#deb154] border border-gold/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-extrabold text-gold">{item.step}</span>
                          </div>
                          <h3 className="text-base font-extrabold text-ink group-hover:text-gold transition-colors">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <span className="mt-4 pt-3 border-t border-line/70 text-xs font-bold text-gold inline-flex items-center gap-1">
                          <span>مشاهده جزئیات</span>
                          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </MobileCollapsibleSection>

      {/* ۳. گشت‌وگذار تصویری در دانشگاه گناباد (اسلایدر لمسی افقی در موبایل) */}
      <MobileCollapsibleSection
        testId="mobile-collapse-gallery"
        title="گشت‌وگذار تصویری در دانشگاه و خوابگاه‌ها"
        subtitle="تصاویر واقعی پردیس، کتابخانه، مسجد و اتاق‌های سراهای دانشجویی"
        meta={`${toPersianDigits(CAMPUS_GALLERY_PHOTOS.length)} عکس`}
        icon={Camera}
        collapsedOnMobile={mobileFocusMode}
      >
        <section
          aria-labelledby="campus-showcase-heading"
          className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-12"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5 sm:mb-6">
            <div>
              <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5 mb-1">
                <Camera className="w-4 h-4" />
                <span>تصاویر واقعی از محیط دانشگاه و سراهای دانشجویی</span>
              </p>
              <h2
                id="campus-showcase-heading"
                className="text-xl sm:text-3xl font-extrabold text-ink"
              >
                گشت‌وگذار تصویری در دانشگاه گناباد
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/dorms#dorm-gallery"
                className="text-xs sm:text-sm font-bold text-ink-muted hover:text-gold transition-colors"
              >
                تصاویر خوابگاه‌ها
              </Link>
              <span aria-hidden="true" className="text-line">|</span>
              <Link
                to="/gallery"
                className="group text-xs sm:text-sm text-gold-strong dark:text-gold hover:underline font-extrabold inline-flex items-center gap-1.5"
              >
                <span>مشاهده همه {toPersianDigits(CAMPUS_GALLERY_PHOTOS.length)} تصویر</span>
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar sm:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 pb-2 sm:pb-0">
            {featuredPhotos.map((photo, idx) => {
              const isWideTile = idx === 0 || idx === 5;
              const colClass = isWideTile
                ? 'w-[80vw] max-w-[320px] sm:w-auto sm:max-w-none shrink-0 snap-start sm:col-span-2 lg:col-span-6 h-56 sm:h-64 lg:h-72'
                : 'w-[76vw] max-w-[300px] sm:w-auto sm:max-w-none shrink-0 snap-start lg:col-span-3 h-56 sm:h-64 lg:h-72';
              return (
                <motion.button
                  key={photo.id}
                  type="button"
                  initial={liteMode ? false : { opacity: 0, y: 12 }}
                  whileInView={liteMode ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.34, delay: idx * 0.04 }}
                  onClick={() => setGalleryLightboxIdx(idx)}
                  aria-label={`بزرگ‌نمایی ${photo.title}`}
                  className={`group relative rounded-2xl overflow-hidden border border-line bg-emerald-deep/40 text-right cursor-pointer hover:border-gold/55 transition-all shadow-[var(--shadow-card)] ${colClass}`}
                >
                  <img
                    src={photo.thumbSrc}
                    srcSet={`${photo.thumbSrc} 640w, ${photo.src} 1280w`}
                    sizes={
                      isWideTile
                        ? '(max-width: 1024px) 100vw, 50vw'
                        : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                    }
                    alt={photo.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#04110f]/88 via-[#04110f]/20 to-transparent"
                  />
                  <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#051210]/70 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-[#f4f1e8]">
                      {photo.album}
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-[#051210]/65 backdrop-blur-md border border-white/15 text-[#deb154] flex items-center justify-center opacity-80 group-hover:opacity-100">
                      <Expand className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3.5 left-3.5">
                    <h3
                      className={`${
                        isWideTile ? 'text-base sm:text-lg' : 'text-sm'
                      } font-extrabold text-white leading-snug`}
                    >
                      {photo.title}
                    </h3>
                    {isWideTile && (
                      <p className="text-xs text-white/80 mt-1 line-clamp-1 hidden sm:block">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </MobileCollapsibleSection>

      {/* ۴. آخرین اطلاعیه‌ها + نظرسنجی کوتاه */}
      <MobileCollapsibleSection
        testId="mobile-collapse-announcements"
        title="آخرین اطلاعیه‌ها و نظرسنجی ناشناس"
        subtitle="خبرهای مهم ثبت‌نام و ثبت بازخورد درباره صبحانه و راهنمایی"
        meta={announcements.length > 0 ? `${toPersianDigits(announcements.length)} اطلاعیه` : undefined}
        icon={Bell}
        collapsedOnMobile={mobileFocusMode}
      >
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink">آخرین اطلاعیه‌ها</h2>
                <Link
                  to="/announcements"
                  className="group text-sm text-gold hover:underline font-bold inline-flex items-center gap-1"
                >
                  <span>مشاهده همه</span>
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                </Link>
              </div>

              {loadingAnn ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-24 rounded-2xl border border-line bg-surface animate-pulse"
                    />
                  ))}
                </div>
              ) : announcements.length === 0 ? (
                <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-ink-muted">
                  هنوز اطلاعیه‌ای منتشر نشده است.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {announcements.map((ann) => (
                    <article
                      key={ann.id}
                      className="rounded-2xl border border-line bg-surface p-5 hover:border-gold/45 transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mb-2">
                        <span className="text-gold font-bold">{ann.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{ann.dateJalali}</span>
                        {ann.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{ann.location}</span>
                          </>
                        )}
                        {ann.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>نمونه</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-ink">{ann.title}</h3>
                      <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{ann.summary}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* نظرسنجی ناشناس رضایت از ثبت‌نام و صبحانه */}
            <div className="lg:col-span-5 rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-extrabold text-ink">نظرسنجی کوتاه و ناشناس</h2>
              <p className="mt-1 text-sm text-ink-muted">
                تجربه ثبت‌نام و پذیرایی صبحانه چطور بود؟ نظرت به ما کمک می‌کند برای روزهای بعد بهتر عمل کنیم.
              </p>

              {surveySent ? (
                <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3 text-sm text-ink">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>سپاس از ثبت نظر شما! بازخوردتان برای تیم اجرایی ارسال شد.</span>
                </div>
              ) : (
                <form onSubmit={handleSurveySubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-2">
                      میزان رضایت از راهنمایی ثبت‌نام ({toPersianDigits(regScore)} از ۵)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`امتیاز ثبت‌نام ${n}`}
                          onClick={() => setRegScore(n)}
                          className={`min-h-[42px] min-w-[42px] rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                            n <= regScore
                              ? 'border-gold bg-gold-soft text-gold'
                              : 'border-line bg-canvas text-ink-muted hover:border-gold/40'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-2">
                      میزان رضایت از پذیرایی صبحانه ({toPersianDigits(foodScore)} از ۵)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`امتیاز صبحانه ${n}`}
                          onClick={() => setFoodScore(n)}
                          className={`min-h-[42px] min-w-[42px] rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                            n <= foodScore
                              ? 'border-gold bg-gold-soft text-gold'
                              : 'border-line bg-canvas text-ink-muted hover:border-gold/40'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="survey-comment"
                      className="block text-xs font-medium text-ink-muted mb-1.5"
                    >
                      پیشنهاد یا نکته (اختیاری)
                    </label>
                    <textarea
                      id="survey-comment"
                      rows={2}
                      value={surveyComment}
                      onChange={(e) => setSurveyComment(e.target.value)}
                      placeholder="اگر پیشنهادی برای بهبود روند ثبت‌نام یا صبحانه داری بنویس..."
                      className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[46px] rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid font-bold text-sm transition-colors cursor-pointer"
                  >
                    ثبت نظر ناشناس
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </MobileCollapsibleSection>

      <PhotoLightbox
        photos={featuredPhotos}
        activeIndex={galleryLightboxIdx}
        onClose={() => setGalleryLightboxIdx(null)}
        onChangeIndex={setGalleryLightboxIdx}
      />
    </div>
  );
};
