import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Feather,
  QrCode,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { AuroraHeroCanvas } from '../components/AuroraHeroCanvas';
import { GeometricLatticeBg } from '../components/GeometricLatticeBg';
import { LogoEmblem } from '../components/LogoEmblem';
import { TiltCard } from '../components/TiltCard';
import { REGISTRATION_CHECKLIST } from '../data/orientation';
import { BASIJ_AXIS_META } from '../data/basijVisuals';
import { formatJalaliVerbose, getCountdownParts } from '../utils/jalali';
import { toPersianDigits } from '../utils/persian';
import type { AnnouncementItem } from '../types/portal';

const QUICK_ACCESS = [
  {
    to: '/guide',
    title: 'راهنمای ثبت‌نام و FAQ',
    desc: 'چک‌لیست مراحل، مدارک، نقشه دانشگاه و پاسخ به سوالات پرتکرار',
    icon: BookOpen,
  },
  {
    to: '/heyat#coupon',
    title: 'دریافت ژتون صبحانه',
    desc: 'دریافت کارت QR دیجیتال صبحانه ویژه نوورودی‌های ثبت‌شده',
    icon: QrCode,
  },
  {
    to: '/dorms',
    title: 'خوابگاه‌ها و مقایسه',
    desc: 'امکانات، قوانین، مسیر دسترسی، مقایسه و لیست وسایل موردنیاز',
    icon: Building2,
  },
  {
    to: '/basij',
    title: 'بسیج و چارت ۲۵ کانون',
    desc: 'چارت تعاملی ۶ محور، شناسنامه گرافیکی کانون‌ها، تطبیق رشته و آزمون علاقه‌مندی',
    icon: Compass,
  },
  {
    to: '/heyat',
    title: 'هیئت دانشجویی',
    desc: 'تقویم شمسی مراسم‌ها، برنامه‌های معنوی و فرم همراهی',
    icon: Feather,
  },
  {
    to: '/announcements',
    title: 'اطلاعیه‌ها و تقویم',
    desc: 'آخرین اخبار ثبت‌نام با امکان افزودن مستقیم به تقویم گوشی',
    icon: Bell,
  },
];

