import React, { useRef, useState } from 'react';
import { usePortal } from '../context/PortalContext';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * کارت سه‌بعدی با افکت زاویه ملایم و نور دنبال‌کننده نشانگر
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
    const rotateY = (px - 0.5) * 9;
    const rotateX = (0.5 - py) * 9;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`,
    });
    setGlow({ x: px * 100, y: py * 100, active: true });
  };

  const handleLeave = () => {
    setStyle({ transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)' });
    setGlow((g) => ({ ...g, active: false }));
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={style}
      className={`relative rounded-2xl transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {!liteMode && glow.active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-70 transition-opacity duration-200"
          style={{
            background: `radial-gradient(320px circle at ${glow.x}% ${glow.y}%, rgba(222, 177, 84, 0.14), transparent 65%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
