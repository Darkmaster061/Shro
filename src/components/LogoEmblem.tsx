import React, { useState } from 'react';

interface LogoEmblemProps {
  type: 'basij' | 'heyat';
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-9 h-9',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

/**
 * نمایشگر لوگوی بسیج یا هیئت با قابلیت جایگزینی خودکار از پنل ادمین
 * تا زمان آپلود لوگوی رسمی، نشان هندسی ایرانی اختصاصی نمایش داده می‌شود.
 */
export const LogoEmblem: React.FC<LogoEmblemProps> = ({
  type,
  src,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const label = type === 'basij' ? 'لوگوی بسیج دانشجویی' : 'لوگوی هیئت دانشجویی';

  if (src && !failed) {
    return (
      <div
        className={`${SIZE_MAP[size]} rounded-2xl overflow-hidden border border-line bg-surface flex items-center justify-center shrink-0 p-1 ${className}`}
      >
        <img
          src={src}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className={`${SIZE_MAP[size]} rounded-2xl border border-gold/30 bg-emerald-deep/90 dark:bg-emerald-deep/80 flex items-center justify-center shrink-0 shadow-sm ${className}`}
    >
      {type === 'basij' ? (
        <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" fill="none" aria-hidden="true">
          <polygon
            points="32,6 39,25 58,32 39,39 32,58 25,39 6,32 25,25"
            stroke="#DEB154"
            strokeWidth="2.4"
            fill="#DEB154"
            fillOpacity="0.16"
          />
          <polygon
            points="32,14 45,19 50,32 45,45 32,50 19,45 14,32 19,19"
            stroke="#59B8A3"
            strokeWidth="1.6"
            fill="none"
          />
          <circle cx="32" cy="32" r="6" fill="#DEB154" />
        </svg>
      ) : (
        <svg viewBox="0 0 64 64" className="w-[74%] h-[74%]" fill="none" aria-hidden="true">
          <path
            d="M32 9C24 18 16 25 16 37C16 46 23 53 32 53C41 53 48 46 48 37C48 25 40 18 32 9Z"
            stroke="#DEB154"
            strokeWidth="2.4"
            fill="#DEB154"
            fillOpacity="0.14"
          />
          <path
            d="M32 18C27 24 23 29 23 36.5C23 41.8 27 46 32 46C37 46 41 41.8 41 36.5C41 29 37 24 32 18Z"
            stroke="#59B8A3"
            strokeWidth="1.6"
          />
          <circle cx="32" cy="35" r="4.5" fill="#DEB154" />
        </svg>
      )}
    </div>
  );
};
