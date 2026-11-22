import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  LogOut,
  Search,
  Volume2,
  VolumeX,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api/client';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { formatJalaliTime } from '../utils/jalali';
import { normalizeNameCompact, toPersianDigits } from '../utils/persian';
import { normalizeStudentNumber } from '../utils/studentValidation';
import { checkSingleBreakfastEligibility, findStudentExistingClaim } from '../utils/coupon';
import type {
  AdminUser,
  MealItem,
  OfflinePendingClaim,
  OfflineScanStudent,
  ScanClaimResponse,
} from '../types/portal';

const CACHE_STUDENTS_KEY = 'gonabad_scanner_students_v1';
const CACHE_MEALS_KEY = 'gonabad_scanner_meals_v1';
const QUEUE_KEY = 'gonabad_scanner_offline_queue_v1';

export const ScannerPage: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [meals, setMeals] = useState<MealItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_MEALS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [selectedMealId, setSelectedMealId] = useState<number>(0);
  const [cachedStudents, setCachedStudents] = useState<OfflineScanStudent[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_STUDENTS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [pendingQueue, setPendingQueue] = useState<OfflinePendingClaim[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [overlay, setOverlay] = useState<ScanClaimResponse | null>(null);
  const [syncing, setSyncing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });

  const playFeedbackTone = useCallback(
    (status: 'allowed' | 'already_claimed' | 'invalid') => {
      if (navigator.vibrate) {
        navigator.vibrate(status === 'allowed' ? [80] : [140, 80, 140]);
      }
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = status === 'allowed' ? 880 : status === 'already_claimed' ? 320 : 210;
        gain.gain.value = 0.14;
        osc.start();
        osc.stop(ctx.currentTime + (status === 'allowed' ? 0.16 : 0.3));
      } catch {
        // در برخی مرورگرها نیاز به تعامل قبلی کاربر است
      }
    },
    [soundEnabled]
  );

  const refreshData = useCallback(async () => {
    try {
      const [mList, sRes] = await Promise.all([api.getScanMeals(), api.getScanList()]);
      setMeals(mList);
      localStorage.setItem(CACHE_MEALS_KEY, JSON.stringify(mList));
      setCachedStudents(sRes.students);
      localStorage.setItem(CACHE_STUDENTS_KEY, JSON.stringify(sRes.students));
      if (mList.length > 0) {
        setSelectedMealId((prev) => prev || mList.find((m) => m.active)?.id || mList[0].id);
      }
    } catch {
      // استفاده از لیست آفلاین کش‌شده
    }
  }, []);

  useEffect(() => {
    api
      .getMe()
      .then((u) => {
        if (u && ['owner', 'food_manager', 'scanner'].includes(u.role)) {
          setUser(u);
          refreshData();
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [refreshData]);

  // همگام‌سازی خودکار صف آفلاین هنگام بازگشت اینترنت
  const syncQueue = useCallback(async () => {
    if (!isOnline || pendingQueue.length === 0 || syncing) return;
    setSyncing(true);
    try {
      await api.syncOfflineClaims(pendingQueue);
      setPendingQueue([]);
      localStorage.setItem(QUEUE_KEY, '[]');
      await refreshData();
    } catch {
      // در تلاش بعدی دوباره همگام می‌شود
    } finally {
      setSyncing(false);
    }
  }, [isOnline, pendingQueue, syncing, refreshData]);

  useEffect(() => {
    if (isOnline && user && pendingQueue.length > 0) {
      syncQueue();
    }
  }, [isOnline, user, pendingQueue.length, syncQueue]);

  // ثبت دریافت صبحانه (آنلاین یا آفلاین)
  const processCouponCode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || !selectedMealId) return;

      // جلوگیری از اسکن تکراری تصادفی زیر ۲ ثانیه
      const now = Date.now();
      if (lastScanRef.current.code === code && now - lastScanRef.current.ts < 2200) {
        return;
      }
      lastScanRef.current = { code, ts: now };

      const mealName = meals.find((m) => m.id === selectedMealId)?.name || 'وعده صبحانه';

      if (isOnline) {
        try {
          const result = await api.claimScan(code, selectedMealId);
          setOverlay(result);
          playFeedbackTone(result.status);
          // به‌روزرسانی کش محلی برای سازگاری با جستجوی دستی
          if (result.status === 'allowed' && result.claimedAt) {
            setCachedStudents((prev) => {
              const updated = prev.map((s) =>
                s.couponCode === code
                  ? {
                      ...s,
                      claimedAtByMeal: {
                        ...s.claimedAtByMeal,
                        [selectedMealId]: result.claimedAt!,
                      },
                    }
                  : s
              );
              localStorage.setItem(CACHE_STUDENTS_KEY, JSON.stringify(updated));
              return updated;
            });
          }
          return;
        } catch {
          // افتادن روی مسیر آفلاین در صورت قطع ناگهانی شبکه
        }
      }

      // حالت آفلاین: بررسی روی کش محلی و افزودن به صف همگام‌سازی
      const stu = cachedStudents.find((s) => s.couponCode === code);
      if (!stu || !stu.active || stu.registrationStatus === 'authorized') {
        const res: ScanClaimResponse = {
          status: 'invalid',
          message:
            stu?.registrationStatus === 'authorized'
              ? 'این دانشجو هنوز فرم مشخصات را در صفحه ژتون صبحانه تکمیل نکرده است.'
              : 'نامعتبر یا غیرفعال (آفلاین)',
        };
        setOverlay(res);
        playFeedbackTone('invalid');
        return;
      }

      const studentName = `${stu.firstName} ${stu.lastName}`;
      const eligibility = checkSingleBreakfastEligibility(stu.claimedAtByMeal, selectedMealId);
      if (!eligibility.allowed) {
        const prevMeal = meals.find((m) => m.id === eligibility.existingMealId);
        const prevMealTitle = prevMeal?.name || 'وعده قبلی';
        const res: ScanClaimResponse = {
          status: 'already_claimed',
          message:
            eligibility.reason === 'already_claimed_same_meal'
              ? 'قبلاً در همین وعده دریافت کرده (حالت آفلاین)'
              : `قبلاً در «${prevMealTitle}» صبحانه دریافت کرده — سهمیه هر نوورودی فقط یک نوبت در کل روزهای ثبت‌نام است (حالت آفلاین)`,
          studentName,
          studentNumber: stu.studentNumber || undefined,
          major: stu.major || undefined,
          cohortGroup: stu.cohortGroup || undefined,
          claimedAt: eligibility.existingClaimedAtIso,
          mealName: prevMealTitle,
          previousMealName: prevMealTitle,
          claimedDateJalali: prevMeal?.dateJalali,
        };
        setOverlay(res);
        playFeedbackTone('already_claimed');
        return;
      }

      const nowIso = new Date().toISOString();
      const nextStudents = cachedStudents.map((s) =>
        s.id === stu.id
          ? { ...s, claimedAtByMeal: { ...s.claimedAtByMeal, [selectedMealId]: nowIso } }
          : s
      );
      setCachedStudents(nextStudents);
      localStorage.setItem(CACHE_STUDENTS_KEY, JSON.stringify(nextStudents));

      const nextQueue: OfflinePendingClaim[] = [
        ...pendingQueue,
        {
          localId: `${stu.id}-${selectedMealId}-${Date.now()}`,
          couponCode: code,
          mealId: selectedMealId,
          scannedAtIso: nowIso,
          studentName,
        },
      ];
      setPendingQueue(nextQueue);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(nextQueue));

      setOverlay({
        status: 'allowed',
        message: 'مجاز — ثبت در صف آفلاین',
        studentName,
        studentNumber: stu.studentNumber || undefined,
        major: stu.major || undefined,
        cohortGroup: stu.cohortGroup || undefined,
        claimedAt: nowIso,
        mealName,
      });
      playFeedbackTone('allowed');
    },
    [selectedMealId, meals, isOnline, cachedStudents, pendingQueue, playFeedbackTone]
  );

  // کنترل دوربین QR
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const qr = new Html5Qrcode('qr-reader-region');
      scannerRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          processCouponCode(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch {
      setCameraError(
        'دسترسی به دوربین میسر نشد. می‌توانید از جستجوی دستی نام دانشجو یا ورود کد استفاده کنید.'
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const u = await api.login(username, password);
      if (!['owner', 'food_manager', 'scanner'].includes(u.role)) {
        setLoginError('این حساب کاربری مجوز اسکنر صبحانه ندارد.');
        return;
      }
      setUser(u);
      refreshData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    }
  };

  const handleLogout = async () => {
    await stopCamera();
    await api.logout().catch(() => {});
    setUser(null);
  };

  const liveStats = useMemo(() => {
    const activeStudents = cachedStudents.filter((s) => s.active);
    const claimedToday = activeStudents.filter((s) => Boolean(s.claimedAtByMeal[selectedMealId])).length;
    const claimedAnyDay = activeStudents.filter((s) => Boolean(findStudentExistingClaim(s.claimedAtByMeal))).length;
    return {
      total: activeStudents.length,
      claimed: claimedToday,
      remaining: Math.max(0, activeStudents.length - claimedAnyDay),
    };
  }, [cachedStudents, selectedMealId]);

  const manualMatches = useMemo(() => {
    const q = normalizeNameCompact(searchName);
    const numQ = normalizeStudentNumber(searchName);
    if ((!q || q.length < 2) && (!numQ || numQ.length < 3)) return [];
    return cachedStudents
      .filter((s) => {
        if (s.registrationStatus === 'authorized') return false;
        const nameMatch = q.length >= 2 && (s.firstNameNorm + s.lastNameNorm).includes(q);
        const idMatch = numQ.length >= 3 && Boolean(s.studentNumber && s.studentNumber.includes(numQ));
        return nameMatch || idMatch;
      })
      .slice(0, 8);
  }, [cachedStudents, searchName]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink text-sm">
        در حال بررسی نشست اسکنر...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gold">اپلیکیشن اسکنر پخش صبحانه</p>
            <h1 className="text-2xl font-extrabold text-ink mt-1">ورود مسئول پخش</h1>
            <p className="text-xs text-ink-muted mt-1">
              ویژه نقش‌های مسئول پخش، مدیر تغذیه و مدیر کل سامانه.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="scan-user" className="block text-xs text-ink-muted mb-1">
                نام کاربری
              </label>
              <input
                id="scan-user"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="scan-pass" className="block text-xs text-ink-muted mb-1">
                رمز عبور
              </label>
              <input
                id="scan-pass"
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
              className="w-full min-h-[46px] rounded-xl bg-gold text-[#071714] font-bold text-sm cursor-pointer"
            >
              ورود به اسکنر
            </button>
          </form>

          <div className="rounded-xl border border-line bg-canvas p-3 text-xs text-ink-muted leading-6">
            ورود مخصوص مسئولان پخش صبحانه هیئت است. نام کاربری و رمز عبور خود را از مسئول تغذیه یا مدیر سامانه دریافت کنید.
          </div>

          <Link to="/" className="block text-center text-xs text-gold hover:underline">
            بازگشت به صفحه اصلی پرتال
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink pb-10">
      {/* هدر فشرده اسکنر */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-ink">اسکنر پخش صبحانه</h1>
            <p className="text-xs text-ink-muted">
              {user.displayName} · {isOnline ? 'متصل' : 'حالت آفلاین'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={soundEnabled ? 'قطع صدای اسکن' : 'روشن کردن صدای اسکن'}
              onClick={() => setSoundEnabled((v) => !v)}
              className="min-h-[40px] min-w-[40px] rounded-xl border border-line bg-canvas flex items-center justify-center cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-gold" /> : <VolumeX className="w-4 h-4 text-ink-muted" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[40px] px-3 rounded-xl border border-line bg-canvas text-xs text-ink inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* انتخاب وعده و شمارنده زنده */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="scanner-meal" className="text-xs font-semibold text-ink-muted">
              وعده فعال:
            </label>
            <select
              id="scanner-meal"
              value={selectedMealId}
              onChange={(e) => setSelectedMealId(Number(e.target.value))}
              className="flex-1 min-h-[42px] rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
            >
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.dateJalali})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl bg-emerald-500/12 border border-emerald-500/30 p-3">
              <div className="text-2xl font-extrabold text-emerald-500 tabular-nums">
                {toPersianDigits(liveStats.claimed)}
              </div>
              <div className="text-xs text-ink-muted">دریافت امروز</div>
            </div>
            <div className="rounded-xl bg-gold-soft border border-gold/30 p-3">
              <div className="text-2xl font-extrabold text-gold tabular-nums">
                {toPersianDigits(liveStats.remaining)}
              </div>
              <div className="text-xs text-ink-muted">سهمیه باقی‌مانده کل</div>
            </div>
            <div className="rounded-xl bg-canvas border border-line p-3">
              <div className="text-2xl font-extrabold text-ink tabular-nums">
                {toPersianDigits(liveStats.total)}
              </div>
              <div className="text-xs text-ink-muted">کل لیست</div>
            </div>
          </div>

          <p className="text-[11px] text-amber-400/95 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 leading-relaxed">
            قانون قطعی: هر دانشجو در کل روزهای ثبت‌نام فقط <strong>یک نوبت</strong> (در همان روز ثبت‌نام خود) مجاز به دریافت صبحانه است.
          </p>

          {pendingQueue.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-2 text-ink">
                <CloudOff className="w-4 h-4 text-amber-500" />
                <span>{toPersianDigits(pendingQueue.length)} دریافت در صف همگام‌سازی آفلاین</span>
              </span>
              <button
                type="button"
                disabled={!isOnline || syncing}
                onClick={syncQueue}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>همگام‌سازی</span>
              </button>
            </div>
          )}
        </div>

        {/* دوربین اسکن QR */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">اسکن دوربین QR</h2>
            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
                cameraActive
                  ? 'bg-red-600 text-white'
                  : 'bg-gold text-[#071714]'
              }`}
            >
              {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              <span>{cameraActive ? 'توقف دوربین' : 'روشن کردن دوربین'}</span>
            </button>
          </div>

          <div
            id="qr-reader-region"
            className="w-full rounded-xl overflow-hidden bg-black/40 min-h-[160px]"
          />

          {cameraError && <p className="text-xs text-amber-500">{cameraError}</p>}

          {/* ورود مستقیم کد ژتون */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processCouponCode(manualCode);
              setManualCode('');
            }}
            className="flex gap-2 pt-2"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="ورود دستی کد ژتون (مثلاً GNB-...)"
              aria-label="کد ژتون"
              className="flex-1 min-h-[44px] rounded-xl border border-line bg-canvas px-3 text-sm font-mono text-ink"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-emerald-deep text-[#f4f1e8] text-xs font-bold cursor-pointer"
            >
              بررسی کد
            </button>
          </form>
        </div>

        {/* جستجوی دستی با نام یا شماره دانشجویی (برای زمانی که گوشی/QR در دسترس نیست) */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
          <h2 className="text-sm font-bold text-ink">
            جستجوی دستی با نام یا شماره دانشجویی (آنلاین و آفلاین)
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="نام، نام‌خانوادگی یا شماره دانشجویی (مثلاً ۴۰۵...) را بنویس..."
              aria-label="جستجوی دستی نام یا شماره دانشجویی"
              className="w-full min-h-[44px] rounded-xl border border-line bg-canvas pr-10 pl-3 text-sm text-ink"
            />
          </div>

          {manualMatches.length > 0 && (
            <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
              {manualMatches.map((s) => {
                const existingClaim = findStudentExistingClaim(s.claimedAtByMeal);
                const prevMeal = existingClaim ? meals.find((m) => m.id === existingClaim.mealId) : null;
                const claimedOtherDay = Boolean(existingClaim && existingClaim.mealId !== selectedMealId);
                return (
                  <div
                    key={s.id}
                    className="p-3.5 bg-canvas flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm text-ink">
                          {s.firstName} {s.lastName}
                        </p>
                        {s.cohortGroup && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gold-soft text-gold">
                            {s.cohortGroup}
                          </span>
                        )}
                      </div>
                      {(s.studentNumber || s.major) && (
                        <p className="text-xs text-ink-muted tabular-nums">
                          {s.studentNumber ? `شماره دانشجویی: ${toPersianDigits(s.studentNumber)}` : ''}
                          {s.studentNumber && s.major ? ' · ' : ''}
                          {s.major || ''}
                        </p>
                      )}
                      <p className="text-xs text-ink-muted">
                        {existingClaim
                          ? claimedOtherDay
                            ? `قبلاً در «${prevMeal?.name || 'روز دیگر'}» ساعت ${formatJalaliTime(existingClaim.claimedAtIso)} دریافت کرده`
                            : `دریافت شده در ساعت ${formatJalaliTime(existingClaim.claimedAtIso)}`
                          : s.active
                          ? 'آماده دریافت (سهمیه یک‌نوبته)'
                          : 'غیرفعال'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => processCouponCode(s.couponCode)}
                      className={`min-h-[40px] px-4 rounded-xl text-xs font-bold cursor-pointer shrink-0 ${
                        existingClaim
                          ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {existingClaim ? 'سهمیه مصرف‌شده' : 'ثبت تحویل صبحانه'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* نتیجه تمام‌صفحه اسکن (سبز: مجاز | قرمز: تکراری | خاکستری: نامعتبر) */}
      {overlay && (
        <div
          role="alertdialog"
          aria-modal="true"
          data-testid="scanner-result-overlay"
          onClick={() => setOverlay(null)}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center text-white cursor-pointer ${
            overlay.status === 'allowed'
              ? 'bg-emerald-700'
              : overlay.status === 'already_claimed'
              ? 'bg-red-700'
              : 'bg-neutral-800'
          }`}
        >
          {overlay.status === 'allowed' ? (
            <CheckCircle2 className="w-24 h-24 mb-4" />
          ) : overlay.status === 'already_claimed' ? (
            <XCircle className="w-24 h-24 mb-4" />
          ) : (
            <AlertCircle className="w-24 h-24 mb-4" />
          )}

          <h2 className="text-4xl sm:text-5xl font-extrabold">
            {overlay.status === 'allowed'
              ? 'مجاز'
              : overlay.status === 'already_claimed'
              ? 'قبلاً دریافت کرده'
              : 'نامعتبر / غیرفعال'}
          </h2>

          {overlay.studentName && (
            <p className="mt-4 text-2xl sm:text-3xl font-bold">{overlay.studentName}</p>
          )}

          {(overlay.studentNumber || overlay.major || overlay.cohortGroup) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
              {overlay.studentNumber && (
                <span className="px-3 py-1 rounded-xl bg-black/25 tabular-nums" dir="ltr">
                  {toPersianDigits(overlay.studentNumber)}
                </span>
              )}
              {overlay.major && (
                <span className="px-3 py-1 rounded-xl bg-black/25">{overlay.major}</span>
              )}
              {overlay.cohortGroup && (
                <span className="px-3 py-1 rounded-xl bg-white/20 text-white font-bold">
                  {overlay.cohortGroup}
                </span>
              )}
            </div>
          )}

          {overlay.status === 'already_claimed' && overlay.claimedAt && (
            <div className="mt-3 space-y-1.5 bg-black/25 px-5 py-3 rounded-xl">
              {overlay.previousMealName && (
                <p className="text-base font-bold text-amber-200">
                  وعده دریافت‌شده: {overlay.previousMealName}
                  {overlay.claimedDateJalali ? ` (${overlay.claimedDateJalali})` : ''}
                </p>
              )}
              <p className="text-lg tabular-nums">
                ساعت دریافت قبلی: {formatJalaliTime(overlay.claimedAt)}
              </p>
            </div>
          )}

          <p className="mt-3 text-sm opacity-95 max-w-md leading-relaxed">{overlay.message}</p>

          <button
            type="button"
            onClick={() => setOverlay(null)}
            className="mt-10 min-h-[52px] px-10 rounded-2xl bg-white text-neutral-900 font-extrabold text-base shadow-xl cursor-pointer"
          >
            اسکن نفر بعدی
          </button>
        </div>
      )}
    </div>
  );
};
