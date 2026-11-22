import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Compass,
  Feather,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import {
  QUICK_INTENT_SHORTCUTS,
  searchPortalQuick,
  type QuickSearchCategory,
} from '../utils/quickSearch';
import { toPersianDigits } from '../utils/persian';

const CATEGORY_ICON: Record<QuickSearchCategory, React.FC<{ className?: string }>> = {
  'روز ثبت‌نام رشته': Calendar,
  'دسترسی سریع': Sparkles,
  'ایستگاه ثبت‌نام': MapPin,
  'کانون بسیج': Compass,
  'هیئت محبان‌الحسین': Feather,
};

/**
 * دستیار جستجوی فوری سراسری (کاملاً آفلاین)
 * روی موبایل به‌صورت Bottom Sheet ارگونومیک در دسترس شست و روی دسکتاپ به‌صورت پنجره مرکزی باز می‌شود.
 */
export const GlobalQuickFinder: React.FC = () => {
  const { quickSearchOpen, closeQuickSearch } = usePortal();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const results = useMemo(() => searchPortalQuick(query, 9), [query]);

  useEffect(() => {
    if (!quickSearchOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuickSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [quickSearchOpen, closeQuickSearch]);

  if (!quickSearchOpen) return null;

  const goToResult = (to: string) => {
    closeQuickSearch();
    setQuery('');
    navigate(to);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جستجوی سریع و دستیار مسیر نوورودی‌ها"
      data-testid="quick-finder-dialog"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={closeQuickSearch}
    >
      <div
        className="w-full sm:max-w-xl max-h-[86vh] rounded-t-3xl sm:rounded-3xl border border-gold/35 bg-surface shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* دستگیره کشویی ویژه موبایل */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-line" />
        </div>

        {/* سرصفحه و فیلد جستجو */}
        <div className="px-4 sm:px-5 pt-3 pb-3.5 border-b border-line space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-ink">
                الان دنبال چی هستی؟
              </h2>
              <p className="text-xs text-ink-muted">
                نام رشته‌ات، خوابگاه، ژتون صبحانه یا هر مرحله‌ای را بنویس تا مستقیم بروی
              </p>
            </div>
            <button
              type="button"
              aria-label="بستن جستجوی سریع"
              onClick={closeQuickSearch}
              className="min-h-[40px] min-w-[40px] rounded-xl border border-line bg-canvas text-ink-muted hover:text-ink flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gold absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              data-testid="quick-finder-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مثلاً: مهندسی کامپیوتر، خوابگاه، ژتون صبحانه، فاطمیه..."
              className="w-full min-h-[46px] rounded-2xl border border-gold/40 bg-canvas pr-10 pl-10 text-sm text-ink placeholder:text-ink-muted/80"
            />
            {query && (
              <button
                type="button"
                aria-label="پاک کردن عبارت جستجو"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ۴ میانبر تک‌لمسی وقتی جستجو خالی است */}
          {!query.trim() && (
            <div className="grid grid-cols-2 gap-2">
              {QUICK_INTENT_SHORTCUTS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    if (sc.to) {
                      goToResult(sc.to);
                    } else if (sc.prefillQuery) {
                      setQuery(sc.prefillQuery);
                      inputRef.current?.focus();
                    }
                  }}
                  className="min-h-[44px] text-right rounded-xl border border-line bg-canvas hover:border-gold/55 px-3 py-2 transition-colors cursor-pointer"
                >
                  <span className="block text-xs font-bold text-ink">{sc.label}</span>
                  <span className="block text-[11px] text-ink-muted truncate mt-0.5">
                    {sc.hint}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* نتایج زنده و آفلاین */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-ink-muted px-1">
            <span>
              {query.trim()
                ? `${toPersianDigits(results.length)} نتیجه مرتبط پیدا شد`
                : 'پربازدیدترین مسیرهای روز اول'}
            </span>
            <span>جستجوی آفلاین</span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-line bg-canvas p-6 text-center space-y-2">
              <p className="text-sm font-bold text-ink">مورد دقیقی با این عبارت پیدا نشد</p>
              <p className="text-xs text-ink-muted">
                کلمه ساده‌تری مثل «برق»، «مدارک»، «خوابگاه» یا «صبحانه» را امتحان کن یا سوالت را در بخش FAQ بپرس.
              </p>
              <button
                type="button"
                onClick={() => goToResult('/guide#ask')}
                className="mt-2 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-gold text-[#071714] text-xs font-extrabold cursor-pointer"
              >
                <span>ارسال سوال در صفحه راهنما</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <ul className="space-y-1.5" data-testid="quick-finder-results">
              {results.map((item) => {
                const Icon = CATEGORY_ICON[item.category];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => goToResult(item.to)}
                      className="w-full min-h-[56px] text-right rounded-2xl border border-line bg-canvas/85 hover:border-gold/55 hover:bg-surface-elevated px-3.5 py-2.5 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="w-9 h-9 rounded-xl bg-gold-soft text-gold flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs sm:text-sm font-bold text-ink group-hover:text-gold transition-colors leading-snug">
                          {item.title}
                        </span>
                        <span className="block text-[11.5px] text-ink-muted line-clamp-2 leading-relaxed mt-0.5">
                          {item.category} · {item.subtitle}
                        </span>
                      </span>
                      <ArrowLeft className="w-4 h-4 text-ink-muted group-hover:text-gold group-hover:-translate-x-0.5 transition-all shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
