import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { PortalProvider, usePortal } from './context/PortalContext';
import { Layout } from './components/Layout';
import { WelcomeGate } from './components/WelcomeGate';
import { IntroSplash } from './components/IntroSplash';
import { HomePage } from './pages/HomePage';

// بارگذاری تنبلانه صفحات فرعی برای سرعت اولیه زیر ۳ ثانیه روی 4G
const GuidePage = lazy(() =>
  import('./pages/GuidePage').then((m) => ({ default: m.GuidePage }))
);
const DormsPage = lazy(() =>
  import('./pages/DormsPage').then((m) => ({ default: m.DormsPage }))
);
const BasijPage = lazy(() =>
  import('./pages/BasijPage').then((m) => ({ default: m.BasijPage }))
);
const HeyatPage = lazy(() =>
  import('./pages/HeyatPage').then((m) => ({ default: m.HeyatPage }))
);
const AnnouncementsPage = lazy(() =>
  import('./pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const GalleryPage = lazy(() =>
  import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage }))
);
const CouponPage = lazy(() =>
  import('./pages/CouponPage').then((m) => ({ default: m.CouponPage }))
);
const DeskPage = lazy(() =>
  import('./pages/DeskPage').then((m) => ({ default: m.DeskPage }))
);
const ScannerPage = lazy(() =>
  import('./pages/ScannerPage').then((m) => ({ default: m.ScannerPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function PageFallback() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 text-center text-sm text-ink-muted">
      در حال بارگذاری صفحه...
    </div>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  const { liteMode } = usePortal();
  const isStaffRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/scanner') ||
    pathname.startsWith('/desk');

  return (
    <>
      <ScrollManager />
      {!isStaffRoute && <IntroSplash />}
      {!isStaffRoute && <WelcomeGate />}

      <Suspense fallback={<PageFallback />}>
        {isStaffRoute ? (
          <Routes>
            <Route path="/desk" element={<DeskPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        ) : (
          <Layout>
            <motion.div
              key={pathname}
              initial={liteMode ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/guide" element={<GuidePage />} />
                <Route path="/dorms" element={<DormsPage />} />
                <Route path="/basij" element={<BasijPage />} />
                <Route path="/heyat" element={<HeyatPage />} />
                <Route path="/coupon" element={<CouponPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </motion.div>
          </Layout>
        )}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <PortalProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </PortalProvider>
  );
}
