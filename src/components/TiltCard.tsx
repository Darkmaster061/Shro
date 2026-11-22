import React, { useRef, useState } from 'react';
import { usePortal } from '../context/PortalContext';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * کارت سه‌بعدی با زاویه ملایم و هاله نور طلایی دنبال‌کننده نشانگر
 * در حالت کم‌حجم یا نمایشگر لمسی به‌صورت خودکار به حالت ایستا و سریع تبدیل می‌شود.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '' }) => {
  const { liteMode } = usePortal();
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glow, setGlow] = useState({ x: 50, y: 50, active: false });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (liteMode || e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 7.5;
    const rotateX = (0.5 - py) * 7.5;
    setStyle({
      transform: `perspective(960px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`,
    });
    setGlow({ x: px * 100, y: py * 100, active: true });
  };

  const handleLeave = () => {
    setStyle({
      transform: 'perspective(960px) rotateX(0deg) rotateY(0deg) translateY(0px)',
    });
    setGlow((g) => ({ ...g, active: false }));
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={style}
      className={`relative h-full rounded-3xl transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {!liteMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-3xl transition-opacity duration-300"
          style={{
            opacity: glow.active ? 1 : 0,
            background: `radial-gradient(360px circle at ${glow.x}% ${glow.y}%, rgba(222, 177, 84, 0.16), transparent 62%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
