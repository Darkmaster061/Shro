import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bus,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Send,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  Utensils,
} from 'lucide-react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import {
  COMMON_PROBLEMS,
  OFFICIAL_FOOD_PRICING_1405,
  OFFICIAL_NIGHT_TUITION_1405,
  OFFICIAL_REGISTRATION_DAYS,
  OFFICIAL_REGISTRATION_FORMS,
  OFFICIAL_SHUTTLE_SCHEDULE,
  OFFICIAL_UNIVERSITY_CONTACT,
  OFFICIAL_WELLNESS_SERVICES,
  REGISTRATION_CHECKLIST,
  REGISTRATION_TIMELINE,
  REQUIRED_DOCUMENTS,
} from '../data/orientation';
import { CampusMapSvg } from '../components/CampusMapSvg';
import { normalizePersian, searchFaqs, toPersianDigits } from '../utils/persian';
import type { FaqItem } from '../types/portal';

const FAQ_CATEGORIES = ['همه', 'ثبت‌نام', 'خوابگاه', 'تغذیه و صبحانه', 'آموزش', 'بسیج و کانون‌ها', 'حمل‌ونقل و شهر'];

export const GuidePage: React.FC = () => {
  const { completedSteps, toggleStep, checklistProgress, showToast } = usePortal();
  const [checkedDocs, setCheckedDocs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gonabad_checked_docs') || '[]');
    } catch {
      return [];
    }
  });
  const [openProblem, setOpenProblem] = useState<string | null>(COMMON_PROBLEMS[0].id);

  // جستجوگر روز مراجعه بر اساس رشته (۱ تا ۳ آذر ۱۴۰۵)
  const [majorQuery, setMajorQuery] = useState('');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [docsFilter, setDocsFilter] = useState<'essential' | 'all'>('all');

  // سوالات متداول
  const [allFaqs, setAllFaqs] = useState<FaqItem[]>([]);
  const [faqQuery, setFaqQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState('همه');
  const [votedIds, setVotedIds] = useState<number[]>([]);

  // فرم «سوالت را بپرس»
  const [senderName, setSenderName] = useState('');
  const [qCategory, setQCategory] = useState('ثبت‌نام');
  const [qText, setQText] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captcha, setCaptcha] = useState<{ token: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);

  const loadCaptcha = () => {
    api.getCaptcha().then(setCaptcha).catch(() => {});
  };

  useEffect(() => {
    api.getFaqs().then(setAllFaqs).catch(() => {});
    loadCaptcha();
  }, []);

  const visibleFaqs = useMemo(
    () => searchFaqs(allFaqs, faqQuery, faqCategory),
    [allFaqs, faqQuery, faqCategory]
  );

  // یافتن روز دقیق ثبت‌نام رشته انتخابی یا جستجوشده
  const majorSearchNorm = normalizePersian(majorQuery);
  const selectedDayInfo = useMemo(() => {
    if (selectedMajor) {
      const found = OFFICIAL_REGISTRATION_DAYS.find((d) => d.majors.includes(selectedMajor));
      if (found) return { major: selectedMajor, day: found };
    }
    if (majorSearchNorm.length >= 2) {
      for (const day of OFFICIAL_REGISTRATION_DAYS) {
        const hit = day.majors.find((m) => normalizePersian(m).includes(majorSearchNorm));
        if (hit) return { major: hit, day };
      }
    }
    return null;
  }, [selectedMajor, majorSearchNorm]);

  const visibleDocuments = useMemo(
    () => (docsFilter === 'essential' ? REQUIRED_DOCUMENTS.filter((d) => d.essentialForAll) : REQUIRED_DOCUMENTS),
    [docsFilter]
  );

  const toggleDoc = (id: string) => {
    setCheckedDocs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('gonabad_checked_docs', JSON.stringify(next));
      return next;
    });
  };

  const handleVote = async (id: number, helpful: 'yes' | 'no') => {
    if (votedIds.includes(id)) return;
    setVotedIds((prev) => [...prev, id]);
    setAllFaqs((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              helpfulYes: item.helpfulYes + (helpful === 'yes' ? 1 : 0),
              helpfulNo: item.helpfulNo + (helpful === 'no' ? 1 : 0),
            }
          : item
      )
    );
    try {
      await api.voteFaq(id, helpful);
      showToast('رأی شما ثبت شد.', 'success');
    } catch {
      // بدون مزاحمت برای کاربر
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captcha) return;
    setSubmittingQ(true);
    try {
      const res = await api.submitQuestion({
        senderName: senderName.trim() || 'ناشناس',
        category: qCategory,
        question: qText,
        captchaToken: captcha.token,
        captchaAnswer,
        website: honeypot,
      });
      showToast(res.message, 'success');
      setQText('');
      setCaptchaAnswer('');
      loadCaptcha();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ارسال سوال', 'error');
      loadCaptcha();
    } finally {
      setSubmittingQ(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
      {/* سرصفحه */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-semibold text-gold mb-1">
            اطلاعیه رسمی ثبت‌نام ۱۴۰۵–۱۴۰۶ · بروزرسانی {OFFICIAL_UNIVERSITY_CONTACT.updatedJalali}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink">
            راهنمای رسمی ثبت‌نام حضوری، مدارک ۲۱‌گانه و شهریه
          </h1>
          <p className="mt-2 text-sm text-ink-muted max-w-2xl">
            زمان‌بندی رسمی ۱ تا ۳ آذرماه بر اساس رشته، چک‌لیست مراحل، فهرست کامل ۲۱ مدرک، جدول شهریه دوره شبانه و سامانه‌های الزامی وزارت علوم در یک‌جا.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print min-h-[44px] px-4 py-2 rounded-xl border border-line bg-surface hover:border-gold/50 text-sm font-medium text-ink inline-flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-gold" />
          <span>چاپ / ذخیره PDF راهنما</span>
        </button>
      </div>

      {/* ۰۰. ابزار فوری «رشته‌ام کدام روز ثبت‌نام دارد؟» */}
      <section
        aria-labelledby="major-day-heading"
        className="rounded-3xl border border-gold/40 bg-gradient-to-l from-gold-soft via-surface to-surface p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-soft text-gold text-xs font-bold">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>برنامه رسمی تحویل مدارک · ساعت ۰۸:۰۰ الی ۱۴:۰۰</span>
            </div>
            <h2 id="major-day-heading" className="text-xl sm:text-2xl font-extrabold text-ink">
              رشته‌ام کدام روز باید برای ثبت‌نام حضوری مراجعه کند؟
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              نام رشته‌ات را بنویس یا از بین رشته‌های زیر انتخاب کن تا روز و ساعت دقیق حضورت در مجتمع آموزش عالی گناباد نمایش داده شود.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-ink-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={majorQuery}
              onChange={(e) => {
                setMajorQuery(e.target.value);
                setSelectedMajor(null);
              }}
              placeholder="جستجوی رشته (مثلاً: کامپیوتر، برق، حقوق...)"
              aria-label="جستجوی رشته جهت یافتن روز ثبت‌نام"
              className="w-full min-h-[44px] rounded-xl border border-line bg-canvas pr-10 pl-3.5 text-sm text-ink"
            />
          </div>
        </div>

        {/* نتیجه انتخاب یا جستجوی رشته */}
        {selectedDayInfo && (
          <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/12 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-400">روز رسمی مراجعه رشته انتخابی شما:</p>
              <p className="text-base sm:text-lg font-extrabold text-ink">
                <span className="text-gold">{selectedDayInfo.major}</span> ← {selectedDayInfo.day.dayTitle} ({selectedDayInfo.day.dateJalali})
              </p>
              <p className="text-xs sm:text-sm text-ink-muted">
                ساعت مراجعه: <strong className="text-ink">{selectedDayInfo.day.timeRange}</strong> · محل: {OFFICIAL_UNIVERSITY_CONTACT.address}
              </p>
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-2">
              <Phone className="w-4 h-4 text-gold shrink-0" />
              <span>تماس ضروری: {OFFICIAL_UNIVERSITY_CONTACT.emergencyPhones.join(' — ')}</span>
            </div>
          </div>
        )}

        {/* جدول سه‌روزه رشته‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OFFICIAL_REGISTRATION_DAYS.map((day, idx) => {
            const isHighlightedDay = selectedDayInfo?.day.id === day.id;
            return (
              <div
                key={day.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-colors space-y-3 ${
                  isHighlightedDay
                    ? 'border-gold bg-canvas shadow-lg shadow-gold/10'
                    : 'border-line bg-canvas/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div>
                    <span className="text-[11px] font-bold text-gold block">روز {toPersianDigits(idx + 1)}</span>
                    <h3 className="font-extrabold text-base text-ink">{day.dayTitle}</h3>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted tabular-nums">
                    {day.timeRange}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {day.majors.map((major) => {
                    const isSelected = selectedDayInfo?.major === major;
                    const matchesSearch =
                      majorSearchNorm.length >= 2 && normalizePersian(major).includes(majorSearchNorm);
                    return (
                      <button
                        key={major}
                        type="button"
                        onClick={() => {
                          setSelectedMajor(major);
                          setMajorQuery('');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected || matchesSearch
                            ? 'bg-gold text-[#071714] border-gold font-bold'
                            : 'bg-surface border-line text-ink hover:border-gold/50'
                        }`}
                      >
                        {major}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* نوار هشدار سامانه‌های الزامی و هزینه کارت دانشجویی */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <a
            href={OFFICIAL_UNIVERSITY_CONTACT.emtUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-line bg-canvas px-4 py-3 flex items-center justify-between gap-2 hover:border-gold/50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-ink">تاییدیه تحصیلی (EMT)</p>
              <p className="text-[11px] text-ink-muted mt-0.5">emt.medu.ir · الزامی برای مدارک حضوری</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gold shrink-0" />
          </a>

          <a
            href={OFFICIAL_UNIVERSITY_CONTACT.talentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-gold/40 bg-canvas px-4 py-3 flex items-center justify-between gap-2 hover:border-gold transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-gold">سامانه استعدادیابی فرهنای وزارت علوم</p>
              <p className="text-[11px] text-ink-muted mt-0.5">talent.dmsrt.ir · بخشنامه الزامی همه نوورودها</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gold shrink-0" />
          </a>

          <div className="rounded-xl border border-line bg-canvas px-4 py-3">
            <p className="text-xs font-bold text-ink">هزینه صدور کارت و خدمات دانشجویی</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              روزانه: <strong className="text-ink">{OFFICIAL_UNIVERSITY_CONTACT.cardFeeDayRial}</strong> · شبانه:{' '}
              <strong className="text-ink">{OFFICIAL_UNIVERSITY_CONTACT.cardFeeNightRial}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ۱. چک‌لیست تعاملی ثبت‌نام */}
      <section aria-labelledby="checklist-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="checklist-heading" className="text-xl sm:text-2xl font-bold text-ink">
              ۰۱. چک‌لیست تعاملی مراحل ثبت‌نام
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              بر اساس اطلاعیه رسمی مجتمع آموزش عالی گناباد ({OFFICIAL_UNIVERSITY_CONTACT.updatedJalali}) — هر مرحله را پس از انجام تیک بزن.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gold tabular-nums">
              {toPersianDigits(checklistProgress)}٪ تکمیل شده
            </span>
            <div className="w-32 h-2.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REGISTRATION_CHECKLIST.map((step, index) => {
            const done = completedSteps.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                aria-pressed={done}
                className={`text-right rounded-2xl border p-5 transition-all cursor-pointer flex items-start gap-4 ${
                  done
                    ? 'border-emerald-500/45 bg-emerald-500/8'
                    : 'border-line bg-surface hover:border-gold/40'
                }`}
              >
                <span
                  className={`mt-0.5 w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                    done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-line bg-canvas text-ink-muted'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : toPersianDigits(index + 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-bold text-base ${
                      done ? 'line-through text-ink-muted' : 'text-ink'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
                    {step.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>محل: {step.location}</span>
                    <span aria-hidden="true">·</span>
                    <span>زمان تقریبی: {step.duration}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ۲. تایم‌لاین روزهای ثبت‌نام */}
      <section aria-labelledby="timeline-heading" className="space-y-5">
        <h2 id="timeline-heading" className="text-xl sm:text-2xl font-bold text-ink">
          ۰۲. زمان‌بندی روزهای ثبت‌نام
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {REGISTRATION_TIMELINE.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-2xl border border-line bg-surface p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
                  <span className="text-gold font-bold">روز {toPersianDigits(idx + 1)}</span>
                  <span className="tabular-nums">{item.timeRange}</span>
                </div>
                <h3 className="font-bold text-base text-ink">{item.dayTitle}</h3>
                <p className="text-xs text-gold mt-1 tabular-nums">{item.dateJalali}</p>
                <p className="mt-3 text-sm text-ink-muted leading-relaxed">{item.description}</p>
              </div>
              <p className="mt-4 pt-3 border-t border-line text-xs text-ink-muted">
                محل: {item.location}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ۳. مدارک ۲۱‌گانه رسمی و فرم‌های پرونده */}
      <section aria-labelledby="docs-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="docs-heading" className="text-xl sm:text-2xl font-bold text-ink">
              ۰۳. مدارک لازم ثبت‌نام حضوری ({toPersianDigits(REQUIRED_DOCUMENTS.length)} بند رسمی)
            </h2>
            <p className="text-xs text-ink-muted mt-1 tabular-nums">
              {toPersianDigits(checkedDocs.length)} از {toPersianDigits(REQUIRED_DOCUMENTS.length)} مورد آماده شده است
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-surface border border-line p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDocsFilter('essential')}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                docsFilter === 'essential' ? 'bg-gold text-[#071714]' : 'text-ink-muted hover:text-ink'
              }`}
            >
              مدارک عمومی همه ({toPersianDigits(REQUIRED_DOCUMENTS.filter((d) => d.essentialForAll).length)})
            </button>
            <button
              type="button"
              onClick={() => setDocsFilter('all')}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                docsFilter === 'all' ? 'bg-gold text-[#071714]' : 'text-ink-muted hover:text-ink'
              }`}
            >
              نمایش همه {toPersianDigits(REQUIRED_DOCUMENTS.length)} بند
            </button>
          </div>
        </div>

        {/* ۵ فرم مورد نیاز تکمیل پرونده */}
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <FileText className="w-4 h-4 text-gold" />
            <span>۵ فرم مورد نیاز جهت دانلود از سایت دانشگاه و تحویل همراه مدارک:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {OFFICIAL_REGISTRATION_FORMS.map((f, idx) => (
              <div key={f.id} className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-xs font-bold text-ink">
                  {toPersianDigits(idx + 1)}. {f.title}
                </p>
                <p className="text-[11px] text-ink-muted mt-1">{f.audience}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleDocuments.map((doc) => {
            const checked = checkedDocs.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => toggleDoc(doc.id)}
                aria-pressed={checked}
                className={`text-right rounded-xl border p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  checked
                    ? 'border-emerald-500/45 bg-emerald-500/8'
                    : 'border-line bg-surface hover:border-gold/40'
                }`}
              >
                <span
                  className={`mt-0.5 w-6 h-6 rounded-md border flex items-center justify-center shrink-0 text-[11px] font-bold tabular-nums ${
                    checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-line bg-canvas text-ink-muted'
                  }`}
                >
                  {checked ? <Check className="w-3.5 h-3.5" /> : toPersianDigits(doc.order)}
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-gold block mb-0.5">{doc.groupTag}</span>
                  <p className={`text-sm font-semibold leading-snug ${checked ? 'line-through text-ink-muted' : 'text-ink'}`}>
                    {doc.title}
                  </p>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{doc.note}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 flex items-start gap-3 text-xs sm:text-sm text-ink">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>تذکر مهم آموزش:</strong> کلیه مدارک تحصیلی فوق باید دارای <strong>مهر و امضاء</strong> باشند. دانشجویان حتماً از تمامی مدارک بالا یک نسخه رونوشت تهیه نمایند و نزد خود نگه دارند تا در صورت نیاز در آینده از آن استفاده کنند.
          </p>
        </div>
      </section>

      {/* ۳.۵ جدول رسمی شهریه دوره نوبت دوم (شبانه) ورودی ۱۴۰۵–۱۴۰۶ */}
      <section aria-labelledby="tuition-heading" className="rounded-3xl border border-line bg-surface p-5 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gold inline-flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              <span>مقطع کارشناسی دوره نوبت دوم (شبانه) · سال تحصیلی ۱۴۰۵–۱۴۰۶</span>
            </p>
            <h2 id="tuition-heading" className="text-lg sm:text-2xl font-bold text-ink mt-1">
              جدول رسمی شهریه دانشجویان دوره شبانه (مبالغ به ریال)
            </h2>
          </div>
          <span className="text-xs text-ink-muted">منبع: اطلاعیه رسمی {OFFICIAL_UNIVERSITY_CONTACT.updatedJalali}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-right border-collapse">
            <thead>
              <tr className="border-b border-line text-gold bg-canvas/60">
                <th className="py-3 px-3 font-bold">گروه آموزشی</th>
                <th className="py-3 px-3 font-bold">ثابت هر نیمسال</th>
                <th className="py-3 px-3 font-bold">واحد عمومی</th>
                <th className="py-3 px-3 font-bold">واحد پایه</th>
                <th className="py-3 px-3 font-bold">واحد تخصصی</th>
                <th className="py-3 px-3 font-bold">عملی / آزمایشگاهی / کارگاهی</th>
                <th className="py-3 px-3 font-bold">پروژه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {OFFICIAL_NIGHT_TUITION_1405.map((row) => (
                <tr key={row.group} className="hover:bg-canvas/40">
                  <td className="py-3.5 px-3 font-bold">{row.group}</td>
                  <td className="py-3.5 px-3 font-bold text-gold tabular-nums">{row.fixedPerTerm}</td>
                  <td className="py-3.5 px-3 tabular-nums">{row.generalUnit}</td>
                  <td className="py-3.5 px-3 tabular-nums">{row.basicUnit}</td>
                  <td className="py-3.5 px-3 tabular-nums">{row.specializedUnit}</td>
                  <td className="py-3.5 px-3 tabular-nums">{row.practicalHour}</td>
                  <td className="py-3.5 px-3 tabular-nums">{row.project}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ۳.۶ تعرفه رسمی یارانه غذای دانشجویی (سلف سرویس) و خدمات رفاهی */}
      <section
        id="food-pricing"
        aria-labelledby="food-pricing-heading"
        className="rounded-3xl border border-line bg-surface p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gold inline-flex items-center gap-1.5">
              <Utensils className="w-4 h-4" />
              <span>امور تغذیه و سلف سرویس دانشگاه · مبالغ به هزار تومان</span>
            </p>
            <h2 id="food-pricing-heading" className="text-lg sm:text-2xl font-bold text-ink mt-1">
              جدول تعرفه رسمی یارانه غذای دانشجویی
            </h2>
          </div>
          <a
            href={`tel:${OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice.phone}`}
            dir="ltr"
            className="text-xs font-bold text-gold hover:underline tabular-nums inline-flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>
              امور تغذیه ({OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice.person}):{' '}
              {OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice.phone}
            </span>
          </a>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-canvas">
          <table className="w-full text-xs sm:text-sm text-right border-collapse">
            <thead>
              <tr className="border-b border-line text-gold bg-surface">
                <th className="py-3 px-3 font-bold text-center w-12">ردیف</th>
                <th className="py-3 px-3 font-bold">دانشجویان واجد شرایط دریافت یارانه غذای دانشجویی</th>
                <th className="py-3 px-3 font-bold text-center whitespace-nowrap">غذای پرهزینه (ناهار و شام)</th>
                <th className="py-3 px-3 font-bold text-center whitespace-nowrap">غذای متوسط‌هزینه (ناهار و شام)</th>
                <th className="py-3 px-3 font-bold text-center whitespace-nowrap">کم‌هزینه (صبحانه)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {OFFICIAL_FOOD_PRICING_1405.map((item) => {
                const highlight = item.row === '۱' || item.row === '۶';
                return (
                  <tr
                    key={item.row}
                    className={highlight ? 'bg-gold-soft/40 hover:bg-gold-soft/60' : 'hover:bg-surface/60'}
                  >
                    <td className="py-3 px-3 text-center font-bold text-gold tabular-nums">{item.row}</td>
                    <td className="py-3 px-3 font-medium leading-relaxed">{item.group}</td>
                    <td className="py-3 px-3 text-center font-extrabold text-gold tabular-nums whitespace-nowrap">
                      {item.highCost} هزار تومان
                    </td>
                    <td className="py-3 px-3 text-center font-bold tabular-nums whitespace-nowrap">
                      {item.mediumCost} هزار تومان
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-ink-muted tabular-nums whitespace-nowrap">
                      {item.lowCostBreakfast} هزار تومان
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* دو کارت خلاصه سرویس ایاب‌وذهاب و خدمات پزشک رایگان/مشاور */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          <Link
            to="/dorms#shuttle"
            className="rounded-2xl border border-line bg-canvas p-4 hover:border-gold/50 transition-colors flex items-start justify-between gap-3"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
                <Bus className="w-4 h-4" />
                <span>سرویس ایاب و ذهاب دانشجویان (عادی و پنج‌شنبه)</span>
              </p>
              <p className="text-xs sm:text-sm text-ink font-semibold">
                ایستگاه داخل شهر: {OFFICIAL_SHUTTLE_SCHEDULE.cityStation}
              </p>
              <p className="text-xs text-ink-muted">
                جدول کامل ساعت حرکت دختران (خوابگاه پروین) و پسران (داخل شهر و پنج‌شنبه‌ها) در صفحه خوابگاه و رفاه.
              </p>
            </div>
            <span className="text-xs font-bold text-gold shrink-0">مشاهده جدول ←</span>
          </Link>

          <Link
            to="/dorms#wellness"
            className="rounded-2xl border border-line bg-canvas p-4 hover:border-gold/50 transition-colors flex items-start justify-between gap-3"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                <span>پزشک عمومی رایگان و مشاور خوابگاه</span>
              </p>
              <p className="text-xs sm:text-sm text-ink font-semibold">
                {OFFICIAL_WELLNESS_SERVICES[0].schedule} · {OFFICIAL_WELLNESS_SERVICES[0].location}
              </p>
              <p className="text-xs text-ink-muted">
                همراه با حضور مشاور ({OFFICIAL_WELLNESS_SERVICES[1].provider.replace('مشاور: ', '')}) دوشنبه‌ها ساعت ۲۱ در خوابگاه پروین.
              </p>
            </div>
            <span className="text-xs font-bold text-gold shrink-0">جزئیات بیشتر ←</span>
          </Link>
        </div>
      </section>

      {/* ۴. نقشه تعاملی ساختمان اصلی دانشگاه */}
      <section id="map" aria-labelledby="map-heading" className="space-y-5">
        <h2 id="map-heading" className="text-xl sm:text-2xl font-bold text-ink">
          ۰۴. نقشه تعاملی ساختمان اصلی دانشگاه و نقاط کلیدی ثبت‌نام
        </h2>
        <CampusMapSvg />
      </section>

      {/* ۵. مشکلات رایج و راه‌حل */}
      <section aria-labelledby="problems-heading" className="space-y-4">
        <h2 id="problems-heading" className="text-xl sm:text-2xl font-bold text-ink">
          ۰۵. مشکلات رایج روز ثبت‌نام و راه‌حل سریع
        </h2>
        <div className="space-y-2.5">
          {COMMON_PROBLEMS.map((p) => {
            const isOpen = openProblem === p.id;
            return (
              <div key={p.id} className="rounded-2xl border border-line bg-surface overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenProblem(isOpen ? null : p.id)}
                  className="w-full min-h-[54px] px-5 py-4 flex items-center justify-between gap-4 text-right font-semibold text-sm sm:text-base text-ink cursor-pointer"
                >
                  <span>{p.title}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gold shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-ink-muted leading-relaxed border-t border-line pt-3.5">
                    {p.solution}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ۶. سوالات متداول با جستجوی فازی فارسی */}
      <section id="faq" aria-labelledby="faq-heading" className="space-y-5">
        <div>
          <h2 id="faq-heading" className="text-xl sm:text-2xl font-bold text-ink">
            ۰۶. سوالات متداول (جستجوی هوشمند فارسی)
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            جستجو با تحمل غلط املایی، نیم‌فاصله و تفاوت حروف (مثلاً «خابگاه» یا «ثبت نام») به‌صورت آنی و آفلاین کار می‌کند.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-5 h-5 text-ink-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={faqQuery}
              onChange={(e) => setFaqQuery(e.target.value)}
              placeholder="سوالت را بنویس... (مثلاً: خوابگاه، ژتون صبحانه، انتخاب واحد)"
              aria-label="جستجو در سوالات متداول"
              className="w-full min-h-[48px] rounded-xl border border-line bg-surface pr-11 pl-4 text-sm text-ink"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFaqCategory(cat)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  faqCategory === cat
                    ? 'bg-gold text-[#071714] font-bold'
                    : 'bg-surface border border-line text-ink-muted hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {visibleFaqs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-sm text-ink-muted">
              نتیجه‌ای برای «{faqQuery}» پیدا نشد. می‌توانی در فرم پایین همین صفحه سوالت را مستقیم بپرسی.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleFaqs.map((faq) => {
              const hasVoted = votedIds.includes(faq.id);
              return (
                <article
                  key={faq.id}
                  className="rounded-2xl border border-line bg-surface p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-ink-muted mb-2">
                      <span className="text-gold font-semibold">{faq.category}</span>
                      {faq.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>نمونه</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-ink leading-snug">{faq.question}</h3>
                    <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">{faq.answer}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-muted">
                    <span>این پاسخ برایت مفید بود؟</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={hasVoted}
                        onClick={() => handleVote(faq.id, 'yes')}
                        aria-label={`پاسخ مفید بود (${faq.question})`}
                        className="min-h-[34px] px-2.5 rounded-lg border border-line hover:border-emerald-500/50 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer tabular-nums"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{toPersianDigits(faq.helpfulYes)}</span>
                      </button>
                      <button
                        type="button"
                        disabled={hasVoted}
                        onClick={() => handleVote(faq.id, 'no')}
                        aria-label={`پاسخ مفید نبود (${faq.question})`}
                        className="min-h-[34px] px-2.5 rounded-lg border border-line hover:border-red-400/50 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer tabular-nums"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{toPersianDigits(faq.helpfulNo)}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ۷. فرم «سوالت را بپرس» (دانشجوی راهنما) */}
      <section
        id="ask"
        aria-labelledby="ask-heading"
        className="no-print rounded-3xl border border-line bg-surface p-6 sm:p-8"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-gold mb-1">دانشجوی راهنما</p>
          <h2 id="ask-heading" className="text-xl sm:text-2xl font-bold text-ink">
            جواب سوالت را پیدا نکردی؟ همین‌جا بپرس
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            سوال‌ها می‌توانند کاملاً ناشناس ثبت شوند؛ پاسخ دانشجویان سال‌بالایی و مسئولان به بخش سوالات متداول اضافه می‌شود.
          </p>

          <form onSubmit={handleQuestionSubmit} className="mt-6 space-y-4">
            {/* فیلد Honeypot ضد ربات */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ask-name" className="block text-xs font-medium text-ink-muted mb-1.5">
                  نام (اختیاری — می‌توانید خالی بگذارید)
                </label>
                <input
                  id="ask-name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="مثلاً: ناشناس یا علی"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="ask-cat" className="block text-xs font-medium text-ink-muted mb-1.5">
                  موضوع سوال
                </label>
                <select
                  id="ask-cat"
                  value={qCategory}
                  onChange={(e) => setQCategory(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
                >
                  {FAQ_CATEGORIES.filter((c) => c !== 'همه').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ask-text" className="block text-xs font-medium text-ink-muted mb-1.5">
                متن سوال
              </label>
              <textarea
                id="ask-text"
                required
                minLength={6}
                rows={3}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="سوالت را شفاف و خلاصه بنویس..."
                className="w-full rounded-xl border border-line bg-canvas p-3.5 text-sm text-ink"
              />
            </div>

            {captcha && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="ask-captcha" className="block text-xs font-medium text-ink-muted mb-1.5">
                    سوال امنیتی: <strong className="text-ink">{captcha.question}</strong>
                  </label>
                  <input
                    id="ask-captcha"
                    type="text"
                    inputMode="numeric"
                    required
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="عدد پاسخ را وارد کن"
                    className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadCaptcha}
                  aria-label="تعویض سوال امنیتی"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-line bg-canvas flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingQ}
              className="min-h-[46px] px-6 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{submittingQ ? 'در حال ارسال...' : 'ارسال سوال'}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
