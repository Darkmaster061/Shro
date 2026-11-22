import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SiteSettings } from '../types/portal';
import { api } from '../api/client';
import { REGISTRATION_CHECKLIST } from '../data/orientation';
import {
  OFFICIAL_BASIJ_PDF_TITLE,
  OFFICIAL_BASIJ_PDF_URL,
} from '../data/basijCadresOfficial';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface PortalContextValue {
  settings: SiteSettings;
  refreshSettings: () => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  liteMode: boolean;
  toggleLiteMode: () => void;
  largeText: boolean;
  toggleLargeText: () => void;
  mobileFocusMode: boolean;
  setMobileFocusMode: (val: boolean) => void;
  quickSearchOpen: boolean;
  openQuickSearch: () => void;
  closeQuickSearch: () => void;
  completedSteps: string[];
  toggleStep: (id: string) => void;
  checklistProgress: number;
  showToast: (text: string, tone?: 'success' | 'error' | 'info') => void;
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
  gatePassed: boolean;
  completeGate: () => void;
  reopenGate: () => void;
}

const FALLBACK_SETTINGS: SiteSettings = {
  siteTitle: 'پرتال هوشمند نوورودی‌ها',
  universityName: 'مجتمع آموزش عالی گناباد',
  basijLogoUrl: '/assets/basij-logo-official.png',
  heyatLogoUrl: '',
  heroImageUrl: '',
  accentColor: '#deb154',
  targetEventTitle: 'آغاز ثبت‌نام حضوری نوورودی‌های ۱۴۰۵ (یکشنبه ۱ تا سه‌شنبه ۳ آذر)',
  targetEventDateIso: '2026-11-22T08:00:00+03:30',
  targetEventDateJalali: '۱۴۰۵/۰۹/۰۱ تا ۱۴۰۵/۰۹/۰۳ (ساعت ۰۸:۰۰ تا ۱۴:۰۰)',
  urgentBannerEnabled: true,
  urgentBannerText:
    'اطلاعیه رسمی ثبت‌نام حضوری ۱۴۰۵ منتشر شد: یکشنبه ۱ تا سه‌شنبه ۳ آذرماه (ساعت ۸ تا ۱۴) بر اساس رشته — روز مراجعه رشته‌ات را ببین!',
  urgentBannerLink: '/guide',
  basijTelegramUrl: 'https://t.me/BasijUOG',
  basijEitaaUrl: 'https://eitaa.com/basijuog',
  basijBaleUrl: '',
  basijRubikaUrl: '',
  heyatTelegramUrl: 'https://t.me/mohebbanolhosein_uog',
  heyatEitaaUrl: '',
  heyatBaleUrl: '',
  heyatRubikaUrl: '',
  contactPhones:
    'تلفن دانشگاه: ۰۵۱۵۷۲۰۲۱۲۲ | تماس ضروری پذیرفته‌شدگان: ۰۹۰۲۴۹۷۴۳۱۱ و ۰۹۱۵۸۹۴۴۲۰۸ | خوابگاه خواهران: ۰۵۱۵۷۲۰۲۱۴۴ | خوابگاه برادران: ۰۵۱۵۷۲۰۲۱۴۵ | تغذیه: ۰۵۱۵۷۲۰۲۱۴۳',
  responseHours: 'روزهای ثبت‌نام حضوری (۱ تا ۳ آذر ۱۴۰۵): ساعت ۰۸:۰۰ تا ۱۴:۰۰',
  basijOfficeLocation: 'مجتمع آموزش عالی گناباد (انتهای بلوار شهدای گمنام)، پایگاه بسیج برادران (سالن مرکزی) و پایگاه بسیج خواهران (طبقه اول بال شرقی)',
  heyatOfficeLocation: 'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد — هیئت دانشجویی محبان‌الحسین (ع)',
  basijIntroText:
    'بسیج دانشجویی مجتمع آموزش عالی گناباد با هدف همراهی علمی، فرهنگی، مهارتی و جهادی با دانشجویان، از نخستین روز ورود شما در کنارتان است.',
  heyatIntroText:
    'هیئت دانشجویی محبان‌الحسین (ع) دانشگاه گناباد، محفل صمیمی همدلی، معنویت و برنامه‌های هفتگی دانشجویان در مسجد حضرت فاطمه زهرا (س) و جوار مزار شهدای گمنام است.',
  cadresPdfUrl: OFFICIAL_BASIJ_PDF_URL,
  cadresPdfTitle: OFFICIAL_BASIJ_PDF_TITLE,
  autoPurgeDays: 0,
  couponWalkinEnabled: false,
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SETTINGS);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('gonabad_theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [liteMode, setLiteMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gonabad_lite_mode');
    if (saved !== null) return saved === '1';
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });
  const [largeText, setLargeText] = useState<boolean>(() => {
    return localStorage.getItem('gonabad_large_text') === '1';
  });
  const [mobileFocusMode, setMobileFocusModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem('gonabad_mobile_focus');
    return saved === null ? true : saved === '1';
  });
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('gonabad_checklist');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [gatePassed, setGatePassed] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return true;
    return localStorage.getItem('gonabad_welcome_gate_passed') === '1';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch {
      // استفاده از کش محلی یا مقادیر پیش‌فرض در حالت آفلاین
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // همگام‌سازی تم تاریک/روشن با عنصر html
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('gonabad_theme', theme);
  }, [theme]);

  // اعمال رنگ تأکید انتخابی ادمین
  useEffect(() => {
    if (settings.accentColor && /^#[0-9a-fA-F]{6}$/.test(settings.accentColor)) {
      document.documentElement.style.setProperty('--color-accent', settings.accentColor);
    }
  }, [settings.accentColor]);

  // همگام‌سازی اندازه متن خوانا (ویژه دانشجویان و خانواده‌ها در موبایل)
  useEffect(() => {
    const root = document.documentElement;
    if (largeText) {
      root.classList.add('reading-large');
    } else {
      root.classList.remove('reading-large');
    }
    localStorage.setItem('gonabad_large_text', largeText ? '1' : '0');
  }, [largeText]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleLiteMode = useCallback(() => {
    setLiteMode((prev) => {
      const next = !prev;
      localStorage.setItem('gonabad_lite_mode', next ? '1' : '0');
      return next;
    });
  }, []);

  const toggleLargeText = useCallback(() => {
    setLargeText((prev) => !prev);
  }, []);

  const setMobileFocusMode = useCallback((val: boolean) => {
    localStorage.setItem('gonabad_mobile_focus', val ? '1' : '0');
    setMobileFocusModeState(val);
  }, []);

  const openQuickSearch = useCallback(() => setQuickSearchOpen(true), []);
  const closeQuickSearch = useCallback(() => setQuickSearchOpen(false), []);

  const toggleStep = useCallback((id: string) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      localStorage.setItem('gonabad_checklist', JSON.stringify(next));
      return next;
    });
  }, []);

  const showToast = useCallback(
    (text: string, tone: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, text, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeGate = useCallback(() => {
    localStorage.setItem('gonabad_welcome_gate_passed', '1');
    setGatePassed(true);
  }, []);

  const reopenGate = useCallback(() => {
    setGatePassed(false);
  }, []);

  const checklistProgress = Math.round(
    (completedSteps.length / Math.max(1, REGISTRATION_CHECKLIST.length)) * 100
  );

  return (
    <PortalContext.Provider
      value={{
        settings,
        refreshSettings,
        theme,
        toggleTheme,
        liteMode,
        toggleLiteMode,
        largeText,
        toggleLargeText,
        mobileFocusMode,
        setMobileFocusMode,
        quickSearchOpen,
        openQuickSearch,
        closeQuickSearch,
        completedSteps,
        toggleStep,
        checklistProgress,
        showToast,
        toasts,
        dismissToast,
        gatePassed,
        completeGate,
        reopenGate,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
