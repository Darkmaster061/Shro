import React, { useEffect, useRef } from 'react';
import { usePortal } from '../context/PortalContext';

/**
 * پس‌زمینه سینمایی شفق زمردی-طلایی و ذرات نورانی برای بخش Hero
 * روی دستگاه‌های ضعیف، حالت کم‌حجم یا prefers-reduced-motion به‌صورت خودکار به گرادیان ایستا تبدیل می‌شود.
 */
export const AuroraHeroCanvas: React.FC = () => {
  const { liteMode, theme } = usePortal();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowCpu =
      typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
    if (liteMode || reducedMotion || lowCpu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const targetPointer = { x: width * 0.55, y: height * 0.4 };
    const pointer = { x: width * 0.55, y: height * 0.4 };

    const particleCount = Math.min(52, Math.max(22, Math.floor(width / 30)));
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.1 + (i % 4) * 0.65,
      vx: (Math.random() - 0.5) * 0.24,
      vy: -0.1 - Math.random() * 0.24,
      alpha: 0.22 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      gold: i % 3 !== 2,
    }));

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetPointer.x = e.clientX - rect.left;
      targetPointer.y = e.clientY - rect.top;
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        targetPointer.x = width * 0.5 + (e.gamma / 45) * width * 0.24;
        targetPointer.y = height * 0.45 + ((e.beta - 45) / 45) * height * 0.22;
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });

    let t = 0;
    let lastDraw = 0;
    const draw = (now: number) => {
      rafId = window.requestAnimationFrame(draw);
      if (document.hidden || now - lastDraw < 34) return;
      lastDraw = now;
      t += 0.014;

      // نرمی حرکت شفق به سمت نشانگر
      pointer.x += (targetPointer.x - pointer.x) * 0.06;
      pointer.y += (targetPointer.y - pointer.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // لایه ۱: هاله طلایی اصلی واکنش‌گر به نشانگر
      const g1 = ctx.createRadialGradient(
        pointer.x,
        pointer.y,
        12,
        pointer.x,
        pointer.y,
        Math.max(width, height) * 0.52
      );
      if (theme === 'dark') {
        g1.addColorStop(0, 'rgba(222, 177, 84, 0.19)');
        g1.addColorStop(0.42, 'rgba(20, 98, 82, 0.18)');
        g1.addColorStop(1, 'rgba(5, 18, 16, 0)');
      } else {
        g1.addColorStop(0, 'rgba(184, 130, 36, 0.14)');
        g1.addColorStop(0.48, 'rgba(20, 92, 78, 0.08)');
        g1.addColorStop(1, 'rgba(247, 246, 241, 0)');
      }
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      // لایه ۲: نوار شفق زمردی-فیروزه‌ای آرام و پیوسته در افق
      const waveX = width * (0.28 + Math.sin(t * 0.55) * 0.14);
      const waveY = height * (0.68 + Math.cos(t * 0.45) * 0.1);
      const g2 = ctx.createRadialGradient(
        waveX,
        waveY,
        20,
        waveX,
        waveY,
        Math.max(width, height) * 0.48
      );
      if (theme === 'dark') {
        g2.addColorStop(0, 'rgba(32, 142, 118, 0.18)');
        g2.addColorStop(0.55, 'rgba(11, 59, 50, 0.1)');
        g2.addColorStop(1, 'rgba(5, 18, 16, 0)');
      } else {
        g2.addColorStop(0, 'rgba(20, 92, 78, 0.1)');
        g2.addColorStop(0.6, 'rgba(184, 130, 36, 0.05)');
        g2.addColorStop(1, 'rgba(247, 246, 241, 0)');
      }
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      // لایه ۳: ذرات نورانی طلایی و زمردی با چشمک ملایم
      for (const p of particles) {
        p.x += p.vx + Math.sin(t + p.y * 0.008) * 0.14;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const twinkle = 0.65 + 0.35 * Math.sin(t * 1.9 + p.phase);
        const a = p.alpha * twinkle * (theme === 'dark' ? 1 : 0.6);

        // هاله ظریف اطراف ذرات بزرگ‌تر
        if (p.r > 2.0 && theme === 'dark') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = p.gold
            ? `rgba(222, 177, 84, ${(a * 0.22).toFixed(3)})`
            : `rgba(89, 184, 163, ${(a * 0.18).toFixed(3)})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(232, 192, 102, ${a.toFixed(3)})`
          : `rgba(98, 196, 174, ${(a * 0.82).toFixed(3)})`;
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(222,177,84,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(22,101,86,0.22),transparent_60%)]"
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
