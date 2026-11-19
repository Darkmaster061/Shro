import React, { useEffect, useRef } from 'react';
import { usePortal } from '../context/PortalContext';

/**
 * پس‌زمینه شفق و ذرات نورانی سبک برای بخش Hero
 * روی دستگاه‌های ضعیف، حالت کم‌حجم یا prefers-reduced-motion به‌صورت خودکار به گرادیان ایستا تبدیل می‌شود.
 */
export const AuroraHeroCanvas: React.FC = () => {
  const { liteMode, theme } = usePortal();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
    if (liteMode || reducedMotion || lowCpu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const pointer = { x: width * 0.5, y: height * 0.45 };
    const particleCount = Math.min(42, Math.max(18, Math.floor(width / 36)));
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.2 + (i % 3) * 0.9,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.12 - Math.random() * 0.22,
      alpha: 0.2 + Math.random() * 0.45,
      gold: i % 3 === 0,
    }));

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        pointer.x = width * 0.5 + (e.gamma / 45) * width * 0.22;
        pointer.y = height * 0.5 + ((e.beta - 45) / 45) * height * 0.2;
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });

    let t = 0;
    let lastDraw = 0;
    const draw = (now: number) => {
      rafId = window.requestAnimationFrame(draw);
      if (document.hidden || now - lastDraw < 42) return;
      lastDraw = now;
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      // شفق زمردی-طلایی ملایم واکنش‌گر به نشانگر
      const g1 = ctx.createRadialGradient(
        pointer.x,
        pointer.y,
        10,
        pointer.x,
        pointer.y,
        Math.max(width, height) * 0.55
      );
      if (theme === 'dark') {
        g1.addColorStop(0, 'rgba(222, 177, 84, 0.14)');
        g1.addColorStop(0.45, 'rgba(22, 101, 86, 0.16)');
        g1.addColorStop(1, 'rgba(6, 20, 18, 0)');
      } else {
        g1.addColorStop(0, 'rgba(184, 130, 36, 0.12)');
        g1.addColorStop(0.5, 'rgba(20, 92, 78, 0.08)');
        g1.addColorStop(1, 'rgba(247, 246, 241, 0)');
      }
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      // ذرات نورانی شناور
      for (const p of particles) {
        p.x += p.vx + Math.sin(t + p.y * 0.01) * 0.15;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(222, 177, 84, ${theme === 'dark' ? p.alpha : p.alpha * 0.65})`
          : `rgba(89, 184, 163, ${theme === 'dark' ? p.alpha * 0.8 : p.alpha * 0.5})`;
        ctx.fill();
      }
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, [liteMode, theme]);

  if (liteMode) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(222,177,84,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(22,101,86,0.18),transparent_60%)]"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="hero-aurora-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
};
