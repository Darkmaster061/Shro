import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  Coffee,
  Crown,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  Filter,
  IdCard,
  PlusCircle,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import {
  COHORT_GROUP_OPTIONS,
  normalizeStudentNumber,
  validateStudentNumber,
} from '../utils/studentValidation';
import { formatJalaliTime } from '../utils/jalali';
import { normalizeNameCompact, toPersianDigits } from '../utils/persian';
import type {
  AdminUser,
  BreakfastAnalyticsSummary,
  BreakfastReportFilters,
  CohortGroup,
  DetailedBreakfastRecord,
  MealItem,
  ReportColumnKey,
} from '../types/portal';

interface ColumnMeta {
  key: ReportColumnKey;
  label: string;
  sensitive?: boolean;
}

const REPORT_COLUMNS: ColumnMeta[] = [
  { key: 'rowNum', label: 'ردیف' },
  { key: 'studentNumber', label: 'شماره دانشجویی' },
  { key: 'cohortGroup', label: 'گروه / ورودی' },
  { key: 'firstName', label: 'نام' },
  { key: 'lastName', label: 'نام‌خانوادگی' },
  { key: 'nationalId', label: 'کد ملی', sensitive: true },
  { key: 'phone', label: 'شماره تماس', sensitive: true },
  { key: 'birthJalali', label: 'تاریخ تولد شمسی', sensitive: true },
  { key: 'major', label: 'رشته تحصیلی' },
  { key: 'status', label: 'وضعیت صبحانه' },
  { key: 'mealName', label: 'وعده دریافتی' },
  { key: 'claimedAt', label: 'ساعت تحویل' },
  { key: 'authorizedBy', label: 'ثبت‌کننده کد' },
  { key: 'note', label: 'توضیحات' },
];

const COLUMN_PRESETS: { id: string; label: string; cols: ReportColumnKey[] }[] = [
  {
    id: 'full',
    label: 'گزارش کامل مدیریتی (همه فیلدها)',
    cols: [
      'rowNum',
      'studentNumber',
      'cohortGroup',
      'firstName',
      'lastName',
      'nationalId',
      'phone',
      'birthJalali',
      'major',
      'status',
      'mealName',
      'claimedAt',
      'authorizedBy',
      'note',
    ],
  },
  {
    id: 'hospitality',
    label: 'فهرست پذیرایی (بدون کد ملی و تولد)',
    cols: [
      'rowNum',
      'studentNumber',
      'cohortGroup',
      'firstName',
      'lastName',
      'phone',
      'major',
      'status',
      'mealName',
      'claimedAt',
    ],
  },
  {
    id: 'compact',
    label: 'خلاصه اسامی و وضعیت تحویل',
    cols: ['rowNum', 'studentNumber', 'firstName', 'lastName', 'major', 'status', 'claimedAt'],
  },
];

interface AdminBreakfastStudioProps {
  user: AdminUser;
}

