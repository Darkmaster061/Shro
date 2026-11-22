import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from './LogoEmblem';
import { GeometricLatticeBg } from './GeometricLatticeBg';

/**
 * ورود سینمایی کوتاه (۲.۳ ثانیه) با فضای معماری گناباد، خط طلایی نورانی و دکمه فوری «رد کردن»
 * در حالت کم‌حجم، prefers-reduced-motion یا autostart نمایش داده نمی‌شود.
 */
export const IntroSplash: React.FC = () => {
  const { settings, liteMode } = usePortal();
  const [visible, setVisible] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    if (sessionStorage.getItem('gonabad_intro_seen') === '1') return false;
    return true;
  });

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (liteMode || reduced) {
      setVisible(false);
      return;
    }
    if (!visible) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem('gonabad_intro_seen', '1');
      setVisible(false);
    }, 2350);
    return () => window.clearTimeout(timer);
  }, [visible, liteMode]);

  const skip = () => {
    sessionStorage.setItem('gonabad_intro_seen', '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#051210] text-[#f4f1e8] p-6 overflow-hidden"
        >
          {/* هاله معماری گناباد و گره‌چینی محو */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(222,177,84,0.18),transparent_52%),radial-gradient(circle_at_50%_80%,rgba(20,98,82,0.28),transparent_62%)]"
          />
          <GeometricLatticeBg opacity={0.09} />

          <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-xs sm:text-sm font-medium text-[#deb154] tracking-wide mb-5"
            >
              بسم‌الله‌الرحمن‌الرحیم
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-5 mb-6"
            >
              <div className="rounded-full p-1 ring-1 ring-[#deb154]/45 shadow-[0_0_32px_rgba(222,177,84,0.22)]">
                <LogoEmblem type="basij" src={settings.basijLogoUrl} size="lg" />
              </div>
              <span className="h-14 w-px bg-gradient-to-b from-transparent via-[#deb154]/60 to-transparent" aria-hidden="true" />
              <div className="rounded-full p-1 ring-1 ring-[#deb154]/45 shadow-[0_0_32px_rgba(222,177,84,0.22)]">
                <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="lg" />
              </div>
            </motion.div>

            {/* خط نورانی طلایی بازشونده */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="h-[1.5px] w-44 bg-gradient-to-r from-transparent via-[#deb154] to-transparent mb-5"
              aria-hidden="true"
            />

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="text-2xl sm:text-3xl font-extrabold text-[#f4f1e8]"
            >
              {settings.siteTitle}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="mt-2 text-sm font-semibold text-[#f0c76f]"
            >
              {settings.universityName} · خوش آمدی ورودی ۱۴۰۵
            </motion.p>

            {/* نوار پیشرفت باریک پایین */}
            <div className="mt-8 w-40 h-[2px] rounded-full bg-white/15 overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 2.2, ease: 'linear' }}
                className="h-full w-full bg-[#deb154] origin-right"
              />
            </div>

            <button
              type="button"
              onClick={skip}
              className="mt-7 px-5 py-2 rounded-xl border border-white/20 bg-white/5 text-xs text-white/80 hover:text-white hover:border-[#deb154]/60 transition-colors cursor-pointer"
            >
              رد کردن
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
