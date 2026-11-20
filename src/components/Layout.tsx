import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  Compass,
  Feather,
  HelpCircle,
  Home,
  Menu,
  Moon,
  QrCode,
  Shield,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from './LogoEmblem';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

const NAV_LINKS = [
  { to: '/guide', label: 'راهنمای نوورود' },
  { to: '/dorms', label: 'خوابگاه‌ها' },
  { to: '/basij', label: 'بسیج دانشجویی' },
  { to: '/heyat', label: 'هیئت' },
  { to: '/announcements', label: 'اطلاعیه‌ها' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, theme, toggleTheme, liteMode, toggleLiteMode, toasts, dismissToast } =
    usePortal();
  const [bannerClosed, setBannerClosed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      {/* اطلاعیه فوری (در صورت فعال بودن از پنل ادمین) */}
      {settings.urgentBannerEnabled && settings.urgentBannerText && !bannerClosed && (
        <div className="no-print bg-emerald-deep text-[#f4f1e8] border-b border-gold/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <Link
              to={settings.urgentBannerLink || '/announcements'}
              className="hover:underline truncate"
            >
              {settings.urgentBannerText}
            </Link>
            <button
              type="button"
              aria-label="بستن اطلاعیه فوری"
              onClick={() => setBannerClosed(true)}
              className="p-1 rounded-md text-[#f4f1e8]/70 hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* نوار ناوبری بالا — دقیقاً ۳ ناحیه تمیز */}
      <header className="no-print sticky top-0 z-30 h-14 sm:h-16 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* ناحیه ۱: برند و لوگوها */}
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <LogoEmblem type="basij" src={settings.basijLogoUrl} size="sm" />
            <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="sm" />
            <span className="text-sm sm:text-base font-bold text-ink group-hover:text-gold transition-colors">
              {settings.siteTitle}
            </span>
          </Link>

          {/* ناحیه ۲: ۵ لینک اصلی تک‌خطی */}
          <nav
            aria-label="ناوبری اصلی"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-ink-muted"
          >
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-ink border-gold font-semibold'
                      : 'border-transparent hover:text-ink hover:border-gold/40'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* ناحیه ۳: یک دکمه اقدام اصلی + دکمه منوی موبایل */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/heyat#coupon"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-gold text-[#071714] hover:bg-gold-strong text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>ژتون صبحانه</span>
            </Link>

            <button
              type="button"
              aria-label="باز کردن منو"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl border border-line bg-surface flex items-center justify-center text-ink cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* منوی کشویی موبایل */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="منوی ناوبری"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-surface border-l border-line p-5 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <span className="font-bold text-ink">{settings.siteTitle}</span>
                <button
                  type="button"
                  aria-label="بستن منو"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-ink-muted hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-1.5">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink hover:bg-surface-elevated"
                >
                  صفحه اصلی
                </Link>
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink hover:bg-surface-elevated"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink hover:bg-surface-elevated"
                >
                  تماس با ما
                </Link>
                <Link
                  to="/scanner"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:bg-surface-elevated"
                >
                  اسکنر مسئول پخش صبحانه
                </Link>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:bg-surface-elevated"
                >
                  پنل مدیریت
                </Link>
              </nav>
            </div>

            <div className="pt-4 border-t border-line space-y-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-line bg-canvas text-sm text-ink flex items-center justify-between"
              >
                <span>{theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}</span>
                {theme === 'dark' ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4 text-gold" />}
              </button>
              <button
                type="button"
                onClick={toggleLiteMode}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-line bg-canvas text-sm text-ink flex items-center justify-between"
              >
                <span>حالت کم‌حجم: {liteMode ? 'روشن' : 'خاموش'}</span>
                <Zap className="w-4 h-4 text-gold" />
              </button>
              <PWAInstallButton />
            </div>
          </div>
        </div>
      )}

      {/* محتوای اصلی */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* فوتر */}
      <footer className="no-print border-t border-line bg-surface mt-16 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <LogoEmblem type="basij" src={settings.basijLogoUrl} size="md" />
                <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="md" />
                <div>
                  <h2 className="font-bold text-ink text-base">{settings.siteTitle}</h2>
                  <p className="text-xs text-ink-muted">{settings.universityName}</p>
                </div>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed">
                بسیج دانشجویی و هیئت دانشجویی مجتمع آموزش عالی گناباد — همراه شما از نخستین روز ثبت‌نام و سکونت در دانشگاه.
              </p>

              {/* تنظیمات نمایش و نصب اپلیکیشن */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="min-h-[38px] px-3.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-medium text-ink inline-flex items-center gap-2 cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4 text-gold" />}
                  <span>{theme === 'dark' ? 'تم روشن' : 'تم تاریک'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleLiteMode}
                  className="min-h-[38px] px-3.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-medium text-ink inline-flex items-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-gold" />
                  <span>{liteMode ? 'حالت کم‌حجم: فعال' : 'حالت کم‌حجم'}</span>
                </button>
                <PWAInstallButton compact />
              </div>
            </div>

            <div className="md:col-span-3 space-y-2.5">
              <h3 className="text-sm font-bold text-ink">دسترسی سریع</h3>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li><Link to="/guide" className="hover:text-gold transition-colors">راهنمای ثبت‌نام و FAQ</Link></li>
                <li><Link to="/dorms" className="hover:text-gold transition-colors">خوابگاه‌ها و مقایسه</Link></li>
                <li><Link to="/basij" className="hover:text-gold transition-colors">بسیج دانشجویی و کانون‌ها</Link></li>
                <li><Link to="/heyat#coupon" className="hover:text-gold transition-colors">دریافت ژتون صبحانه</Link></li>
                <li><Link to="/contact" className="hover:text-gold transition-colors">تماس با ما</Link></li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2.5 text-sm text-ink-muted">
              <h3 className="text-sm font-bold text-ink">ارتباط و پاسخگویی</h3>
              <p>{settings.contactPhones}</p>
              <p>ساعت پاسخگویی: {settings.responseHours}</p>
              <div className="pt-2 flex flex-wrap gap-3 text-xs">
                {settings.basijTelegramUrl && (
                  <a href={settings.basijTelegramUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                    تلگرام بسیج (@BasijUOG)
                  </a>
                )}
                {settings.basijEitaaUrl && (
                  <a href={settings.basijEitaaUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                    ایتا بسیج
                  </a>
                )}
                <a href="https://zil.ink/basijuog" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                  پروفایل بسیج (zil.ink)
                </a>
                {settings.heyatTelegramUrl && (
                  <a href={settings.heyatTelegramUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                    تلگرام هیئت
                  </a>
                )}
                {settings.heyatEitaaUrl && (
                  <a href={settings.heyatEitaaUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                    ایتا هیئت
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-4 text-xs text-ink-muted">
            <p>بسیج دانشجویی (حوزه شهید شوریده) و هیئت محبان‌الحسین (ع) مجتمع آموزش عالی گناباد</p>
            <div className="flex items-center gap-4">
              <Link to="/scanner" className="hover:text-ink inline-flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>اسکنر پخش صبحانه</span>
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/admin" className="hover:text-ink inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>پنل مدیریت</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* دکمه شناور «سوالی داری؟» در دسکتاپ */}
      {location.pathname !== '/guide' && (
        <Link
          to="/guide#ask"
          aria-label="سوالی داری؟ برو به فرم پرسش"
          className="no-print hidden lg:inline-flex fixed bottom-5 left-5 z-30 items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-deep/95 text-[#f4f1e8] border border-gold/45 shadow-lg hover:bg-emerald-mid transition-all text-xs font-semibold backdrop-blur-md"
        >
          <HelpCircle className="w-4 h-4 text-gold" />
          <span>سوالی داری؟</span>
        </Link>
      )}

      {/* نوار ناوبری پایین موبایل با فضای عمودی کافی برای خوانایی کامل حروف فارسی */}
      <nav
        aria-label="ناوبری سریع موبایل"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 min-h-[62px] py-1.5 border-t border-line bg-surface/95 backdrop-blur-md grid grid-cols-5 items-center"
      >
        {[
          { to: '/', label: 'خانه', icon: Home },
          { to: '/guide', label: 'راهنما', icon: BookOpen },
          { to: '/dorms', label: 'خوابگاه', icon: Building2 },
          { to: '/basij', label: 'بسیج', icon: Compass },
          { to: '/heyat', label: 'ژتون', icon: Feather },
        ].map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center py-0.5 text-[11px] leading-tight font-medium transition-colors ${
                active ? 'text-gold font-bold' : 'text-ink-muted'
              }`}
            >
              <Icon className="w-[19px] h-[19px] shrink-0" />
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <OfflineIndicator />

      {/* اعلان‌های Toast */}
      <div
        aria-live="polite"
        className="no-print fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 text-sm shadow-xl border flex items-center justify-between gap-3 ${
              t.tone === 'success'
                ? 'bg-emerald-950 text-emerald-50 border-emerald-500/40'
                : t.tone === 'error'
                ? 'bg-red-950 text-red-50 border-red-500/40'
                : 'bg-surface text-ink border-line'
            }`}
          >
            <span>{t.text}</span>
            <button
              type="button"
              aria-label="بستن اعلان"
              onClick={() => dismissToast(t.id)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