export const AdminBreakfastStudio: React.FC<AdminBreakfastStudioProps> = ({ user }) => {
  const { showToast } = usePortal();

  const [records, setRecords] = useState<DetailedBreakfastRecord[]>([]);
  const [analytics, setAnalytics] = useState<BreakfastAnalyticsSummary | null>(null);
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [suspicious, setSuspicious] = useState<
    { id: number; attempt_type: string; detail: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // فرم انحصاری مدیر کل برای ثبت شماره دانشجویی غیر ۴۰۵ (انجمن/کانون) و ۴۰۵
  const [vipStudentNum, setVipStudentNum] = useState('');
  const [vipCohort, setVipCohort] = useState<CohortGroup>('انجمن علمی');
  const [vipNote, setVipNote] = useState('');
  const [vipSubmitting, setVipSubmitting] = useState(false);

  // فیلترهای گزارش
  const [filters, setFilters] = useState<BreakfastReportFilters>({
    status: 'all',
    cohort: 'all',
    major: 'همه',
    mealId: 'all',
    q: '',
  });

  // استودیوی خروجی گرافیکی
  const [selectedCols, setSelectedCols] = useState<ReportColumnKey[]>([
    'rowNum',
    'studentNumber',
    'cohortGroup',
    'firstName',
    'lastName',
    'nationalId',
    'phone',
    'major',
    'status',
    'mealName',
    'claimedAt',
  ]);
  const [reportTitle, setReportTitle] = useState('گزارش رسمی پذیرایی صبحانه نوورودی‌ها ۱۴۰۵');
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'html' | 'pdf' | null>(null);
  const [readyFile, setReadyFile] = useState<{
    format: 'xlsx' | 'html' | 'pdf';
    filename: string;
    sizeKb: number;
    downloadUrl: string;
    previewUrl: string;
    recordCount: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDetailedBreakfastReport();
      setRecords(res.records);
      setAnalytics(res.analytics);
      setMeals(res.meals);
      setSuspicious(res.suspicious);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در دریافت گزارش صبحانه', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueMajors = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.major) set.add(r.major);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const qRaw = filters.q.trim();
    const qNorm = normalizeNameCompact(qRaw);
    const qDigits = normalizeStudentNumber(qRaw);
    return records.filter((r) => {
      if (filters.status === 'claimed' && !r.hasClaimed) return false;
      if (
        filters.status === 'unclaimed_coupon' &&
        (r.hasClaimed || r.registrationStatus !== 'registered')
      ) {
        return false;
      }
      if (filters.status === 'pending_form' && r.registrationStatus !== 'authorized') return false;
      if (filters.cohort === '405' && !r.is405) return false;
      if (filters.cohort === 'non_405' && r.is405) return false;
      if (filters.major !== 'همه' && r.major !== filters.major) return false;
      if (filters.mealId !== 'all' && r.mealId !== filters.mealId) return false;

      if (qRaw) {
        const hit =
          normalizeNameCompact(`${r.firstName} ${r.lastName}`).includes(qNorm) ||
          r.studentNumber.includes(qDigits || qRaw) ||
          r.nationalId.includes(qDigits || qRaw) ||
          r.phone.includes(qDigits || qRaw) ||
          r.major.includes(qRaw) ||
          r.cohortGroup.includes(qRaw) ||
          r.note.includes(qRaw);
        if (!hit) return false;
      }
      return true;
    });
  }, [records, filters]);

  const handleVipAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateStudentNumber(vipStudentNum, { require405: false });
    if (!check.valid) {
      showToast(check.error || 'شماره دانشجویی معتبر نیست.', 'error');
      return;
    }
    setVipSubmitting(true);
    try {
      const res = await api.authorizeStudentNumber({
        studentNumber: check.normalized,
        cohortGroup: check.is405 ? 'نوورود ۱۴۰۵' : vipCohort,
        note: vipNote.trim(),
      });
      showToast(res.message, 'success');
      setVipStudentNum('');
      setVipNote('');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در تایید شماره دانشجویی', 'error');
    } finally {
      setVipSubmitting(false);
    }
  };

  const toggleColumn = (key: ReportColumnKey) => {
    setSelectedCols((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // حداقل ۱ ستون انتخاب بماند
        return prev.filter((k) => k !== key);
      }
      // حفظ ترتیب استاندارد ستون‌ها
      const nextSet = new Set([...prev, key]);
      return REPORT_COLUMNS.map((c) => c.key).filter((k) => nextSet.has(k));
    });
  };

  const handleExport = async (format: 'xlsx' | 'html' | 'pdf') => {
    setExportingFormat(format);
    try {
      const res = await api.createBreakfastExportToken({
        format,
        columns: selectedCols,
        filters,
        title: reportTitle,
      });
      setReadyFile({ format, ...res });

      // شروع خودکار دانلود یا باز کردن پیش‌نمایش چاپ PDF
      if (format === 'pdf') {
        const a = document.createElement('a');
        a.href = res.previewUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('نسخه رسمی آماده چاپ PDF باز شد (از کادر پایین هم قابل مشاهده است).', 'success');
      } else {
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast(
          format === 'xlsx'
            ? `فایل اکسل گرافیکی (${toPersianDigits(res.recordCount)} رکورد) آماده و دانلود شد.`
            : `گزارش گرافیکی HTML (${toPersianDigits(res.recordCount)} رکورد) آماده و دانلود شد.`,
          'success'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ساخت فایل خروجی', 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* بخش ۱: ثبت انحصاری شماره دانشجویی توسط مدیر کل (انجمن‌ها، کانون‌ها، بسیج و غیر ۴۰۵) */}
      {user.role === 'owner' && (
        <section
          data-testid="owner-vip-authorize-card"
          className="rounded-3xl border border-gold/45 bg-gradient-to-l from-gold-soft/40 via-surface to-surface p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-gold inline-flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                <span>مجوز انحصاری مدیریت کل (غیرقابل دسترسی در پنل میز استقبال)</span>
              </p>
              <h2 className="text-base sm:text-lg font-extrabold text-ink">
                ثبت شماره دانشجویی انجمن‌ها، کانون‌ها، بسیج و سایر ورودی‌ها (غیر ۴۰۵ و ۴۰۵)
              </h2>
              <p className="text-xs text-ink-muted leading-6 max-w-3xl">
                اپراتور میز استقبال در لابی فقط می‌تواند کدهای ورودی ۱۴۰۵ (شروع با ۴۰۵) را ثبت کند. تنها شما به‌عنوان{' '}
                <strong className="text-ink">مدیر کل</strong> می‌توانید شماره دانشجویی ورودی‌های سال‌های قبل (مثل ۴۰۲، ۴۰۳، ۴۰۴ برای اعضای انجمن‌های علمی، کانون‌ها و خادمان) را اینجا ثبت کنید تا در صفحه ژتون صبحانه سبز شوند.
              </p>
            </div>
            <Link
              to="/desk"
              className="min-h-[38px] px-3.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-bold text-ink inline-flex items-center gap-1.5 shrink-0"
            >
              <IdCard className="w-4 h-4 text-gold" />
              <span>باز کردن پنل میز استقبال لابی</span>
            </Link>
          </div>

          <form onSubmit={handleVipAuthorize} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label htmlFor="owner-vip-stu" className="block text-xs text-ink-muted mb-1">
                شماره دانشجویی (هر ورودی؛ مثلاً ۴۰۲۱۲۳۲۱۷۳)
              </label>
              <input
                id="owner-vip-stu"
                data-testid="owner-vip-student-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                required
                value={vipStudentNum}
                onChange={(e) => setVipStudentNum(e.target.value)}
                placeholder="4021232173"
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm font-mono font-bold text-center text-ink focus:border-gold"
              />
            </div>

            <div className="md:col-span-3">
              <label htmlFor="owner-vip-group" className="block text-xs text-ink-muted mb-1">
                دسته‌بندی / سمت
              </label>
              <select
                id="owner-vip-group"
                data-testid="owner-vip-group-select"
                value={vipCohort}
                onChange={(e) => setVipCohort(e.target.value as CohortGroup)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
              >
                {COHORT_GROUP_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="owner-vip-note" className="block text-xs text-ink-muted mb-1">
                توضیحات اختیاری (نام انجمن/کانون)
              </label>
              <input
                id="owner-vip-note"
                type="text"
                value={vipNote}
                onChange={(e) => setVipNote(e.target.value)}
                placeholder="مثلاً: انجمن علمی کامپیوتر"
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                data-testid="owner-vip-submit-btn"
                disabled={vipSubmitting}
                className="btn-sheen w-full min-h-[44px] px-4 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{vipSubmitting ? 'ثبت...' : 'تایید و سبز کردن'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* بخش ۲: داشبورد آماری زنده («کی خورده، کی نخورده، کی فرم پر نکرده») */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" />
              <span>داشبورد لحظه‌ای پذیرایی صبحانه</span>
            </h2>
            <p className="text-xs text-ink-muted">
              تفکیک دقیق دریافت‌کنندگان، ژتون‌های استفاده‌نشده، کدهای منتظر فرم و آمار رشته‌ها
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="min-h-[38px] px-3.5 rounded-xl border border-line bg-surface hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی آمار</span>
          </button>
        </div>

        {analytics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="text-xs text-ink-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gold" />
                  <span>کل کدهای مجازشده</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-ink tabular-nums mt-1.5">
                  {toPersianDigits(analytics.totalAuthorized)}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4">
                <div className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5" />
                  <span>صبحانه خورده‌اند</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500 tabular-nums mt-1.5">
                  {toPersianDigits(analytics.claimedCount)}
                  <span className="text-xs font-bold mr-1.5">
                    ({toPersianDigits(analytics.claimRatePercent)}٪)
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                <div className="text-xs text-amber-600 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>ژتون دارند (نخورده)</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 tabular-nums mt-1.5">
                  {toPersianDigits(analytics.unclaimedWithCouponCount)}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="text-xs text-ink-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>منتظر تکمیل فرم</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-ink-muted tabular-nums mt-1.5">
                  {toPersianDigits(analytics.pendingFormCount)}
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 rounded-2xl border border-gold/35 bg-gold-soft/40 p-4">
                <div className="text-xs text-gold font-semibold">تفکیک ورودی‌ها</div>
                <div className="text-xl sm:text-2xl font-extrabold text-ink tabular-nums mt-1.5">
                  {toPersianDigits(analytics.cohort405Count)}{' '}
                  <span className="text-xs font-medium text-ink-muted">۴۰۵</span> /{' '}
                  {toPersianDigits(analytics.otherCohortCount)}{' '}
                  <span className="text-xs font-medium text-ink-muted">سایر</span>
                </div>
              </div>
            </div>

            {/* نمودار میله‌ای پیشرفت و تفکیک وعده‌ها + رشته‌ها */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 rounded-2xl border border-line bg-surface p-5 space-y-3">
                <h3 className="text-sm font-bold text-ink">آمار به تفکیک وعده‌های صبحانه</h3>
                <div className="space-y-2.5">
                  {meals.map((m) => {
                    const claimed = m.claimedCount || 0;
                    const total = m.totalActiveStudents || 0;
                    const pct = total > 0 ? Math.round((claimed / total) * 100) : 0;
                    return (
                      <div key={m.id} className="rounded-xl border border-line bg-canvas p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-ink">
                            {m.name} ({m.dateJalali})
                          </span>
                          <span className="font-bold text-emerald-500 tabular-nums">
                            {toPersianDigits(claimed)} نفر ({toPersianDigits(pct)}٪)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-surface overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-l from-emerald-500 to-gold"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl border border-line bg-surface p-5 space-y-3">
                <h3 className="text-sm font-bold text-ink">پراکندگی بر اساس رشته تحصیلی</h3>
                {analytics.byMajor.length === 0 ? (
                  <p className="text-xs text-ink-muted">هنوز داده‌ای ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pl-1">
                    {analytics.byMajor.slice(0, 8).map((item) => {
                      const pct = item.total > 0 ? Math.round((item.claimed / item.total) * 100) : 0;
                      return (
                        <div key={item.major} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink truncate">{item.major}</span>
                            <span className="text-ink-muted tabular-nums shrink-0">
                              {toPersianDigits(item.claimed)} خورده از {toPersianDigits(item.total)} نفر
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-canvas overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* بخش ۳: استودیوی خروجی گرافیکی سفارشی (انتخاب ستون‌ها + Excel / HTML / PDF) */}
      <section
        data-testid="wow-export-studio"
        className="rounded-3xl border border-gold/40 bg-surface p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-gold inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>استودیوی خروجی گرافیکی و سفارشی</span>
            </p>
            <h2 className="text-base sm:text-lg font-extrabold text-ink mt-0.5">
              انتخاب دقیق ستون‌های خروجی + دریافت Excel گرافیکی، HTML تعاملی و PDF رسمی
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              دقیقاً انتخاب کن کدام مشخصات در خروجی قرار بگیرد (فیلترهای فعال جدول پایین نیز روی خروجی اعمال می‌شوند — هم‌اکنون{' '}
              <strong className="text-gold tabular-nums">{toPersianDigits(filteredRecords.length)}</strong>{' '}
              رکورد انتخاب شده است).
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLUMN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedCols(preset.cols)}
                className="px-3 py-1.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-[11px] font-semibold text-ink cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* عنوان گزارش و انتخاب چک‌باکس ستون‌ها */}
        <div className="space-y-3">
          <div className="max-w-lg">
            <label htmlFor="export-report-title" className="block text-xs text-ink-muted mb-1">
              عنوان روی سربرگ گزارش
            </label>
            <input
              id="export-report-title"
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs sm:text-sm text-ink"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {REPORT_COLUMNS.map((col) => {
              const checked = selectedCols.includes(col.key);
              return (
                <label
                  key={col.key}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    checked
                      ? 'border-gold/60 bg-gold-soft/45 text-ink'
                      : 'border-line bg-canvas text-ink-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleColumn(col.key)}
                    className="accent-[#deb154] w-3.5 h-3.5 shrink-0"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ۳ دکمه خروجی WOW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            data-testid="export-xlsx-btn"
            disabled={exportingFormat !== null}
            onClick={() => handleExport('xlsx')}
            className="btn-sheen min-h-[50px] px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>
              {exportingFormat === 'xlsx'
                ? 'در حال ساخت اکسل گرافیکی...'
                : 'خروجی اکسل گرافیکی (.xlsx)'}
            </span>
          </button>

          <button
            type="button"
            data-testid="export-html-btn"
            disabled={exportingFormat !== null}
            onClick={() => handleExport('html')}
            className="btn-sheen min-h-[50px] px-4 rounded-2xl bg-gold hover:bg-gold-strong text-[#071714] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-gold/20"
          >
            <FileCode2 className="w-4 h-4 shrink-0" />
            <span>
              {exportingFormat === 'html'
                ? 'در حال ساخت گزارش HTML...'
                : 'خروجی HTML گرافیکی و تعاملی'}
            </span>
          </button>

          <button
            type="button"
            data-testid="export-pdf-btn"
            disabled={exportingFormat !== null}
            onClick={() => handleExport('pdf')}
            className="min-h-[50px] px-4 rounded-2xl border border-gold/55 bg-canvas hover:bg-gold-soft/50 text-ink font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Printer className="w-4 h-4 text-gold shrink-0" />
            <span>
              {exportingFormat === 'pdf'
                ? 'در حال آماده‌سازی PDF...'
                : 'خروجی PDF گرافیکی رسمی (چاپ)'}
            </span>
          </button>
        </div>

        {/* نوار فایل آماده شده (پشتیبانی کامل از iframe و موبایل) */}
        {readyFile && (
          <div
            data-testid="ready-breakfast-export-bar"
            className="rounded-2xl border border-emerald-500/45 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-0.5">
              <p className="font-extrabold text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>فایل گزارش آماده شد ({toPersianDigits(readyFile.recordCount)} رکورد · {toPersianDigits(readyFile.sizeKb)} KB)</span>
              </p>
              <p className="text-ink-muted font-mono" dir="ltr">
                {readyFile.filename}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={readyFile.downloadUrl}
                download={readyFile.filename}
                className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود مستقیم فایل</span>
              </a>
              {readyFile.format !== 'xlsx' && (
                <a
                  href={readyFile.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[38px] px-3.5 rounded-xl border border-gold/50 bg-canvas text-ink font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gold" />
                  <span>مشاهده و چاپ PDF در تب جدید</span>
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* بخش ۴: فیلتر و جدول زنده تفصیلی دانشجویان */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-ink flex items-center gap-2">
            <Filter className="w-4 h-4 text-gold" />
            <span>
              فهرست تفصیلی ({toPersianDigits(filteredRecords.length)} از {toPersianDigits(records.length)} نفر)
            </span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'همه'],
                ['claimed', 'صبحانه خورده'],
                ['unclaimed_coupon', 'ژتون دارد (نخورده)'],
                ['pending_form', 'منتظر تکمیل فرم'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, status: val }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  filters.status === val
                    ? 'bg-gold text-[#071714]'
                    : 'bg-canvas border border-line text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="جستجو: نام، شماره دانشجویی، کد ملی، موبایل..."
              className="w-full min-h-[40px] rounded-xl border border-line bg-canvas pr-9 pl-3 text-xs text-ink"
            />
          </div>

          <select
            aria-label="فیلتر ورودی"
            value={filters.cohort}
            onChange={(e) =>
              setFilters((f) => ({ ...f, cohort: e.target.value as BreakfastReportFilters['cohort'] }))
            }
            className="min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
          >
            <option value="all">همه ورودی‌ها (۴۰۵ و سایر)</option>
            <option value="405">فقط نوورودی ۱۴۰۵ (۴۰۵)</option>
            <option value="non_405">فقط انجمن، کانون و غیر ۴۰۵</option>
          </select>

          <select
            aria-label="فیلتر رشته تحصیلی"
            value={filters.major}
            onChange={(e) => setFilters((f) => ({ ...f, major: e.target.value }))}
            className="min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
          >
            <option value="همه">همه رشته‌های تحصیلی</option>
            {uniqueMajors.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="فیلتر وعده صبحانه"
            value={String(filters.mealId)}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                mealId: e.target.value === 'all' ? 'all' : Number(e.target.value),
              }))
            }
            className="min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
          >
            <option value="all">همه وعده‌های صبحانه</option>
            {meals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.dateJalali})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-canvas border-b border-line text-ink-muted">
                <th className="py-3 px-2.5">شماره دانشجویی</th>
                <th className="py-3 px-2.5">گروه</th>
                <th className="py-3 px-2.5">نام و نام‌خانوادگی</th>
                <th className="py-3 px-2.5">کد ملی</th>
                <th className="py-3 px-2.5">شماره تماس</th>
                <th className="py-3 px-2.5">رشته تحصیلی</th>
                <th className="py-3 px-2.5">وضعیت صبحانه</th>
                <th className="py-3 px-2.5">وعده / زمان تحویل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRecords.slice(0, 120).map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <td className="py-2.5 px-2.5 font-mono font-bold text-ink" dir="ltr">
                    {r.studentNumber ? toPersianDigits(r.studentNumber) : '—'}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                        r.is405
                          ? 'bg-emerald-500/12 text-emerald-500'
                          : 'bg-gold-soft text-gold'
                      }`}
                    >
                      {r.cohortGroup}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 font-bold text-ink">
                    {r.firstName || r.lastName ? `${r.firstName} ${r.lastName}` : '— (منتظر فرم)'}
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-ink-muted" dir="ltr">
                    {r.nationalId ? toPersianDigits(r.nationalId) : '—'}
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-ink-muted" dir="ltr">
                    {r.phone ? toPersianDigits(r.phone) : '—'}
                  </td>
                  <td className="py-2.5 px-2.5 text-ink-muted">{r.major || '—'}</td>
                  <td className="py-2.5 px-2.5">
                    {r.hasClaimed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                        صبحانه خورده
                      </span>
                    ) : r.registrationStatus === 'authorized' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-canvas border border-line text-ink-muted font-semibold">
                        منتظر فرم
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                        ژتون دارد (نخورده)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-ink-muted tabular-nums">
                    {r.hasClaimed
                      ? `${r.mealName} · ${formatJalaliTime(r.claimedAt)}`
                      : '—'}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-muted">
                    رکوردی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* تلاش‌های مشکوک و دریافت مجدد */}
      <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <h3 className="font-bold text-sm text-ink">تلاش‌های مشکوک و دریافت مجدد (اسکنر)</h3>
        {suspicious.length === 0 ? (
          <p className="text-xs text-ink-muted">مورد مشکوکی ثبت نشده است.</p>
        ) : (
          <div className="divide-y divide-line text-xs">
            {suspicious.map((s) => (
              <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-ink">{s.detail}</span>
                <span className="text-ink-muted tabular-nums">{s.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
