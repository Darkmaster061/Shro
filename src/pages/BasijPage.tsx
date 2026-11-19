import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Compass,
  Download,
  ExternalLink,
  GraduationCap,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from '../components/LogoEmblem';
import { TiltCard } from '../components/TiltCard';
import { GeometricLatticeBg } from '../components/GeometricLatticeBg';
import { AxisIcon, BasijOrgChart } from '../components/BasijOrgChart';
import { CadreDossierModal } from '../components/CadreDossierModal';
import { BASIJ_TIMELINE, CADRE_QUIZ_QUESTIONS } from '../data/orientation';
import {
  BASIJ_AXIS_CATEGORIES,
  BASIJ_CADRE_DEFINITION,
} from '../data/basijCadresOfficial';
import {
  getAxisMeta,
  MAJOR_RECOMMENDATIONS,
  matchCadresByMajor,
  toggleSavedCadreId,
} from '../data/basijVisuals';
import { renderCadreStoryCard } from '../utils/storyCardCanvas';
import { normalizePersian, toPersianDigits } from '../utils/persian';
import type { CadreItem } from '../types/portal';

const SAVED_CADRES_KEY = 'gonabad_saved_cadres_v1';

export const BasijPage: React.FC = () => {
  const { settings, showToast } = usePortal();
  const [cadres, setCadres] = useState<CadreItem[]>([]);
  const [activeAxis, setActiveAxis] = useState<string>('همه');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCadre, setSelectedCadre] = useState<CadreItem | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [savedIds, setSavedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_CADRES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    api.getCadres().then(setCadres).catch(() => {});
  }, []);

  const handleToggleSave = (cadreId: number) => {
    const existed = savedIds.includes(cadreId);
    const next = toggleSavedCadreId(savedIds, cadreId);
    setSavedIds(next);
    localStorage.setItem(SAVED_CADRES_KEY, JSON.stringify(next));
    showToast(
      existed ? 'کانون از فهرست نشان‌شده‌ها حذف شد.' : 'کانون به فهرست نشان‌شده‌های تو اضافه شد.',
      'info'
    );
  };

  // کانون‌های پیشنهادی بر اساس رشته انتخاب‌شده
  const majorMatchedCadres = useMemo(
    () => matchCadresByMajor(selectedMajor, cadres),
    [selectedMajor, cadres]
  );

  const majorHighlightSet = useMemo(
    () => new Set(majorMatchedCadres.map((c) => c.id)),
    [majorMatchedCadres]
  );

  const activeMajorObj = useMemo(
    () => MAJOR_RECOMMENDATIONS.find((m) => m.id === selectedMajor),
    [selectedMajor]
  );

  // کانون‌های نشان‌شده کاربر
  const savedCadres = useMemo(
    () => cadres.filter((c) => savedIds.includes(c.id)),
    [cadres, savedIds]
  );

  // شمارش کانون‌ها در هر محور
  const axisCounts = useMemo(() => {
    const map: Record<string, number> = { همه: cadres.length };
    for (const c of cadres) {
      map[c.category] = (map[c.category] || 0) + 1;
    }
    return map;
  }, [cadres]);

  // فیلتر کانون‌ها بر اساس محور، رشته و جستجوی فارسی
  const filteredCadres = useMemo(() => {
    const q = normalizePersian(searchQuery.trim());
    return cadres.filter((c) => {
      if (activeAxis !== 'همه' && c.category !== activeAxis) return false;
      if (!q) return true;
      const hay = normalizePersian(
        `${c.name} ${c.category} ${c.shortDesc} ${c.fullDesc} ${c.highlights.join(' ')}`
      );
      return hay.includes(q);
    });
  }, [cadres, activeAxis, searchQuery]);

  // محاسبه کانون‌های پیشنهادی آزمون کوتاه ۵ محوری
  const quizRecommendation = useMemo(() => {
    const counts: Record<string, number> = {
      علمی: 0,
      رسانه: 0,
      جهادی: 0,
      فرهنگ: 0,
      سیاسی: 0,
    };
    Object.values(quizAnswers).forEach((tag) => {
      if (tag in counts) counts[tag]++;
    });
    const topTag = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'علمی';
    const matches = cadres.filter((c) => c.tags.includes(topTag));
    return {
      topTag,
      matches: matches.length > 0 ? matches.slice(0, 3) : cadres.slice(0, 3),
    };
  }, [quizAnswers, cadres]);

  // رندر زنده کارت گرافیکی استوری پس از نمایش نتیجه آزمون
  useEffect(() => {
    if (!showQuizResult || !storyCanvasRef.current || quizRecommendation.matches.length === 0) {
      return;
    }
    renderCadreStoryCard(storyCanvasRef.current, {
      universityName: settings.universityName,
      topTag: quizRecommendation.topTag,
      matches: quizRecommendation.matches,
    });
  }, [showQuizResult, quizRecommendation, settings.universityName]);

  const handleDownloadStoryCard = () => {
    const canvas = storyCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `basij-cadre-story-${quizRecommendation.topTag}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('پوستر استوری نتیجه آزمون با کیفیت بالا ذخیره شد.', 'success');
  };

  const answeredCount = Object.keys(quizAnswers).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
      {/* سرصفحه سینمایی با الگوی گره‌چینی مدرن */}
      <section className="relative rounded-3xl border border-line bg-surface p-6 sm:p-10 overflow-hidden space-y-7">
        <GeometricLatticeBg opacity={0.08} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-3.5">
              <LogoEmblem type="basij" src={settings.basijLogoUrl} size="md" />
              <div>
                <p className="text-xs font-semibold text-gold">
                  ساختار تعاملی کانون‌های بسیج دانشجویی · قرار قیام ۹
                </p>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-ink mt-0.5">
                  بسیج دانشجویی {settings.universityName}
                </h1>
              </div>
            </div>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl">
              {settings.basijIntroText}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={settings.basijEitaaUrl || settings.basijTelegramUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[46px] px-5 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm inline-flex items-center gap-2 transition-colors"
              >
                <span>چطور عضو شوم؟ (ارتباط مستقیم)</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="#org-chart"
                className="min-h-[46px] px-5 rounded-xl border border-line bg-canvas/85 hover:border-gold/50 text-sm font-semibold text-ink inline-flex items-center gap-2 transition-colors"
              >
                <Layers className="w-4 h-4 text-gold" />
                <span>مشاهده چارت تعاملی ۲۵ کانون</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            {[
              { label: 'کانون تخصصی فعال در چارت', value: toPersianDigits(cadres.length || 25) },
              { label: 'محور اصلی فعالیت', value: toPersianDigits(6) },
              { label: 'کانون‌های نشان‌شده تو', value: toPersianDigits(savedIds.length) },
              { label: 'اعضای همراه دانشگاه', value: '[نیاز به تکمیل]' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-line bg-canvas/85 p-4 text-center"
              >
                <div className="text-lg sm:text-xl font-extrabold text-gold tabular-nums">
                  {stat.value}
                </div>
                <div className="text-xs text-ink-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* تعریف رسمی کانون (نقل‌قول تحریریه با جداکننده ظریف) */}
        <div className="relative z-10 pt-5 border-t border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <p className="text-xs font-bold text-gold">کانون در ساختار بسیج دانشجویی چیست؟</p>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {BASIJ_CADRE_DEFINITION}
            </p>
          </div>
          <a
            href="#quiz"
            className="shrink-0 min-h-[42px] px-4 rounded-xl border border-gold/40 bg-gold-soft/50 hover:bg-gold hover:text-[#071714] text-xs font-bold text-ink inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>آزمون انتخاب کانون مناسب</span>
          </a>
        </div>
      </section>

      {/* بخش ۰۱: انتخاب رشته تحصیلی + چارت گرافیکی تعاملی ۲۵ کانون (جایگزین کامل PDF) */}
      <section id="org-chart" aria-labelledby="chart-section-heading" className="scroll-mt-20 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold mb-1">۰۱. نقشه تعاملی ساختار کانونی</p>
            <h2 id="chart-section-heading" className="text-xl sm:text-2xl font-bold text-ink">
              چارت هوشمند ۲۵ کانون و تطبیق با رشته تحصیلی تو
            </h2>
          </div>
          <p className="text-xs text-ink-muted">
            رشته‌ات را انتخاب کن تا کانون‌های هم‌راستا با مهارت و آینده شغلی‌ات روی چارت روشن شوند.
          </p>
        </div>

        {/* نوار انتخاب رشته تحصیلی */}
        <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink inline-flex items-center gap-1.5 ml-2">
            <GraduationCap className="w-4 h-4 text-gold" />
            <span>رشته تحصیلی تو:</span>
          </span>
          {MAJOR_RECOMMENDATIONS.map((major) => {
            const active = selectedMajor === major.id;
            return (
              <button
                key={major.id}
                type="button"
                onClick={() => setSelectedMajor(major.id)}
                aria-pressed={active}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-gold text-[#071714]'
                    : 'border border-line bg-canvas text-ink-muted hover:text-ink hover:border-gold/40'
                }`}
              >
                {major.label}
              </button>
            );
          })}
        </div>

        <BasijOrgChart
          cadres={cadres}
          activeAxis={activeAxis}
          onSelectAxis={setActiveAxis}
          onSelectCadre={setSelectedCadre}
          highlightedIds={majorHighlightSet}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          majorReason={activeMajorObj?.reason}
        />

        {/* سبد کانون‌های نشان‌شده توسط کاربر */}
        {savedCadres.length > 0 && (
          <div
            data-testid="saved-cadres-tray"
            className="rounded-2xl border border-gold/40 bg-surface p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-gold fill-current" />
                <h3 className="text-sm font-bold text-ink">
                  کانون‌های نشان‌شده من ({toPersianDigits(savedCadres.length)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSavedIds([]);
                  localStorage.removeItem(SAVED_CADRES_KEY);
                }}
                className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاک کردن همه</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedCadres.map((c) => {
                const meta = getAxisMeta(c.category);
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-line bg-canvas p-3.5 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCadre(c)}
                      className="text-right min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="block text-[11px] font-semibold" style={{ color: meta.accent }}>
                        {meta.title}
                      </span>
                      <span className="block text-sm font-bold text-ink truncate mt-0.5">
                        {c.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSave(c.id)}
                      aria-label={`حذف ${c.name} از نشان‌شده‌ها`}
                      className="p-2 rounded-lg text-ink-muted hover:text-ink cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* بخش ۰۲: مرور و جستجوی تفصیلی کانون‌ها */}
      <section aria-labelledby="cadres-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold mb-1">۰۲. فهرست تحریریه کانون‌ها</p>
            <h2 id="cadres-heading" className="text-xl sm:text-2xl font-bold text-ink">
              جستجو و مشاهده شناسنامه {toPersianDigits(cadres.length || 25)} کانون
            </h2>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام کانون، مهارت یا کارگروه..."
              aria-label="جستجو در بین کانون‌های بسیج"
              className="w-full min-h-[42px] rounded-xl border border-line bg-surface pr-9 pl-3 text-xs text-ink"
            />
          </div>
        </div>

        {/* فیلتر محورها */}
        <div className="flex flex-wrap items-center gap-2">
          {BASIJ_AXIS_CATEGORIES.map((axis) => {
            const count = axisCounts[axis] ?? 0;
            const active = activeAxis === axis;
            return (
              <button
                key={axis}
                type="button"
                onClick={() => setActiveAxis(axis)}
                aria-pressed={active}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-gold text-[#071714]'
                    : 'border border-line bg-surface text-ink-muted hover:text-ink hover:border-gold/40'
                }`}
              >
                {axis} ({toPersianDigits(count)})
              </button>
            );
          })}
        </div>

        {filteredCadres.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-ink-muted">
            کانونی مطابق جستجوی شما یافت نشد. فیلتر محور را روی «همه» قرار دهید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCadres.map((cadre) => {
              const meta = getAxisMeta(cadre.category);
              const isSaved = savedIds.includes(cadre.id);
              const isMajorHit = majorHighlightSet.has(cadre.id);
              return (
                <TiltCard key={cadre.id}>
                  <article
                    className={`h-full rounded-2xl border bg-surface p-5 flex flex-col justify-between transition-colors ${
                      isMajorHit ? 'border-gold/70' : 'border-line hover:border-gold/45'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-ink-muted mb-3">
                        <span
                          className="font-bold inline-flex items-center gap-1.5"
                          style={{ color: meta.accent }}
                        >
                          <AxisIcon iconKey={meta.iconKey} className="w-3.5 h-3.5" />
                          <span>{meta.title}</span>
                        </span>
                        {isMajorHit && (
                          <span className="text-[11px] font-bold text-gold">
                            پیشنهاد رشته تو
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-ink">{cadre.name}</h3>
                      <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                        {cadre.shortDesc}
                      </p>

                      <div className="mt-3.5 pt-3 border-t border-line/70 text-xs text-ink-muted leading-relaxed">
                        <span className="font-semibold text-ink/90">کارگروه‌ها: </span>
                        {cadre.highlights.slice(0, 3).join(' · ')}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-line flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCadre(cadre)}
                        className="flex-1 min-h-[40px] px-3.5 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-semibold cursor-pointer transition-colors"
                      >
                        مشاهده شناسنامه و عضویت
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(cadre.id)}
                        aria-label={
                          isSaved
                            ? `حذف ${cadre.name} از نشان‌شده‌ها`
                            : `نشان کردن ${cadre.name}`
                        }
                        aria-pressed={isSaved}
                        className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                          isSaved
                            ? 'border-gold bg-gold text-[#071714]'
                            : 'border-line bg-canvas text-ink-muted hover:text-gold'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </article>
                </TiltCard>
              );
            })}
          </div>
        )}
      </section>

      {/* بخش ۰۳: آزمون کوتاه + تولید پوستر استوری گرافیکی روی Canvas */}
      <section
        id="quiz"
        aria-labelledby="quiz-heading"
        className="scroll-mt-20 relative rounded-3xl border border-line bg-surface p-6 sm:p-8 overflow-hidden space-y-6"
      >
        <GeometricLatticeBg opacity={0.055} />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold mb-1 inline-flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>راهنمای انتخاب مسیر + پوستر استوری اختصاصی</span>
            </p>
            <h2 id="quiz-heading" className="text-xl sm:text-2xl font-bold text-ink">
              ۰۳. آزمون کوتاه «کدام کانون مناسب من است؟»
            </h2>
          </div>
          <span className="text-xs text-ink-muted tabular-nums">
            {toPersianDigits(answeredCount)} از {toPersianDigits(CADRE_QUIZ_QUESTIONS.length)} سوال پاسخ داده شده
          </span>
        </div>

        <div className="relative z-10">
          {!showQuizResult ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CADRE_QUIZ_QUESTIONS.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-line bg-canvas p-5 space-y-3"
                  >
                    <h3 className="text-sm font-bold text-ink">
                      {toPersianDigits(idx + 1)}. {q.question}
                    </h3>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const picked = quizAnswers[q.id] === opt.tag;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.tag }))
                            }
                            aria-pressed={picked}
                            className={`w-full text-right px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer ${
                              picked
                                ? 'border-gold bg-gold-soft text-ink font-semibold'
                                : 'border-line bg-surface text-ink-muted hover:text-ink'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={answeredCount < CADRE_QUIZ_QUESTIONS.length}
                onClick={() => setShowQuizResult(true)}
                className="min-h-[46px] px-6 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-sm disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>مشاهده کانون‌های پیشنهادی و ساخت پوستر استوری</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-gold/40 bg-canvas p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ستون پیشنهادها */}
              <div className="lg:col-span-8 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gold">
                    نتیجه آزمون اختصاصی تو · گرایش غالب: {quizRecommendation.topTag}
                  </p>
                  <h3 className="text-lg sm:text-2xl font-extrabold text-ink mt-1">
                    سه کانون پیشنهادی برای شروع پرانرژی تو
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {quizRecommendation.matches.map((item, idx) => {
                    const meta = getAxisMeta(item.category);
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-line bg-surface p-4 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <p className="text-[11px] font-bold" style={{ color: meta.accent }}>
                            پیشنهاد {toPersianDigits(idx + 1)} · {meta.title}
                          </p>
                          <h4 className="text-base font-bold text-ink mt-1">{item.name}</h4>
                          <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                            {item.shortDesc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCadre(item)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-xs cursor-pointer transition-colors"
                        >
                          مشاهده شناسنامه
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadStoryCard}
                    className="min-h-[44px] px-5 rounded-xl bg-gold text-[#071714] hover:bg-gold-strong font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود پوستر استوری (سایز ۱۰۸۰×۱۹۲۰)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizAnswers({});
                      setShowQuizResult(false);
                    }}
                    className="min-h-[44px] px-4 rounded-xl border border-line bg-surface text-xs text-ink inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>انجام دوباره آزمون</span>
                  </button>
                </div>
              </div>

              {/* ستون پیش‌نمایش زنده پوستر استوری */}
              <div className="lg:col-span-4 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-ink-muted">
                  پیش‌نمایش کارت استوری آماده اشتراک در ایتا و بله
                </p>
                <canvas
                  ref={storyCanvasRef}
                  data-testid="quiz-story-canvas"
                  className="w-full max-w-[230px] aspect-[9/16] rounded-2xl border border-gold/40 shadow-xl"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* بخش ۰۴: تایم‌لاین مسیر فعالیت */}
      <section aria-labelledby="basij-tl-heading" className="space-y-5">
        <h2 id="basij-tl-heading" className="text-xl sm:text-2xl font-bold text-ink">
          ۰۴. نگاهی به مسیر و برنامه‌های دانشگاه
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BASIJ_TIMELINE.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-surface p-5 space-y-2"
            >
              <p className="text-xs font-semibold text-gold">{item.year}</p>
              <h3 className="text-base font-bold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* شناسنامه گرافیکی کامل کانون */}
      <CadreDossierModal
        cadre={selectedCadre}
        isSaved={selectedCadre ? savedIds.includes(selectedCadre.id) : false}
        onToggleSave={handleToggleSave}
        onClose={() => setSelectedCadre(null)}
      />
    </div>
  );
};
