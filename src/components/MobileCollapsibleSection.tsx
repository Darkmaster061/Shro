import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface MobileCollapsibleSectionProps {
  id?: string;
  testId?: string;
  title: string;
  subtitle: string;
  meta?: string;
  icon: React.FC<{ className?: string }>;
  /** وقتی false باشد (یا روی دسکتاپ lg:) کل محتوا به‌صورت کامل و مستقیم نمایش داده می‌شود */
  collapsedOnMobile: boolean;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}

/**
 * افشای تدریجی هوشمند برای موبایل (Progressive Disclosure)
 * بدون حذف هیچ محتوایی، بخش‌های تکمیلی را در نمای خلوت موبایل به کارت‌های تک‌خطی و قابل بازشدن تبدیل می‌کند.
 * در دسکتاپ (lg:) همیشه محتوای کامل بدون تغییر نمایش داده می‌شود.
 */
export const MobileCollapsibleSection: React.FC<MobileCollapsibleSectionProps> = ({
  id,
  testId,
  title,
  subtitle,
  meta,
  icon: Icon,
  collapsedOnMobile,
  defaultOpen = false,
  forceOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = open || forceOpen;

  if (!collapsedOnMobile) {
    return <div id={id}>{children}</div>;
  }

  return (
    <div id={id}>
      {/* نمای موبایل (< lg): کارت جمع‌وجور با قابلیت باز و بسته شدن تک‌لمسی */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 py-2">
        <div className="rounded-2xl border border-line bg-surface overflow-hidden transition-colors">
          <button
            type="button"
            data-testid={testId}
            aria-expanded={isOpen}
            onClick={() => setOpen((v) => !v)}
            className="w-full min-h-[64px] px-4 py-3.5 flex items-center gap-3 text-right cursor-pointer hover:bg-surface-elevated/60 transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-gold-soft text-gold flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-ink truncate">{title}</span>
                {meta && (
                  <span className="text-[11px] font-semibold text-gold shrink-0">· {meta}</span>
                )}
              </span>
              <span className="block text-xs text-ink-muted truncate mt-0.5">{subtitle}</span>
            </span>
            <ChevronDown
              className={`w-5 h-5 text-gold shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="border-t border-line bg-canvas/50">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* نمای دسکتاپ (lg+): همیشه کامل و باز بدون هیچ کادر اضافی */}
      <div className="hidden lg:block">{children}</div>
    </div>
  );
};
