import { createRoot } from 'react-dom/client';
import 'vazirmatn/Vazirmatn-Variable-font-face.css';
import App from './App.tsx';
import './index.css';

// در محیط پیش‌نمایش توسعه، سرویس‌ورکر قدیمی را پاک کن تا لینک‌های دانلود فایل توسط کش قدیمی ربوده نشوند
if (import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
