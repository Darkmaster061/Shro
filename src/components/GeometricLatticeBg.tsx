import React, { useId } from 'react';

interface GeometricLatticeBgProps {
  /** شفافیت کلی نقش گره‌چینی (پیش‌فرض ظریف و غیرمزاحم) */
  opacity?: number;
  /** رنگ خطوط گره‌چینی (به‌صورت پیش‌فرض از رنگ تأکید تم استفاده می‌کند) */
  strokeColor?: string;
  className?: string;
}

/**
 * پس‌زمینه گره‌چینی ایرانی-اسلامی مدرن (SVG صددرصد محلی و سبک)
 * هویت معنوی و معماری ایرانی را با کمترین هزینه پردازشی به هدرها و چارت اضافه می‌کند.
 */
export const GeometricLatticeBg: React.FC<GeometricLatticeBgProps> = ({
  opacity = 0.08,
  strokeColor = 'var(--color-accent)',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const patternId = `girih-pattern-${uid}`;
  const maskId = `girih-mask-${uid}`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* الگوی گره هشت‌ضلعی شمسه مدرن */}
          <pattern
            id={patternId}
            width="84"
            height="84"
            patternUnits="userSpaceOnUse"
          >
            <g
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.9"
              opacity={opacity}
            >
              {/* مربع و لوزی متقاطع (شمسه هشت‌پر) */}
              <rect x="24" y="24" width="36" height="36" />
              <rect
                x="24"
                y="24"
                width="36"
                height="36"
                transform="rotate(45 42 42)"
              />
              {/* خطوط اتصال معماری به لبه‌ها */}
              <path d="M42 0 L42 16.5 M42 67.5 L42 84 M0 42 L16.5 42 M67.5 42 L84 42" />
              <path d="M0 0 L24 24 M84 0 L60 24 M0 84 L24 60 M84 84 L60 60" opacity="0.55" />
              <circle cx="42" cy="42" r="7" />
            </g>
          </pattern>

          <radialGradient id={`${maskId}-grad`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0.06" />
          </radialGradient>

          <mask id={maskId}>
            <rect width="100%" height="100%" fill={`url(#${maskId}-grad)`} />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
};
