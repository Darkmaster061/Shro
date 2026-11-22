import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bus,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Coffee,
  ExternalLink,
  History,
  MapPin,
  QrCode,
  Send,
  Users,
} from 'lucide-react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from '../components/LogoEmblem';
import { GeometricLatticeBg } from '../components/GeometricLatticeBg';
import { HeyatAudioPlayer } from '../components/HeyatAudioPlayer';
import { FatemiyehReportSection } from '../components/FatemiyehReportSection';
import { HeyatArchiveAndTeamsSection } from '../components/HeyatArchiveAndTeamsSection';
import { HEYAT_OFFICIAL_INFO, HEYAT_WEEKLY_SCHEDULE } from '../data/orientation';
import { buildIcsContent, getCountdownParts } from '../utils/jalali';
import { toPersianDigits } from '../utils/persian';
import type { HeyatProgram } from '../types/portal';

const PROGRAM_CATS = ['همه', 'صبحانه', 'هفتگی', 'مناسبتی', 'فرهنگی'] as const;

export const HeyatPage: React.FC = () => {
  const { settings } = usePortal();
  const [programs, setPrograms] = useState<HeyatProgram[]>([]);
  const [catFilter, setCatFilter] = useState<(typeof PROGRAM_CATS)[number]>('همه');

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
                  آغاز فعالیت مستمر از سال {HEYAT_OFFICIAL_INFO.foundedYear} · برنامه‌های معنوی، قرارهای هفتگی و سامانه ژتون صبحانه
                </p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm sm:text-base text-ink-muted leading-relaxed">
              {(settings.heyatIntroText
                ? settings.heyatIntroText.split(/\n{2,}/).filter((p) => p.trim())
                : [...HEYAT_OFFICIAL_INFO.biographyParagraphs]
              ).map((paragraph, idx, arr) => (
                <p
                  key={idx}
                  className={
                    idx === arr.length - 1
                      ? 'text-ink font-semibold pt-1'
                      : undefined
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-1">
              <p className="text-xs font-bold text-gold mb-2">
                برخی از برنامه‌های شاخص هیئت از سال {HEYAT_OFFICIAL_INFO.foundedYear} تا امروز:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-ink-muted">
                {HEYAT_OFFICIAL_INFO.signaturePrograms.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

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
            <Link
              to="/coupon"
              className="min-h-[44px] px-5 rounded-xl border border-gold/50 bg-gold-soft hover:bg-gold hover:text-[#071714] text-ink font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>ورود به صفحه اختصاصی ژتون صبحانه</span>
            </Link>
            <a
              href="#fatemiyeh-report"
              className="min-h-[42px] px-5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-ink font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors"
            >
              <History className="w-4 h-4 text-gold" />
              <span>گزارش تصویری و مستند پنج شب فاطمیه</span>
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

      {/* دعوت‌نامه ورود به صفحه اختصاصی سامانه ژتون صبحانه */}
      <section
        id="coupon"
        aria-labelledby="coupon-link-heading"
        className="scroll-mt-20 relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-l from-emerald-deep/95 via-emerald-deep/85 to-[#0b2520] text-[#f4f1e8] p-6 sm:p-9 shadow-[var(--shadow-card)]"
      >
        <GeometricLatticeBg opacity={0.075} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-bold text-[#deb154] inline-flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              <span>پذیرایی صبحگاهی نوورودی‌ها · میزبان: هیئت دانشجویی محبان‌الحسین (ع)</span>
            </p>
            <h2 id="coupon-link-heading" className="text-xl sm:text-3xl font-extrabold leading-snug">
              سامانه دریافت کارت دیجیتال ژتون صبحانه در صفحه اختصاصی قرار دارد
            </h2>
            <p className="text-sm text-[#dce5e1] leading-relaxed">
              برای نظم بیشتر در روزهای ثبت‌نام، صفحه دریافت ژتون صبحانه به صورت مستقل طراحی شده است. پس از تایید شماره دانشجویی در میز استقبال لابی، وارد صفحه اختصاصی شو، مشخصاتت را کامل کن و همان لحظه کارت QR صبحانه‌ات را دریافت کن.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5">
            <Link
              to="/coupon"
              data-testid="heyat-to-coupon-cta"
              className="btn-sheen min-h-[52px] px-6 rounded-2xl bg-[#deb154] hover:bg-[#f0c76f] text-[#071714] font-extrabold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg transition-colors"
            >
              <QrCode className="w-5 h-5 shrink-0" />
              <span>ورود به صفحه ژتون صبحانه</span>
              <ArrowLeft className="w-4 h-4 shrink-0" />
            </Link>
            <span className="text-[11px] text-center text-[#c5d5cf]">
              سهمیه یک‌نوبته در روز ثبت‌نام · ذخیره آفلاین روی گوشی
            </span>
          </div>
        </div>
      </section>

      {/* گزارش تصویری و مستند پنج شب عزاداری ایام فاطمیه */}
      <FatemiyehReportSection />

      {/* آرشیو ۳۱ تصویر برنامه‌های هیئت + ۱۰ تیم و بخش اجرایی */}
      <HeyatArchiveAndTeamsSection channelUrl={heyatChannelUrl} />

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