export const HomePage: React.FC = () => {
  const { settings, completedSteps, checklistProgress, showToast, liteMode } = usePortal();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(settings.targetEventDateIso)
  );
  const [regScore, setRegScore] = useState(5);
  const [foodScore, setFoodScore] = useState(5);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySent, setSurveySent] = useState(false);

  useEffect(() => {
    api
      .getAnnouncements()
      .then((list) => setAnnouncements(list.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingAnn(false));
  }, []);

  useEffect(() => {
    setCountdown(getCountdownParts(settings.targetEventDateIso));
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(settings.targetEventDateIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [settings.targetEventDateIso]);

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
      {/* بخش Hero سینمایی با گره‌چینی مدرن */}
      <section className="relative overflow-hidden border-b border-line">
        <AuroraHeroCanvas />
        <GeometricLatticeBg opacity={0.07} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* ستون اصلی معرفی */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-5">
                <LogoEmblem type="basij" src={settings.basijLogoUrl} size="md" />
                <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="md" />
                <div className="text-xs sm:text-sm text-ink-muted">
                  <p className="font-semibold text-ink">{settings.universityName}</p>
                  <p>{formatJalaliVerbose(new Date())}</p>
                </div>
              </div>

              <motion.h1
                initial={liteMode ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink leading-[1.3]"
              >
                همه‌چیز برای روزهای اول دانشگاه،{' '}
                <span className="text-gold">شفاف و در یک‌جا</span>
              </motion.h1>

              <p className="mt-4 text-base text-ink-muted max-w-2xl leading-relaxed">
                از چک‌لیست مرحله‌به‌مرحله ثبت‌نام و اطلاعات خوابگاه‌ها تا معرفی کانون‌های بسیج دانشجویی، برنامه‌های هیئت و دریافت کارت دیجیتال ژتون صبحانه — همراه صمیمی شما و خانواده‌های گرامی از نخستین روز ورود به گناباد.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/guide"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm inline-flex items-center gap-2 transition-colors shadow-lg"
                >
                  <span>شروع راهنمای ثبت‌نام</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <Link
                  to="/heyat#coupon"
                  className="min-h-[48px] px-6 py-3 rounded-xl border border-line bg-surface hover:border-gold/50 text-ink font-semibold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <QrCode className="w-4 h-4 text-gold" />
                  <span>دریافت ژتون صبحانه</span>
                </Link>
              </div>
            </div>

            {/* ستون شمارنده معکوس و پیشرفت */}
            <div className="lg:col-span-5 flex flex-col gap-4 justify-center">
              <div className="rounded-2xl glass-panel p-6">
                <div className="flex items-center justify-between gap-2 text-xs text-ink-muted mb-2">
                  <span className="inline-flex items-center gap-1.5 text-gold font-semibold">
                    <Calendar className="w-4 h-4" />
                    <span>شمارش معکوس رویداد پیش‌رو</span>
                  </span>
                  <span>{settings.targetEventDateJalali}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-ink">
                  {settings.targetEventTitle}
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
                      className="rounded-xl border border-line bg-surface py-3 px-2"
                    >
                      <div className="text-2xl sm:text-3xl font-extrabold text-gold tabular-nums">
                        {toPersianDigits(String(item.val).padStart(2, '0'))}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* کارت پیشرفت شخصی نوورود */}
              <div className="rounded-2xl border border-line bg-surface p-5">
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
                    className="h-full rounded-full bg-gold transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                  <span className="tabular-nums">
                    {toPersianDigits(completedSteps.length)} از {toPersianDigits(REGISTRATION_CHECKLIST.length)} مرحله انجام شده
                  </span>
                  <Link to="/guide" className="text-gold hover:underline font-medium">
                    ادامه چک‌لیست
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* دسترسی سریع به ۶ بخش اصلی */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold text-gold mb-1">نقشه راه نوورودی‌ها</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink">
              هر آنچه در هفته اول نیاز داری
            </h2>
          </div>
          <Link to="/guide#map" className="text-sm text-gold hover:underline font-medium">
            مشاهده نقشه تعاملی دانشگاه
          </Link>
        </div>

        {/* چیدمان نامتقارن Bento Grid برای دسترسی سریع و جلوه مدرن */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* کارت برجسته اول: چارت تعاملی ۲۵ کانون بسیج */}
          <div className="md:col-span-6 lg:col-span-7">
            <TiltCard>
              <Link
                to="/basij"
                className="relative block h-full rounded-3xl border border-gold/35 bg-surface hover:border-gold/70 p-6 sm:p-7 overflow-hidden transition-colors group"
              >
                <GeometricLatticeBg opacity={0.06} />
                <div className="relative z-10 flex flex-col justify-between h-full gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-gold">
                        ۰۱ · چارت تعاملی قرار قیام ۹
                      </span>
                      <Compass className="w-5 h-5 text-gold" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-gold transition-colors">
                      بسیج دانشجویی و چارت گرافیکی ۲۵ کانون
                    </h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-xl">
                      به‌جای دفترچه‌های طولانی، همه ۲۵ کانون تخصصی را روی چارت تعاملی ببین، بر اساس رشته تحصیلی‌ات پیشنهاد بگیر و پوستر استوری آزمون علاقه‌مندی بساز.
                    </p>
                  </div>

                  {/* نوار ۶ محور رنگی */}
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
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </div>

          {/* کارت برجسته دوم: راهنمای ثبت‌نام و چک‌لیست */}
          <div className="md:col-span-6 lg:col-span-5">
            <TiltCard>
              <Link
                to="/guide"
                className="relative block h-full rounded-3xl border border-line bg-surface hover:border-gold/55 p-6 sm:p-7 overflow-hidden transition-colors group"
              >
                <div className="flex flex-col justify-between h-full gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-gold">۰۲ · نقشه راه روز اول</span>
                      <BookOpen className="w-5 h-5 text-gold" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-gold transition-colors">
                      راهنمای ثبت‌نام، نقشه و FAQ
                    </h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                      چک‌لیست مرحله‌به‌مرحله، مدارک لازم، نقشه معماری ایزومتریک ساختمان‌های دانشگاه و جستجوی هوشمند سوالات متداول.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-line flex items-center justify-between text-xs">
                    <span className="text-ink-muted tabular-nums">
                      پیشرفت تو: <strong className="text-gold">{toPersianDigits(checklistProgress)}٪</strong>
                    </span>
                    <span className="text-gold font-bold inline-flex items-center gap-1">
                      <span>باز کردن راهنما</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </div>

          {/* ردیف دوم Bento: ۴ کارت متوازن */}
          {QUICK_ACCESS.filter((q) => q.to !== '/basij' && q.to !== '/guide').map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={item.to} className="md:col-span-3 lg:col-span-3">
                <TiltCard>
                  <Link
                    to={item.to}
                    className="block h-full rounded-2xl border border-line bg-surface hover:border-gold/50 p-5 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gold-soft text-gold flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-ink-muted tabular-nums">
                        ۰{toPersianDigits(idx + 3)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-ink group-hover:text-gold transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </Link>
                </TiltCard>
              </div>
            );
          })}
        </div>
      </section>

      {/* آخرین اطلاعیه‌ها + نظرسنجی کوتاه */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-ink">آخرین اطلاعیه‌ها</h2>
              <Link to="/announcements" className="text-sm text-gold hover:underline font-medium">
                مشاهده همه
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
                    className="rounded-2xl border border-line bg-surface p-5 hover:border-gold/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mb-2">
                      <span className="text-gold font-semibold">{ann.category}</span>
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
          <div className="lg:col-span-5 rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-bold text-ink">نظرسنجی کوتاه و ناشناس</h2>
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
                        className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          n <= regScore
                            ? 'border-gold bg-gold-soft text-gold'
                            : 'border-line bg-canvas text-ink-muted'
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
                        className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          n <= foodScore
                            ? 'border-gold bg-gold-soft text-gold'
                            : 'border-line bg-canvas text-ink-muted'
                        }`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="survey-comment" className="block text-xs font-medium text-ink-muted mb-1.5">
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
                  className="w-full min-h-[44px] rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid font-semibold text-sm transition-colors cursor-pointer"
                >
                  ثبت نظر ناشناس
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
