import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Coffee,
  Download,
  ExternalLink,
  FileDown,
  IdCard,
  Lock,
  LogOut,
  PlusCircle,
  Printer,
  QrCode,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api/client';
import { COHORT_GROUP_OPTIONS, normalizeStudentNumber, validateStudentNumber } from '../utils/studentValidation';
import { toPersianDigits } from '../utils/persian';
import { formatJalaliTime } from '../utils/jalali';
import type { AdminUser, CohortGroup, DeskAuthorizedStudent } from '../types/portal';

export const DeskPage: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [studentNumber, setStudentNumber] = useState('');
  const [cohortGroup, setCohortGroup] = useState<CohortGroup>('نوورود ۱۴۰۵');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [searchQ, setSearchQ] = useState('');
  const [items, setItems] = useState<DeskAuthorizedStudent[]>([]);
  const [stats, setStats] = useState({ total: 0, pendingForm: 0, registered: 0, claimed: 0 });
  const [canAuthorizeNon405, setCanAuthorizeNon405] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  // وضعیت ساخت فایل چاپی پوستر A4 و ۴ تراکت تبلیغاتی دانشگاه
  const [posterSiteUrl, setPosterSiteUrl] = useState(() =>
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://gonabad.ac.ir'
  );
  const [posterLoadingMode, setPosterLoadingMode] = useState<'html' | 'pdf' | null>(null);
  const [posterError, setPosterError] = useState('');
  const [posterReady, setPosterReady] = useState<{
    filename: string;
    sizeKb: number;
    downloadUrl: string;
    previewUrl: string;
    mode: 'html' | 'pdf';
  } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const playTone = useCallback(
    (ok: boolean) => {
      if (navigator.vibrate) {
        navigator.vibrate(ok ? [70] : [130, 60, 130]);
      }
      if (!soundEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = ok ? 920 : 240;
        gain.gain.value = 0.12;
        osc.start();
        osc.stop(ctx.currentTime + (ok ? 0.14 : 0.28));
      } catch {
        // ignore audio restriction
      }
    },
    [soundEnabled]
  );

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    try {
      const res = await api.getDeskAuthorized(q);
      setItems(res.items);
      setStats(res.stats);
      setCanAuthorizeNon405(res.canAuthorizeNon405);
    } catch {
      // ignore transient network issue
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    api
      .getMe()
      .then((u) => {
        if (u && (u.role === 'desk' || u.role === 'owner')) {
          setUser(u);
          fetchList('');
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [fetchList]);

  useEffect(() => {
    if (!user) return;
    const t = window.setTimeout(() => {
      fetchList(searchQ);
    }, 220);
    return () => window.clearTimeout(t);
  }, [searchQ, user, fetchList]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const u = await api.login(username, password);
      if (u.role !== 'desk' && u.role !== 'owner') {
        setLoginError('این حساب کاربری مجوز ورود به پنل میز استقبال لابی را ندارد.');
        return;
      }
      setUser(u);
      fetchList('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const isOwner = user?.role === 'owner';
    const check = validateStudentNumber(studentNumber, { require405: !isOwner });
    if (!check.valid) {
      setFeedback({ tone: 'error', text: check.error || 'شماره دانشجویی معتبر نیست.' });
      playTone(false);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.authorizeStudentNumber({
        studentNumber: check.normalized,
        cohortGroup: isOwner ? (check.is405 ? cohortGroup : cohortGroup === 'نوورود ۱۴۰۵' ? 'انجمن علمی' : cohortGroup) : 'نوورود ۱۴۰۵',
        note: note.trim(),
      });
      setFeedback({ tone: 'success', text: res.message });
      playTone(true);
      setStudentNumber('');
      setNote('');
      await fetchList(searchQ);
      inputRef.current?.focus();
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'خطا در تایید شماره دانشجویی',
      });
      playTone(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTypo = async (id: number) => {
    try {
      await api.deleteDeskAuthorized(id);
      setFeedback({ tone: 'success', text: 'کد ثبت‌نشده با موفقیت حذف شد.' });
      await fetchList(searchQ);
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'امکان حذف این کد وجود ندارد.',
      });
    }
  };

  const handleGenerateCampusPoster = async (mode: 'html' | 'pdf') => {
    setPosterError('');
    setPosterLoadingMode(mode);
    try {
      const res = await api.createDeskPosterToken({
        siteUrl: posterSiteUrl.trim(),
        autoPrint: mode === 'pdf',
      });
      setPosterReady({
        filename: res.filename,
        sizeKb: res.sizeKb,
        downloadUrl: res.downloadUrl,
        previewUrl: res.previewUrl,
        mode,
      });

      // در مرورگر عادی دانلود خودکار فایل HTML یا باز شدن پیش‌نمایش چاپ را آغاز می‌کنیم
      if (mode === 'html') {
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setPosterError(
        err instanceof Error ? err.message : 'خطا در تولید فایل پوستر و تراکت قابل چاپ.'
      );
    } finally {
      setPosterLoadingMode(null);
    }
  };

  const liveNorm = normalizeStudentNumber(studentNumber);
  const liveStarts405 = liveNorm.startsWith('405');
  const liveHasPrefixWarning =
    user?.role === 'desk' && liveNorm.length >= 3 && !liveStarts405;

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink text-sm">
        در حال بررسی نشست میز استقبال...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 space-y-5">
          <div>
            <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
              <IdCard className="w-4 h-4" />
              <span>پنل اپراتور میز استقبال لابی</span>
            </p>
            <h1 className="text-2xl font-extrabold text-ink mt-1">ثبت شماره دانشجویی ۴۰۵</h1>
            <p className="text-xs text-ink-muted mt-1 leading-6">
              مخصوص خادم مستقر در میز هیئت در لابی برای تایید سریع شماره دانشجویی ورودی ۱۴۰۵ (شروع با ۴۰۵).
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="desk-user" className="block text-xs text-ink-muted mb-1">
                نام کاربری
              </label>
              <input
                id="desk-user"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="desk-pass" className="block text-xs text-ink-muted mb-1">
                رمز عبور
              </label>
              <input
                id="desk-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
              />
            </div>

            {loginError && (
              <p role="alert" className="text-xs text-red-500 font-medium">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-gold text-[#071714] font-extrabold text-sm cursor-pointer"
            >
              ورود به پنل میز استقبال
            </button>
          </form>

          <div className="rounded-xl border border-line bg-canvas p-3 text-xs text-ink-muted leading-6">
            دسترسی این پنل به ثبت کدهای ورودی ۱۴۰۵ محدود است. اطلاعات کاربری خود را از مدیر سامانه دریافت کنید.
          </div>

          <Link to="/" className="block text-center text-xs text-gold hover:underline">
            بازگشت به پرتال نوورودی‌ها
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink pb-12">
      {/* هدر فشرده میز استقبال */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold text-ink flex items-center gap-2">
              <IdCard className="w-5 h-5 text-gold" />
              <span>پنل میز استقبال لابی</span>
            </h1>
            <p className="text-xs text-ink-muted">
              {user.displayName} ·{' '}
              {canAuthorizeNon405 ? 'دسترسی مدیریت کل (همه ورودی‌ها)' : 'فقط ورودی ۱۴۰۵ (شروع با ۴۰۵)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'owner' && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1 min-h-[38px] px-3 rounded-xl border border-line bg-canvas text-xs text-gold font-semibold"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>پنل مدیریت</span>
              </Link>
            )}
            <button
              type="button"
              aria-label={soundEnabled ? 'قطع صدای تایید' : 'روشن کردن صدای تایید'}
              onClick={() => setSoundEnabled((v) => !v)}
              className="min-h-[38px] min-w-[38px] rounded-xl border border-line bg-canvas flex items-center justify-center cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-gold" />
              ) : (
                <VolumeX className="w-4 h-4 text-ink-muted" />
              )}
            </button>
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

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        {/* نوار آمار زنده میز استقبال */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="text-2xl font-extrabold text-gold tabular-nums">
              {toPersianDigits(stats.total)}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">کل کدهای تاییدشده</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="text-2xl font-extrabold text-ink tabular-nums">
              {toPersianDigits(stats.pendingForm)}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">منتظر تکمیل فرم</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <div className="text-2xl font-extrabold text-emerald-500 tabular-nums">
              {toPersianDigits(stats.registered)}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">ژتون صادر شده</div>
          </div>
          <div className="rounded-2xl border border-gold/30 bg-gold-soft/50 p-3.5">
            <div className="text-2xl font-extrabold text-gold tabular-nums">
              {toPersianDigits(stats.claimed)}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">صبحانه تحویل گرفته</div>
          </div>
        </div>

        {/* فرم ثبت سریع شماره دانشجویی */}
        <section className="rounded-3xl border border-gold/40 bg-surface p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-ink">
                ثبت سریع شماره دانشجویی در صف استقبال
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                به‌محض ثبت، شماره دانشجویی برای دانشجو در صفحه «ژتون صبحانه» سبز می‌شود.
              </p>
            </div>
            {!canAuthorizeNon405 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/12 border border-amber-500/35 text-amber-500 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>محدود به کدهای ۴۰۵</span>
              </span>
            )}
          </div>

          <form onSubmit={handleAuthorize} className="space-y-3.5">
            <div>
              <label htmlFor="desk-student-number" className="block text-xs font-semibold text-ink-muted mb-1.5">
                شماره دانشجویی ({canAuthorizeNon405 ? '۴۰۵ یا سایر ورودی‌های انجمن و کانون' : 'فقط شروع با ۴۰۵'})
              </label>
              <input
                ref={inputRef}
                id="desk-student-number"
                data-testid="desk-student-number-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                autoFocus
                required
                value={studentNumber}
                onChange={(e) => {
                  setStudentNumber(e.target.value);
                  setFeedback(null);
                }}
                placeholder="4051232173"
                className={`w-full min-h-[58px] rounded-2xl border bg-canvas px-4 text-2xl font-mono font-extrabold text-center tracking-widest text-ink transition-colors ${
                  liveHasPrefixWarning
                    ? 'border-red-500 ring-2 ring-red-500/25'
                    : liveNorm.length >= 8 && (liveStarts405 || canAuthorizeNon405)
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-line focus:border-gold'
                }`}
              />
              {liveHasPrefixWarning && (
                <p className="mt-1.5 text-xs text-red-500 font-semibold">
                  کد واردشده با ۴۰۵ شروع نمی‌شود! اپراتور میز استقبال فقط مجاز به ثبت نوورودی‌های ۱۴۰۵ است.
                </p>
              )}
            </div>

            {canAuthorizeNon405 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="desk-cohort" className="block text-xs text-ink-muted mb-1">
                    گروه / ورودی (اختصاصی مدیریت کل)
                  </label>
                  <select
                    id="desk-cohort"
                    value={cohortGroup}
                    onChange={(e) => setCohortGroup(e.target.value as CohortGroup)}
                    className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  >
                    {COHORT_GROUP_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="desk-note" className="block text-xs text-ink-muted mb-1">
                    یادداشت اختیاری (مثلاً نام انجمن/کانون)
                  </label>
                  <input
                    id="desk-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثلاً: انجمن علمی برق"
                    className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>
              </div>
            )}

            {feedback && (
              <div
                role="status"
                data-testid="desk-feedback-banner"
                className={`rounded-2xl border p-3.5 text-sm font-bold flex items-center gap-2.5 ${
                  feedback.tone === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
                    : 'border-red-500/50 bg-red-500/12 text-red-500'
                }`}
              >
                <BadgeCheck className="w-5 h-5 shrink-0" />
                <span>{feedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="desk-authorize-btn"
              disabled={submitting || liveHasPrefixWarning}
              className="btn-sheen w-full min-h-[54px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{submitting ? 'در حال ثبت...' : 'تایید و سبز کردن شماره دانشجویی'}</span>
            </button>
          </form>
        </section>

        {/* بسته تبلیغاتی و اطلاع‌رسانی چاپی دانشگاه (پوستر A4 + برگه ۴ تراکت برش‌دار) */}
        <section
          aria-labelledby="desk-poster-heading"
          className="gold-top-accent relative rounded-3xl border border-gold/40 bg-surface p-5 sm:p-6 space-y-4 overflow-hidden"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>بسته چاپی تبلیغاتی میز استقبال و سطح دانشگاه</span>
              </p>
              <h2 id="desk-poster-heading" className="text-base sm:text-lg font-extrabold text-ink">
                دانلود پوستر A4 و ۴ تراکت برش‌دار QR (ژتون صبحانه و پرتال نوورودی‌ها)
              </h2>
              <p className="text-xs text-ink-muted leading-6">
                یک فایل HTML کاملاً آفلاین و گرافیکی با فونت وزیرمتن، لوگوهای رسمی بسیج و هیئت و دو کد QR وکتور (مستقیم صفحه ژتون و صفحه اصلی پرتال). صفحه اول پوستر A4 دیواری/رومیزی و صفحه دوم ۴ تراکت برش‌دار برای پخش در محوطه دانشگاه و خوابگاه‌ها است.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gold-soft border border-gold/30 text-gold">
                <QrCode className="w-3.5 h-3.5" />
                <span>۲ کد QR وکتور</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-500">
                <Scissors className="w-3.5 h-3.5" />
                <span>پوستر A4 + ۴ تراکت</span>
              </span>
            </div>
          </div>

          {/* آدرس سایت درج‌شده درون QR */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label
                htmlFor="desk-poster-url"
                className="block text-xs font-semibold text-ink-muted mb-1"
              >
                آدرس سایت برای تولید QR (دامنه واقعی دانشگاه یا آدرس فعلی)
              </label>
              <input
                id="desk-poster-url"
                data-testid="desk-poster-url-input"
                type="url"
                dir="ltr"
                value={posterSiteUrl}
                onChange={(e) => setPosterSiteUrl(e.target.value)}
                placeholder="https://portal.gonabad.ac.ir"
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-xs sm:text-sm font-mono text-ink"
              />
            </div>

            <div className="md:col-span-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                data-testid="desk-poster-download-btn"
                disabled={posterLoadingMode !== null}
                onClick={() => handleGenerateCampusPoster('html')}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-gold text-[#071714] hover:opacity-95 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <FileDown className="w-4 h-4 shrink-0" />
                <span>
                  {posterLoadingMode === 'html'
                    ? 'در حال ساخت فایل...'
                    : 'دانلود فایل HTML پوستر و تراکت'}
                </span>
              </button>

              <button
                type="button"
                data-testid="desk-poster-pdf-btn"
                disabled={posterLoadingMode !== null}
                onClick={() => handleGenerateCampusPoster('pdf')}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-gold/45 bg-gold-soft/50 hover:bg-gold-soft text-gold font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>
                  {posterLoadingMode === 'pdf'
                    ? 'در حال آماده‌سازی چاپ...'
                    : 'چاپ مستقیم / ذخیره PDF'}
                </span>
              </button>
            </div>
          </div>

          {posterError && (
            <p role="alert" className="text-xs font-bold text-red-500">
              {posterError}
            </p>
          )}

          {posterReady && (
            <div
              data-testid="desk-poster-ready-bar"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-500">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    فایل چاپی آماده شد ({toPersianDigits(posterReady.sizeKb)} کیلوبایت · کاملاً آفلاین)
                  </span>
                </div>
                <span dir="ltr" className="text-[11px] font-mono text-ink-muted">
                  {posterReady.filename}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={posterReady.downloadUrl}
                  download={posterReady.filename}
                  data-testid="desk-poster-direct-download-link"
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود مستقیم فایل (.html)</span>
                </a>
                <a
                  href={posterReady.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="desk-poster-preview-link"
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl border border-gold/45 bg-surface hover:bg-gold-soft text-gold font-bold text-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>باز کردن پیش‌نمایش و چاپ / Save as PDF در تب جدید</span>
                </a>
              </div>

              <p className="text-[11px] text-ink-muted leading-5">
                نکته چاپ رنگی حرفه‌ای: در پنجره چاپ مرورگر (Ctrl+P)، اندازه کاغذ را <strong>A4</strong>، حاشیه را <strong>None</strong> و تیک گزینه <strong>Background graphics / پس‌زمینه گرافیکی</strong> را روشن بگذارید. از نوار بالای فایل می‌توانید انتخاب کنید «هر دو صفحه»، «فقط پوستر A4» یا «فقط برگه ۴ تراکت» چاپ شود.
              </p>
            </div>
          )}
        </section>

        {/* فهرست زنده کدهای ثبت‌شده */}
        <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-ink">
              لیست زنده شماره دانشجویی‌های ثبت‌شده ({toPersianDigits(items.length)})
            </h2>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="جستجوی شماره یا نام..."
                  className="w-full min-h-[40px] rounded-xl border border-line bg-canvas pr-9 pl-3 text-xs text-ink"
                />
              </div>
              <button
                type="button"
                aria-label="به‌روزرسانی لیست"
                onClick={() => fetchList(searchQ)}
                className="min-h-[40px] min-w-[40px] rounded-xl border border-line bg-canvas flex items-center justify-center text-ink-muted hover:text-gold cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-center py-8 text-xs text-ink-muted">
              هنوز شماره دانشجویی ثبت نشده است.
            </p>
          ) : (
            <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-canvas/70 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        dir="ltr"
                        className="font-mono text-sm font-extrabold text-ink tracking-wider"
                      >
                        {toPersianDigits(item.studentNumber)}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-line text-[11px] font-semibold text-gold">
                        {item.cohortGroup}
                      </span>
                      {item.isDemo && (
                        <span className="text-[10px] text-ink-muted">(نمونه)</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted">
                      {item.fullName ? (
                        <>
                          <strong className="text-ink">{item.fullName}</strong>
                          {item.major ? ` · ${item.major}` : ''}
                        </>
                      ) : (
                        'هنوز دانشجو فرم مشخصات را تکمیل نکرده است'
                      )}
                      {item.authorizedAt ? ` · ثبت: ${formatJalaliTime(item.authorizedAt)}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.hasClaimed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 text-xs font-bold">
                        <Coffee className="w-3.5 h-3.5" />
                        <span>صبحانه تحویل گرفت</span>
                      </span>
                    ) : item.registrationStatus === 'registered' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gold-soft border border-gold/35 text-gold text-xs font-bold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ژتون صادر شد</span>
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-line text-ink-muted text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>منتظر تکمیل فرم</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTypo(item.id)}
                          aria-label={`حذف کد اشتباه ${item.studentNumber}`}
                          title="حذف اشتباه تایپی (پیش از تکمیل فرم)"
                          className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
