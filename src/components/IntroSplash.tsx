import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { LogoEmblem } from './LogoEmblem';

/**
 * ورود سینمایی کوتاه (۲.۲ ثانیه) با دکمه فوری «رد کردن»
 * در حالت کم‌حجم یا autostart نمایش داده نمی‌شود.
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
    if (liteMode) {
      setVisible(false);
      return;
    }
    if (!visible) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem('gonabad_intro_seen', '1');
      setVisible(false);
    }, 2200);
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
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#061412] text-[#f4f1e8] p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-5 mb-6"
          >
            <LogoEmblem type="basij" src={settings.basijLogoUrl} size="lg" />
            <span className="h-12 w-px bg-[#deb154]/40" aria-hidden="true" />
            <LogoEmblem type="heyat" src={settings.heyatLogoUrl} size="lg" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold text-center"
          >
            {settings.siteTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-2 text-sm text-[#deb154]"
          >
            {settings.universityName}
          </motion.p>

          <button
            type="button"
            onClick={skip}
            className="mt-10 px-5 py-2 rounded-xl border border-white/20 text-xs text-white/80 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
          >
            رد کردن
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
