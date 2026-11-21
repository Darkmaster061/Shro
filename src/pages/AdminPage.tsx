import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileText,
  LogOut,
  MessageSquare,
  Printer,
  QrCode,
  Settings,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from '../components/LogoEmblem';
import { JalaliDatePicker } from '../components/JalaliDatePicker';
import { parseStudentsCsv } from '../utils/coupon';
import { toPersianDigits } from '../utils/persian';
import type {
  AdminUser,
  AnnouncementItem,
  AuditLogEntry,
  CsvPreviewRow,
  FaqItem,
  MealItem,
  SiteSettings,
  StudentQuestion,
  StudentRecord,
} from '../types/portal';

type AdminTab = 'settings' | 'students' | 'reports' | 'content' | 'audit';

export const AdminPage: React.FC = () => {
  const { settings, refreshSettings, showToast } = usePortal();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState<AdminTab>('settings');
  const [curPass, setCurPass] = useState('');
  const [nextPass, setNextPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // تنظیمات
  const [draftSettings, setDraftSettings] = useState<SiteSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [readyExport, setReadyExport] = useState<{
    filename: string;
    sizeKb: number;
    downloadUrl: string;
    previewUrl: string;
    blobUrl: string;
    blob: Blob;
    html: string;
  } | null>(null);

  // دانشجویان و وعده‌ها
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [stuQuery, setStuQuery] = useState('');
  const [newStu, setNewStu] = useState({ firstName: '', lastName: '', birthJalali: '1387/05/20', note: '' });
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<{
    rows: CsvPreviewRow[];
    validCount: number;
    errorCount: number;
    duplicateCount: number;
  } | null>(null);
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [newMeal, setNewMeal] = useState({ name: '', dateJalali: '۱۴۰۵/۰۷/۰۴', startTime: '۰۷:۰۰', endTime: '۰۹:۳۰' });
  const [printCards, setPrintCards] = useState<{ name: string; code: string; qr: string; note: string }[] | null>(null);

  // گزارش‌ها
  const [report, setReport] = useState<{
    meals: {
      id: number;
      name: string;
      dateJalali: string;
      claimed: number;
      remaining: number;
      total: number;
      unclaimed: { id: number; fullName: string; note: string }[];
    }[];
    suspicious: { id: number; attempt_type: string; detail: string; created_at: string }[];
  } | null>(null);

  // محتوا
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaq, setNewFaq] = useState({ category: 'ثبت‌نام', question: '', answer: '' });
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [newAnn, setNewAnn] = useState({
    title: '',
    summary: '',
    body: '',
    category: 'ثبت‌نام',
    dateJalali: '۱۴۰۵/۰۷/۰۱',
    eventTime: '۰۸:۰۰',
    location: '',
    pinned: false,
  });
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});

  // لاگ‌ها و بازخورد
  const [overview, setOverview] = useState<{
    auditLogs: AuditLogEntry[];
    surveys: { id: number; registration_score: number; breakfast_score: number; comment: string; created_at: string }[];
    messages: { id: number; sender_name: string; contact_info: string; topic: string; message: string; created_at: string }[];
    demoCounts: Record<string, number>;
  } | null>(null);

  const loadTabData = useCallback(
    async (activeUser: AdminUser, activeTab: AdminTab) => {
      try {
        if (activeTab === 'settings' && ['owner', 'editor'].includes(activeUser.role)) {
          const fresh = await api.getSettings();
          setDraftSettings(fresh);
          const ov = await api.getAdminOverview();
          setOverview(ov);
        }
        if (activeTab === 'students' && ['owner', 'food_manager'].includes(activeUser.role)) {
          const [sList, mList] = await Promise.all([api.getAdminStudents(stuQuery), api.getAdminMeals()]);
          setStudents(sList);
          setMeals(mList);
        }
        if (activeTab === 'reports' && ['owner', 'food_manager'].includes(activeUser.role)) {
          setReport(await api.getBreakfastReport());
        }
        if (activeTab === 'content' && ['owner', 'editor'].includes(activeUser.role)) {
          const [fList, aList, qList] = await Promise.all([
            api.getAdminFaqs(),
            api.getAdminAnnouncements(),
            api.getAdminQuestions(),
          ]);
          setFaqs(fList);
          setAnnouncements(aList);
          setQuestions(qList);
        }
        if (activeTab === 'audit' && ['owner', 'editor', 'food_manager'].includes(activeUser.role)) {
          setOverview(await api.getAdminOverview());
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'خطا در بارگذاری بخش ادمین', 'error');
      }
    },
    [stuQuery, showToast]
  );

  useEffect(() => {
    api
      .getMe()
      .then((u) => {
        if (!u) return;
        setUser(u);
        const initialTab: AdminTab =
          u.role === 'food_manager' ? 'students' : u.role === 'editor' ? 'content' : 'settings';
        setTab(initialTab);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (user && user.role !== 'scanner') {
      loadTabData(user, tab);
    }
  }, [user, tab, loadTabData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    try {
      const u = await api.login(username, password);
      setUser(u);
      setTab(u.role === 'food_manager' ? 'students' : u.role === 'editor' ? 'content' : 'settings');
      showToast(`خوش آمدید، ${u.displayName}`, 'success');
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  // پاکسازی امن URL حافظه هنگام تغییر یا خروج از صفحه
  useEffect(() => {
    const currentUrl = readyExport?.blobUrl;
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [readyExport?.blobUrl]);

  // تولید و دانلود فایل تک‌صفحه‌ای کاملاً آفلاین HTML با پشتیبانی کامل از موبایل، iframe و اشتراک‌گذاری مستقیم
  const handleExportOfflineHtml = async () => {
    setExportingHtml(true);
    try {
      const tokenData = await api.createOfflineHtmlExportToken();
      const { blob, html, filename } = await api.downloadOfflineHtml(tokenData.downloadUrl);
      const blobUrl = URL.createObjectURL(blob);

      setReadyExport({
        filename: tokenData.filename || filename,
        sizeKb: tokenData.sizeKb,
        downloadUrl: tokenData.downloadUrl,
        previewUrl: tokenData.previewUrl,
        blobUrl,
        blob,
        html,
      });

      // تلاش خودکار برای دانلود مستقیم در مرورگرهای دسکتاپ (در صورت مسدود بودن داخل iframe، پنجره دانلود مستقیم باز می‌ماند)
      try {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = tokenData.filename || filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // کاربر می‌تواند از دکمه‌های مستقیم داخل پنجره آماده استفاده کند
      }

      showToast('فایل آفلاین آماده شد! اگر دانلود خودکار شروع نشد، از دکمه «دانلود مستقیم در مرورگر» در پنجره بازشده بزنید.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در تولید خروجی آفلاین HTML', 'error');
    } finally {
      setExportingHtml(false);
    }
  };

  const handleShareOfflineFile = async () => {
    if (!readyExport) return;
    try {
      const file = new File([readyExport.blob], readyExport.filename, {
        type: 'text/html;charset=utf-8',
      });
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          title: 'پیش‌نمایش آفلاین پرتال نوورودی‌های دانشگاه گناباد',
          text: 'فایل کاملاً آفلاین سایت برای بررسی و ثبت نظرات تیم (بدون نیاز به اینترنت در مرورگر باز می‌شود).',
          files: [file],
        });
        showToast('پنجره اشتراک‌گذاری فایل باز شد.', 'success');
      } else {
        showToast('مرورگر فعلی اشتراک مستقیم فایل را پشتیبانی نمی‌کند؛ از دکمه «دانلود مستقیم فایل» استفاده کنید.', 'error');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showToast('امکان اشتراک مستقیم نبود؛ لطفاً از دکمه «دانلود مستقیم فایل» استفاده کنید.', 'error');
    }
  };

  const handleCopyOfflineHtml = async () => {
    if (!readyExport) return;
    try {
      await navigator.clipboard.writeText(readyExport.html);
      showToast('کد کامل فایل HTML در کلیپ‌بورد کپی شد (می‌توانید در یک فایل با پسوند .html ذخیره کنید).', 'success');
    } catch {
      showToast('کپی خودکار مجاز نبود؛ لطفاً از دکمه «دانلود مستقیم فایل» استفاده کنید.', 'error');
    }
  };

  const handleUploadAsset = async (
    file: File | undefined,
    field: 'basijLogoUrl' | 'heyatLogoUrl' | 'cadresPdfUrl'
  ) => {
    if (!file) return;
    try {
      const res = await api.uploadFile(file);
      const updated = { ...draftSettings, [field]: res.url };
      setDraftSettings(updated);
      await api.updateSettings({ [field]: res.url });
      await refreshSettings();
      showToast('فایل با موفقیت آپلود و در کل سایت اعمال شد.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در آپلود فایل', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings(draftSettings);
      await refreshSettings();
      showToast('تنظیمات با موفقیت ذخیره و منتشر شد.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearDemo = async () => {
    try {
      await api.clearDemoData();
      await refreshSettings();
      showToast('تمام داده‌های نمونه از پایگاه داده حذف شدند.', 'success');
      if (user) loadTabData(user, tab);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در حذف داده‌های نمونه', 'error');
    }
  };

  const handleCsvFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvText(text);
      setCsvPreview(parseStudentsCsv(text));
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportCsvConfirm = async () => {
    if (!csvText.trim()) return;
    try {
      const res = await api.importStudentsCsv(csvText);
      showToast(
        `${toPersianDigits(res.inserted)} دانشجوی جدید ثبت شد (${toPersianDigits(res.skippedExisting)} تکراری).`,
        'success'
      );
      setCsvText('');
      setCsvPreview(null);
      if (user) loadTabData(user, 'students');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ورود گروهی', 'error');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addStudent(newStu);
      showToast('دانشجو اضافه شد و هش تاریخ تولد با امنیت ذخیره گردید.', 'success');
      setNewStu({ firstName: '', lastName: '', birthJalali: '1387/05/20', note: '' });
      if (user) loadTabData(user, 'students');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ثبت دانشجو', 'error');
    }
  };

  const handlePreparePrintCards = async () => {
    const activeList = students.filter((s) => s.active).slice(0, 60);
    const cards = await Promise.all(
      activeList.map(async (s) => ({
        name: `${s.firstName} ${s.lastName}`,
        code: s.couponCode,
        note: s.note,
        qr: await QRCode.toDataURL(s.couponCode, { width: 160, margin: 1 }),
      }))
    );
    setPrintCards(cards);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink text-sm">
        در حال بررسی دسترسی پنل مدیریت...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gold">بسیج دانشجویی و هیئت دانشگاه گناباد</p>
            <h1 className="text-2xl font-extrabold text-ink mt-1">ورود به پنل مدیریت</h1>
            <p className="text-xs text-ink-muted mt-1">
              دسترسی تفکیک‌شده برای مدیر کل، ویراستار محتوا و مسئول تغذیه.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="adm-user" className="block text-xs text-ink-muted mb-1">
                نام کاربری
              </label>
              <input
                id="adm-user"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="adm-pass" className="block text-xs text-ink-muted mb-1">
                رمز عبور
              </label>
              <input
                id="adm-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
              />
            </div>

            {loginErr && (
              <p role="alert" className="text-xs text-red-500 font-medium">
                {loginErr}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-gold text-[#071714] font-bold text-sm cursor-pointer"
            >
              ورود امن به پنل
            </button>
          </form>

          <div className="rounded-xl border border-line bg-canvas p-3.5 text-xs text-ink-muted leading-6">
            دسترسی این بخش مخصوص مسئولان مجاز است. در صورت نیاز به دریافت یا تغییر رمز عبور، با مدیر کل سامانه هماهنگ کنید.
          </div>

          <Link to="/" className="block text-center text-xs text-gold hover:underline">
            بازگشت به پرتال
          </Link>
        </div>
      </div>
    );
  }

  if (user.role === 'scanner') {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-6 text-center space-y-4">
          <h1 className="text-xl font-bold">حساب شما ویژه اسکنر پخش صبحانه است</h1>
          <Link
            to="/scanner"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[46px] rounded-xl bg-gold text-[#071714] font-bold text-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>ورود به صفحه اسکنر</span>
          </Link>
        </div>
      </div>
    );
  }

  const allowedTabs: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    ...(user.role === 'owner' || user.role === 'editor'
      ? [{ id: 'settings' as const, label: 'تنظیمات و لوگوها', icon: Settings }]
      : []),
    ...(user.role === 'owner' || user.role === 'food_manager'
      ? [
          { id: 'students' as const, label: 'نوورودی‌ها و ژتون', icon: Users },
          { id: 'reports' as const, label: 'گزارش صبحانه', icon: BarChart3 },
        ]
      : []),
    ...(user.role === 'owner' || user.role === 'editor'
      ? [{ id: 'content' as const, label: 'محتوا و سوالات', icon: MessageSquare }]
      : []),
    { id: 'audit', label: 'لاگ و بازخورد', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink pb-14">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoEmblem type="basij" src={settings.basijLogoUrl} size="sm" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-ink">پنل مدیریت پرتال نوورودی‌ها</h1>
              <p className="text-xs text-ink-muted">
                {user.displayName} · نقش: {user.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleExportOfflineHtml}
              disabled={exportingHtml}
              className="min-h-[38px] px-3 rounded-xl bg-gold text-[#071714] hover:opacity-90 disabled:opacity-60 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-opacity"
              title="دانلود فایل واحد و کاملاً آفلاین HTML جهت ارسال به بچه‌ها و جمع‌آوری نظرات"
            >
              <FileCode2 className="w-4 h-4 shrink-0" />
              <span>{exportingHtml ? 'در حال ساخت فایل...' : 'خروجی HTML آفلاین'}</span>
            </button>
            <Link
              to="/scanner"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-ink hover:border-gold/50"
            >
              <QrCode className="w-4 h-4 text-gold" />
              <span>اسکنر</span>
            </Link>
            <Link
              to="/"
              className="min-h-[38px] px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-ink inline-flex items-center"
            >
              مشاهده سایت
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[38px] px-3 rounded-xl border border-line bg-canvas text-xs text-red-500 inline-flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* نوار تب‌های ادمین */}
        <div className="no-print flex flex-wrap gap-2 border-b border-line pb-4">
          {allowedTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-gold text-[#071714]'
                  : 'bg-surface border border-line text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* تب ۱: تنظیمات و آپلود لوگو/PDF */}
        {tab === 'settings' && (
          <div className="space-y-6">
            {/* کارت ویژه خروجی کاملاً آفلاین HTML برای اشتراک‌گذاری و بازبینی تیم */}
            <section className="rounded-3xl border border-gold/40 bg-gradient-to-l from-gold-soft via-surface to-surface p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2 max-w-3xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-soft text-gold text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>پیش‌نمایش آفلاین برای جمع‌آوری نظرات تیم</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-ink">
                    دانلود نسخه کاملاً آفلاین سایت (تک‌فایل HTML مستقل)
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-muted leading-7">
                    تمام صفحات پرتال، چارت تعاملی ۲۵ کانون بسیج، نقشه سه‌بعدی پردیس، خوابگاه‌ها، هیئت، فونت محلی وزیرمتن و لوگوها را در{' '}
                    <strong className="text-ink">یک فایل HTML واحد و بدون نیاز به اینترنت</strong> خروجی بگیرید تا در ایتا، بله یا تلگرام برای بچه‌ها بفرستید. داخل فایل یک بخش اختصاصی{' '}
                    <strong className="text-gold">«نظرات تیم و موارد نیازمند تکمیل»</strong> هم تعبیه شده تا بچه‌ها اصلاحاتشان را یادداشت کرده و متن آماده را برایتان کپی و ارسال کنند.
                  </p>
                  <p className="text-xs text-emerald-500/90 font-medium">
                    حفظ حریم خصوصی: هیچ اطلاعات شخصی دانشجویان، کدهای ژتون، رمز عبور ادمین‌ها یا لاگ‌های امنیتی در این فایل قرار نمی‌گیرد.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch gap-2">
                  <button
                    type="button"
                    onClick={handleExportOfflineHtml}
                    disabled={exportingHtml}
                    className="min-h-[48px] px-5 rounded-2xl bg-gold text-[#071714] hover:opacity-90 disabled:opacity-60 text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-gold/15 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exportingHtml ? 'در حال بسته‌بندی فایل آفلاین...' : 'دانلود فایل HTML کاملاً آفلاین'}</span>
                  </button>
                  <span className="text-[11px] text-ink-muted text-center">
                    قابل باز کردن مستقیم در مرورگر گوشی و کامپیوتر بدون سرور
                  </span>
                </div>
              </div>
            </section>

            {/* آپلود لوگوها و فایل PDF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <LogoEmblem type="basij" src={draftSettings.basijLogoUrl} size="md" />
                  <div>
                    <h2 className="font-bold text-sm text-ink">لوگوی بسیج دانشجویی</h2>
                    <p className="text-xs text-ink-muted">PNG / SVG / WebP</p>
                  </div>
                </div>
                <label className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-ink inline-flex items-center gap-2 cursor-pointer hover:border-gold/50">
                  <Upload className="w-4 h-4 text-gold" />
                  <span>آپلود لوگوی بسیج</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    onChange={(e) => handleUploadAsset(e.target.files?.[0], 'basijLogoUrl')}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <LogoEmblem type="heyat" src={draftSettings.heyatLogoUrl} size="md" />
                  <div>
                    <h2 className="font-bold text-sm text-ink">لوگوی هیئت دانشجویی</h2>
                    <p className="text-xs text-ink-muted">PNG / SVG / WebP</p>
                  </div>
                </div>
                <label className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-ink inline-flex items-center gap-2 cursor-pointer hover:border-gold/50">
                  <Upload className="w-4 h-4 text-gold" />
                  <span>آپلود لوگوی هیئت</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    onChange={(e) => handleUploadAsset(e.target.files?.[0], 'heyatLogoUrl')}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl border border-line bg-gold-soft text-gold flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm text-ink">دفترچه PDF کانون‌ها</h2>
                    <p className="text-xs text-ink-muted truncate">تا ۵۰ مگابایت (۱۰۰ صفحه)</p>
                  </div>
                </div>
                <label className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-ink inline-flex items-center gap-2 cursor-pointer hover:border-gold/50">
                  <Upload className="w-4 h-4 text-gold" />
                  <span>آپلود فایل PDF جدید</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => handleUploadAsset(e.target.files?.[0], 'cadresPdfUrl')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* فرم تنظیمات کامل */}
            <form onSubmit={handleSaveSettings} className="rounded-2xl border border-line bg-surface p-6 space-y-5">
              <h2 className="text-lg font-bold text-ink">تنظیمات عمومی، لینک کانال‌ها و ظاهر</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs text-ink-muted mb-1">عنوان سایت</label>
                  <input
                    type="text"
                    value={draftSettings.siteTitle}
                    onChange={(e) => setDraftSettings({ ...draftSettings, siteTitle: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted mb-1">رنگ تأکید (طلایی/کهربایی)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftSettings.accentColor}
                      onChange={(e) => setDraftSettings({ ...draftSettings, accentColor: e.target.value })}
                      className="h-[42px] w-14 rounded-lg border border-line bg-canvas cursor-pointer"
                    />
                    <input
                      type="text"
                      value={draftSettings.accentColor}
                      onChange={(e) => setDraftSettings({ ...draftSettings, accentColor: e.target.value })}
                      className="flex-1 min-h-[42px] rounded-xl border border-line bg-canvas px-3 font-mono text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-ink-muted mb-1">لینک تلگرام بسیج</label>
                  <input
                    type="url"
                    value={draftSettings.basijTelegramUrl}
                    onChange={(e) => setDraftSettings({ ...draftSettings, basijTelegramUrl: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted mb-1">لینک ایتا بسیج</label>
                  <input
                    type="url"
                    value={draftSettings.basijEitaaUrl}
                    onChange={(e) => setDraftSettings({ ...draftSettings, basijEitaaUrl: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted mb-1">لینک تلگرام هیئت</label>
                  <input
                    type="url"
                    value={draftSettings.heyatTelegramUrl}
                    onChange={(e) => setDraftSettings({ ...draftSettings, heyatTelegramUrl: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted mb-1">لینک ایتا هیئت</label>
                  <input
                    type="url"
                    value={draftSettings.heyatEitaaUrl}
                    onChange={(e) => setDraftSettings({ ...draftSettings, heyatEitaaUrl: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted mb-1">شماره‌های تماس</label>
                  <input
                    type="text"
                    value={draftSettings.contactPhones}
                    onChange={(e) => setDraftSettings({ ...draftSettings, contactPhones: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted mb-1">ساعت پاسخگویی</label>
                  <input
                    type="text"
                    value={draftSettings.responseHours}
                    onChange={(e) => setDraftSettings({ ...draftSettings, responseHours: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.urgentBannerEnabled}
                    onChange={(e) =>
                      setDraftSettings({ ...draftSettings, urgentBannerEnabled: e.target.checked })
                    }
                  />
                  <span>فعال‌سازی نوار اطلاعیه فوری در بالای کل سایت</span>
                </label>
                <input
                  type="text"
                  value={draftSettings.urgentBannerText}
                  onChange={(e) => setDraftSettings({ ...draftSettings, urgentBannerText: e.target.value })}
                  placeholder="متن اطلاعیه فوری..."
                  className="w-full min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="min-h-[44px] px-6 rounded-xl bg-gold text-[#071714] font-bold text-sm cursor-pointer"
                >
                  {savingSettings ? 'در حال ذخیره...' : 'ذخیره و انتشار تغییرات'}
                </button>

                {user.role === 'owner' && overview && (
                  <button
                    type="button"
                    onClick={handleClearDemo}
                    className="min-h-[44px] px-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف یکجای تمام داده‌های نمونه</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* تب ۲: دانشجویان و وعده‌های صبحانه */}
        {tab === 'students' && (
          <div className="space-y-6">
            {/* ورود گروهی CSV با پیش‌نمایش */}
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-gold" />
                    <span>ورود گروهی لیست نوورودی‌ها (CSV)</span>
                  </h2>
                  <p className="text-xs text-ink-muted mt-1">
                    ستون‌ها: نام، نام‌خانوادگی، تاریخ تولد شمسی (۱۳۸۷/۰۵/۲۰)، توضیحات. تاریخ تولد بلافاصله هش می‌شود و به صورت خام ذخیره نمی‌گردد.
                  </p>
                </div>
                <label className="min-h-[42px] px-4 rounded-xl bg-emerald-deep text-[#f4f1e8] text-xs font-bold inline-flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>انتخاب فایل CSV</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => handleCsvFile(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setCsvPreview(parseStudentsCsv(e.target.value));
                }}
                placeholder={'نام,نام‌خانوادگی,تاریخ تولد,توضیحات\nحسین,کریمی,۱۳۸۷/۰۴/۱۲,مهندسی کامپیوتر'}
                className="w-full rounded-xl border border-line bg-canvas p-3 text-xs font-mono text-ink"
              />

              {csvPreview && csvPreview.rows.length > 0 && (
                <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap gap-3 tabular-nums">
                      <span className="text-emerald-500 font-bold">
                        معتبر: {toPersianDigits(csvPreview.validCount)}
                      </span>
                      <span className="text-amber-500 font-bold">
                        تکراری: {toPersianDigits(csvPreview.duplicateCount)}
                      </span>
                      <span className="text-red-500 font-bold">
                        دارای خطا: {toPersianDigits(csvPreview.errorCount)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={csvPreview.validCount === 0}
                      onClick={handleImportCsvConfirm}
                      className="min-h-[38px] px-4 rounded-lg bg-gold text-[#071714] font-bold disabled:opacity-40 cursor-pointer"
                    >
                      تأیید و ثبت {toPersianDigits(csvPreview.validCount)} نفر
                    </button>
                  </div>

                  <div className="max-h-44 overflow-auto text-xs divide-y divide-line">
                    {csvPreview.rows.slice(0, 20).map((r) => (
                      <div key={r.rowNumber} className="py-1.5 flex items-center justify-between gap-2">
                        <span>
                          ردیف {toPersianDigits(r.rowNumber)}: {r.firstName} {r.lastName} ({toPersianDigits(r.birthJalali)})
                        </span>
                        <span className={r.valid ? 'text-emerald-500' : 'text-red-500'}>
                          {r.valid ? 'تأیید شده' : r.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* افزودن دستی دانشجو + مدیریت وعده‌ها */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleAddStudent} className="rounded-2xl border border-line bg-surface p-6 space-y-3.5">
                <h3 className="font-bold text-ink">افزودن دستی نوورود</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="نام"
                    value={newStu.firstName}
                    onChange={(e) => setNewStu({ ...newStu, firstName: e.target.value })}
                    className="min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                  <input
                    type="text"
                    required
                    placeholder="نام‌خانوادگی"
                    value={newStu.lastName}
                    onChange={(e) => setNewStu({ ...newStu, lastName: e.target.value })}
                    className="min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>
                <JalaliDatePicker
                  value={newStu.birthJalali}
                  onChange={(v) => setNewStu({ ...newStu, birthJalali: v })}
                  idPrefix="admin-stu-birth"
                />
                <input
                  type="text"
                  placeholder="توضیحات / رشته (اختیاری)"
                  value={newStu.note}
                  onChange={(e) => setNewStu({ ...newStu, note: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                />
                <button
                  type="submit"
                  className="w-full min-h-[42px] rounded-xl bg-gold text-[#071714] font-bold text-xs cursor-pointer"
                >
                  افزودن به لیست ژتون
                </button>
              </form>

              <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
                <h3 className="font-bold text-ink">مدیریت وعده‌های صبحانه</h3>
                <div className="space-y-2">
                  {meals.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-line bg-canvas p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-ink">{m.name}</p>
                        <p className="text-ink-muted tabular-nums">
                          {m.dateJalali} · {m.startTime} تا {m.endTime}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.toggleMealActive(m.id, !m.active);
                          if (user) loadTabData(user, 'students');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                          m.active
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-surface border border-line text-ink-muted'
                        }`}
                      >
                        {m.active ? 'فعال' : 'غیرفعال'}
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.addMeal({ ...newMeal, active: true });
                    setNewMeal({ name: '', dateJalali: '۱۴۰۵/۰۷/۰۴', startTime: '۰۷:۰۰', endTime: '۰۹:۳۰' });
                    if (user) loadTabData(user, 'students');
                  }}
                  className="grid grid-cols-2 gap-2 pt-2 border-t border-line"
                >
                  <input
                    type="text"
                    required
                    placeholder="عنوان وعده جدید"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    className="col-span-2 min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <input
                    type="text"
                    placeholder="تاریخ شمسی"
                    value={newMeal.dateJalali}
                    onChange={(e) => setNewMeal({ ...newMeal, dateJalali: e.target.value })}
                    className="min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] rounded-xl bg-emerald-deep text-[#f4f1e8] text-xs font-bold cursor-pointer"
                  >
                    افزودن وعده
                  </button>
                </form>
              </div>
            </div>

            {/* جدول لیست دانشجویان + چاپ گروهی کارت‌ها */}
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-ink tabular-nums">
                  فهرست دانشجویان ثبت‌شده ({toPersianDigits(students.length)} نفر)
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={stuQuery}
                    onChange={(e) => setStuQuery(e.target.value)}
                    placeholder="جستجو بر اساس نام..."
                    className="min-h-[38px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <button
                    type="button"
                    onClick={handlePreparePrintCards}
                    className="min-h-[38px] px-3.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-gold" />
                    <span>آماده‌سازی چاپ کارت‌های QR</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-right">
                  <thead>
                    <tr className="border-b border-line text-ink-muted">
                      <th className="py-2.5 px-2">نام و نام‌خانوادگی</th>
                      <th className="py-2.5 px-2">کد ژتون</th>
                      <th className="py-2.5 px-2">توضیحات</th>
                      <th className="py-2.5 px-2">وضعیت</th>
                      <th className="py-2.5 px-2">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-2 font-semibold text-ink">
                          {s.firstName} {s.lastName}
                          {s.isDemo && <span className="text-xs text-ink-muted mr-1">(نمونه)</span>}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-xs text-ink-muted">{s.couponCode}</td>
                        <td className="py-2.5 px-2 text-ink-muted">{s.note || '—'}</td>
                        <td className="py-2.5 px-2">
                          <span className={s.active ? 'text-emerald-500' : 'text-red-500'}>
                            {s.active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.toggleStudentActive(s.id, !s.active);
                              if (user) loadTabData(user, 'students');
                            }}
                            className="text-xs text-gold hover:underline cursor-pointer"
                          >
                            {s.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.deleteStudent(s.id);
                              if (user) loadTabData(user, 'students');
                            }}
                            className="text-xs text-red-500 hover:underline cursor-pointer"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* پیش‌نمایش چاپ کارت‌ها برای افراد بدون گوشی */}
            {printCards && (
              <div className="rounded-2xl border border-gold/40 bg-white text-black p-6 space-y-4">
                <div className="no-print flex items-center justify-between">
                  <h3 className="font-bold">نسخه چاپی کارت‌های QR ({toPersianDigits(printCards.length)} کارت)</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold cursor-pointer"
                    >
                      چاپ / ذخیره PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintCards(null)}
                      className="px-3 py-2 rounded-lg border text-xs cursor-pointer"
                    >
                      بستن
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {printCards.map((c) => (
                    <div key={c.code} className="border border-neutral-300 rounded-xl p-3 text-center">
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-[11px] text-neutral-600">{c.note}</p>
                      <img src={c.qr} alt={c.name} className="w-28 h-28 mx-auto my-2" />
                      <p className="font-mono text-[10px]">{c.code}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* تب ۳: گزارش‌های صبحانه */}
        {tab === 'reports' && report && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {report.meals.map((m) => {
                const pct = m.total > 0 ? Math.round((m.claimed / m.total) * 100) : 0;
                return (
                  <div key={m.id} className="rounded-2xl border border-line bg-surface p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-ink">{m.name}</h3>
                        <p className="text-xs text-ink-muted tabular-nums">{m.dateJalali}</p>
                      </div>
                      <a
                        href={`/api/admin/reports/breakfast.csv?mealId=${m.id}`}
                        className="px-3 py-1.5 rounded-lg border border-line bg-canvas text-xs text-gold font-semibold inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>خروجی Excel (CSV)</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-canvas p-3">
                        <div className="text-xl font-extrabold text-emerald-500 tabular-nums">
                          {toPersianDigits(m.claimed)}
                        </div>
                        <div className="text-ink-muted">دریافت کرده</div>
                      </div>
                      <div className="rounded-xl bg-canvas p-3">
                        <div className="text-xl font-extrabold text-gold tabular-nums">
                          {toPersianDigits(m.remaining)}
                        </div>
                        <div className="text-ink-muted">نگرفته</div>
                      </div>
                      <div className="rounded-xl bg-canvas p-3">
                        <div className="text-xl font-extrabold text-ink tabular-nums">
                          {toPersianDigits(pct)}٪
                        </div>
                        <div className="text-ink-muted">نرخ توزیع</div>
                      </div>
                    </div>

                    <div className="h-2.5 rounded-full bg-canvas overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>

                    {m.unclaimed.length > 0 && (
                      <div className="pt-2 border-t border-line">
                        <p className="text-xs font-semibold text-ink mb-2">
                          فهرست نگرفته‌ها ({toPersianDigits(m.unclaimed.length)} نفر):
                        </p>
                        <div className="max-h-32 overflow-y-auto text-xs text-ink-muted space-y-1">
                          {m.unclaimed.map((u) => (
                            <p key={u.id}>
                              {u.fullName} {u.note ? `(${u.note})` : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-6 space-y-3">
              <h3 className="font-bold text-ink">تلاش‌های مشکوک و دریافت مجدد</h3>
              {report.suspicious.length === 0 ? (
                <p className="text-xs text-ink-muted">مورد مشکوکی ثبت نشده است.</p>
              ) : (
                <div className="divide-y divide-line text-xs">
                  {report.suspicious.map((s) => (
                    <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="text-ink">{s.detail}</span>
                      <span className="text-ink-muted tabular-nums">{s.created_at}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* تب ۴: مدیریت محتوا (FAQ، اطلاعیه‌ها، پاسخ به سوالات دانشجویان) */}
        {tab === 'content' && (
          <div className="space-y-6">
            {/* صف سوالات نوورودی‌ها */}
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
              <h2 className="text-lg font-bold text-ink">
                صف سوالات دانشجویان ({toPersianDigits(questions.length)})
              </h2>
              {questions.length === 0 ? (
                <p className="text-xs text-ink-muted">سوال جدیدی ثبت نشده است.</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div key={q.id} className="rounded-xl border border-line bg-canvas p-4 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span>
                          {q.senderName} · {q.category}
                        </span>
                        <span className="text-gold">{q.status}</span>
                      </div>
                      <p className="font-semibold text-ink">{q.question}</p>
                      <textarea
                        rows={2}
                        value={answerDrafts[q.id] ?? q.answer}
                        onChange={(e) =>
                          setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder="پاسخ را اینجا بنویس..."
                        className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-ink"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await api.answerQuestion(q.id, answerDrafts[q.id] ?? q.answer, true);
                            showToast('پاسخ ثبت و مستقیم به سوالات متداول اضافه شد.', 'success');
                            if (user) loadTabData(user, 'content');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gold text-[#071714] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ذخیره و انتشار در FAQ</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* افزودن FAQ */}
              <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
                <h3 className="font-bold text-ink">مدیریت سوالات متداول</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.addFaq(newFaq);
                    setNewFaq({ category: 'ثبت‌نام', question: '', answer: '' });
                    showToast('سوال متداول جدید اضافه شد.', 'success');
                    if (user) loadTabData(user, 'content');
                  }}
                  className="space-y-3"
                >
                  <select
                    value={newFaq.category}
                    onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                    className="w-full min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  >
                    {['ثبت‌نام', 'خوابگاه', 'تغذیه و صبحانه', 'آموزش', 'بسیج و کانون‌ها', 'حمل‌ونقل و شهر'].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="متن سوال"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    className="w-full min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <textarea
                    rows={2}
                    required
                    placeholder="پاسخ دقیق"
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    className="w-full rounded-xl border border-line bg-canvas p-3 text-xs text-ink"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 rounded-xl bg-gold text-[#071714] text-xs font-bold cursor-pointer"
                  >
                    افزودن به FAQ
                  </button>
                </form>

                <div className="divide-y divide-line text-xs max-h-60 overflow-y-auto">
                  {faqs.map((f) => (
                    <div key={f.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{f.question}</p>
                        <p className="text-ink-muted">{f.category}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteFaq(f.id);
                          if (user) loadTabData(user, 'content');
                        }}
                        className="text-red-500 shrink-0 cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* افزودن اطلاعیه */}
              <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
                <h3 className="font-bold text-ink">مدیریت اطلاعیه‌ها</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.addAnnouncement(newAnn);
                    setNewAnn({
                      title: '',
                      summary: '',
                      body: '',
                      category: 'ثبت‌نام',
                      dateJalali: '۱۴۰۵/۰۷/۰۱',
                      eventTime: '۰۸:۰۰',
                      location: '',
                      pinned: false,
                    });
                    showToast('اطلاعیه منتشر شد.', 'success');
                    if (user) loadTabData(user, 'content');
                  }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="عنوان اطلاعیه"
                    value={newAnn.title}
                    onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                    className="w-full min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <input
                    type="text"
                    required
                    placeholder="خلاصه کوتاه"
                    value={newAnn.summary}
                    onChange={(e) => setNewAnn({ ...newAnn, summary: e.target.value })}
                    className="w-full min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="تاریخ شمسی"
                      value={newAnn.dateJalali}
                      onChange={(e) => setNewAnn({ ...newAnn, dateJalali: e.target.value })}
                      className="min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                    />
                    <input
                      type="text"
                      placeholder="مکان (اختیاری)"
                      value={newAnn.location}
                      onChange={(e) => setNewAnn({ ...newAnn, location: e.target.value })}
                      className="min-h-[40px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 rounded-xl bg-gold text-[#071714] text-xs font-bold cursor-pointer"
                  >
                    انتشار اطلاعیه
                  </button>
                </form>

                <div className="divide-y divide-line text-xs max-h-60 overflow-y-auto">
                  {announcements.map((a) => (
                    <div key={a.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{a.title}</p>
                        <p className="text-ink-muted">{a.dateJalali}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteAnnouncement(a.id);
                          if (user) loadTabData(user, 'content');
                        }}
                        className="text-red-500 shrink-0 cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تب ۵: لاگ امنیت و بازخوردها */}
        {tab === 'audit' && overview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-3">
              <h2 className="font-bold text-ink">ثبت وقایع حساس (Audit Log)</h2>
              <div className="divide-y divide-line text-xs max-h-96 overflow-y-auto">
                {overview.auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">
                        {log.username} · {log.action}
                      </p>
                      <p className="text-ink-muted">{log.detail}</p>
                    </div>
                    <span className="text-ink-muted tabular-nums shrink-0">{log.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setChangingPass(true);
                  try {
                    const res = await api.changePassword(curPass, nextPass);
                    showToast(res.message, 'success');
                    setCurPass('');
                    setNextPass('');
                    if (user) loadTabData(user, 'audit');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'خطا در تغییر رمز عبور', 'error');
                  } finally {
                    setChangingPass(false);
                  }
                }}
                className="rounded-2xl border border-gold/40 bg-surface p-6 space-y-3"
              >
                <h2 className="font-bold text-ink">تغییر رمز عبور حساب فعلی ({user.username})</h2>
                <p className="text-xs text-ink-muted leading-6">
                  پیش از راه‌اندازی رسمی حتماً رمز عبور پیش‌فرض را به یک رمز قوی (حداقل ۸ کاراکتر) تغییر دهید. پس از تغییر، سایر نشست‌های باز این حساب خودکار بسته می‌شوند.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    required
                    value={curPass}
                    onChange={(e) => setCurPass(e.target.value)}
                    placeholder="رمز عبور فعلی"
                    aria-label="رمز عبور فعلی"
                    className="min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={nextPass}
                    onChange={(e) => setNextPass(e.target.value)}
                    placeholder="رمز عبور جدید (حداقل ۸ کاراکتر)"
                    aria-label="رمز عبور جدید"
                    className="min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="min-h-[40px] px-4 rounded-xl bg-gold text-[#071714] font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {changingPass ? 'در حال ذخیره...' : 'ثبت رمز عبور جدید'}
                </button>
              </form>

              <div className="rounded-2xl border border-line bg-surface p-6 space-y-3">
                <h2 className="font-bold text-ink">پیام‌های تماس با ما</h2>
                {overview.messages.length === 0 ? (
                  <p className="text-xs text-ink-muted">پیامی ثبت نشده است.</p>
                ) : (
                  <div className="divide-y divide-line text-xs max-h-48 overflow-y-auto">
                    {overview.messages.map((m) => (
                      <div key={m.id} className="py-2.5 space-y-1">
                        <p className="font-semibold text-ink">
                          {m.sender_name} ({m.contact_info}) · {m.topic}
                        </p>
                        <p className="text-ink-muted">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-6 space-y-3">
                <h2 className="font-bold text-ink">نتایج نظرسنجی ناشناس</h2>
                {overview.surveys.length === 0 ? (
                  <p className="text-xs text-ink-muted">نظری ثبت نشده است.</p>
                ) : (
                  <div className="divide-y divide-line text-xs max-h-48 overflow-y-auto">
                    {overview.surveys.map((s) => (
                      <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-ink">
                          ثبت‌نام: {toPersianDigits(s.registration_score)}/۵ · صبحانه:{' '}
                          {toPersianDigits(s.breakfast_score)}/۵ {s.comment ? `— ${s.comment}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* پنجره دانلود و اشتراک‌گذاری تضمینی فایل آفلاین HTML (سازگار با موبایل و پیش‌نمایش iframe) */}
      {readyExport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-export-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setReadyExport(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-gold/40 bg-surface p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>بسته‌بندی فایل آفلاین کامل شد</span>
                </span>
                <h2 id="offline-export-modal-title" className="text-lg font-extrabold text-ink">
                  فایل HTML کاملاً آفلاین آماده دریافت است
                </h2>
                <p className="text-xs text-ink-muted">
                  نام فایل: <span dir="ltr" className="font-mono text-ink">{readyExport.filename}</span> · حجم:{' '}
                  <strong className="text-gold tabular-nums">{toPersianDigits(readyExport.sizeKb)} کیلوبایت</strong>
                </p>
              </div>
              <button
                type="button"
                aria-label="بستن پنجره دانلود"
                onClick={() => setReadyExport(null)}
                className="p-2 rounded-xl border border-line text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-ink-muted leading-6">
              اگر دانلود خودکار داخل محیط پیش‌نمایش (iframe) گوشی شما مسدود شده است، روی دکمه طلایی زیر بزنید تا در تب جدید دانلود شود، یا{' '}
              <strong className="text-gold">لینک مستقیم دانلود</strong> را کپی کرده و در نوار آدرس کروم باز کنید (اعتبار لینک: ۱۵ دقیقه):
            </p>

            <div className="space-y-2.5">
              {/* روش ۱: باز شدن در تب اصلی مرورگر (بدون ویژگی download تا کروم محدودیت iframe را دور بزند و فایل را از هدر سرور ذخیره کند) */}
              <a
                href={readyExport.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] px-4 rounded-2xl bg-gold text-[#071714] hover:opacity-95 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-gold/15 transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span>دانلود مستقیم فایل در تب جدید ({toPersianDigits(readyExport.sizeKb)} KB)</span>
              </a>

              {/* روش ۲: کپی لینک مستقیم دانلود (تضمینی حتی اگر پیش‌نمایش هرگونه دانلود و پاپ‌آپ را بسته باشد) */}
              <div className="rounded-xl border border-line bg-canvas p-2.5 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  aria-label="لینک مستقیم دانلود فایل آفلاین"
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}${readyExport.downloadUrl}`
                      : readyExport.downloadUrl
                  }
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-ink-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const fullUrl =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${readyExport.downloadUrl}`
                        : readyExport.downloadUrl;
                    try {
                      await navigator.clipboard.writeText(fullUrl);
                      showToast('لینک مستقیم دانلود کپی شد! در تب جدید کروم Paste کنید تا فایل فوری دانلود شود.', 'success');
                    } catch {
                      showToast('لینک داخل کادر را انتخاب و کپی کنید و در کروم باز کنید.', 'error');
                    }
                  }}
                  className="shrink-0 min-h-[34px] px-3 rounded-lg bg-surface border border-gold/40 hover:border-gold text-xs font-bold text-gold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی لینک</span>
                </button>
              </div>

              {/* روش ۳: اشتراک مستقیم فایل به ایتا/تلگرام/بله در گوشی */}
              <button
                type="button"
                onClick={handleShareOfflineFile}
                className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4 text-gold" />
                <span>ارسال مستقیم فایل به ایتا / تلگرام / بله (موبایل)</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <a
                  href={readyExport.blobUrl}
                  download={readyExport.filename}
                  className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-gold" />
                  <span>ذخیره محلی</span>
                </a>
                <a
                  href={readyExport.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gold" />
                  <span>پیش‌نمایش زنده</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyOfflineHtml}
                  className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-gold" />
                  <span>کپی کد HTML</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
