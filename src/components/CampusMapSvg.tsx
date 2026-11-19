import React, { useMemo, useState } from 'react';
import { Clock, Compass, Info, Layers, MapPin, Navigation } from 'lucide-react';
import { CAMPUS_MAP_NODES, type CampusMapNode } from '../data/orientation';
import { toPersianDigits } from '../utils/persian';

/**
 * نقشه معماری تعاملی واقعی ساختمان اصلی دانشگاه گناباد (صددرصد آفلاین با SVG بومی)
 * منطبق با پلان دو حیاط مرکزی ساختمان اصلی و کدگذاری رنگی ۸ نقطه کلیدی ثبت‌نام.
 */
export const CampusMapSvg: React.FC = () => {
  const [selected, setSelected] = useState<CampusMapNode>(CAMPUS_MAP_NODES[0]);

  // مختصات نقطه ورود از بلوار شهدای گمنام (سمت پایین-چپ نقشه)
  const entryPoint = { x: 158, y: 392 };

  // مسیر راهنمای پیاده‌روی از ورودی اصلی تا نقطه انتخاب‌شده (با عبور از حیاط ورودی)
  const routePath = useMemo(() => {
    const plazaX = 420;
    const plazaY = 344;
    if (selected.id === 'edu') {
      return `M ${entryPoint.x} ${entryPoint.y} Q 230 398, ${selected.x} ${selected.y}`;
    }
    return `M ${entryPoint.x} ${entryPoint.y} Q 290 402, ${plazaX} ${plazaY} Q ${(plazaX + selected.x) / 2 + 12} ${(plazaY + selected.y) / 2}, ${selected.x} ${selected.y}`;
  }, [selected]);

  return (
    <div
      data-testid="interactive-campus-map"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* بوم نقشه معماری واقعی ساختمان اصلی */}
      <div className="lg:col-span-7 rounded-3xl border border-line bg-surface p-4 sm:p-6 flex flex-col justify-between gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-ink">
              پلان رنگی ساختمان اصلی دانشگاه گناباد
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              منطبق با چیدمان واقعی دو حیاط مرکزی در روزهای ثبت‌نام — روی هر نقطه رنگی کلیک کن تا مسیر و راهنمایش نمایش داده شود.
            </p>
          </div>
          <span className="text-xs text-gold font-semibold inline-flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5" />
            <span>{toPersianDigits(CAMPUS_MAP_NODES.length)} بخش کلیدی</span>
          </span>
        </div>

        <div className="relative w-full overflow-hidden rounded-2xl border border-gold/25 bg-[#061815] text-[#f4f1e8] shadow-inner">
          <svg
            viewBox="0 0 760 480"
            className="w-full h-auto block select-none"
            role="img"
            aria-label="پلان معماری رنگی و تعاملی ساختمان اصلی دانشگاه گناباد"
          >
            <defs>
              <pattern id="campusRealGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="rgba(222,177,84,0.07)"
                  strokeWidth="1"
                />
              </pattern>
              <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#16423a" />
                <stop offset="100%" stopColor="#0d2a25" />
              </linearGradient>
              <linearGradient id="courtyardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#07211c" />
                <stop offset="100%" stopColor="#0b2f28" />
              </linearGradient>
              <filter id="pinGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.55" />
              </filter>
              <marker
                id="entryArrowHead"
                markerWidth="8"
                markerHeight="8"
                refX="5"
                refY="4"
                orient="auto"
              >
                <path d="M 0 1 L 7 4 L 0 7 Z" fill="#deb154" />
              </marker>
            </defs>

            <rect width="760" height="480" fill="url(#campusRealGrid)" />

            {/* جاده و بلوار ورودی */}
            <path
              d="M 0 32 L 760 112"
              fill="none"
              stroke="rgba(244,241,232,0.08)"
              strokeWidth="20"
            />
            <path
              d="M 34 480 L 148 398 L 690 278"
              fill="none"
              stroke="rgba(244,241,232,0.08)"
              strokeWidth="18"
              strokeLinecap="round"
            />

            {/* پلان دو حیاط مرکزی ساختمان اصلی دانشگاه (با زاویه واقعی ~۳۲- درجه نسبت به شمال) */}
            <g transform="translate(380, 232) rotate(-32)">
              {/* سایه عمیق حجم ساختمان */}
              <g transform="translate(-14, -14)" opacity="0.5">
                <rect x="-245" y="-82" width="205" height="176" rx="6" fill="#030d0b" />
                <rect x="-40" y="-58" width="76" height="148" rx="4" fill="#030d0b" />
                <rect x="36" y="-114" width="212" height="196" rx="6" fill="#030d0b" />
              </g>

              {/* محوطه سنگ‌فرش و فضای سبز ورودی روبه‌روی ساختمان */}
              <rect
                x="-240"
                y="108"
                width="470"
                height="112"
                rx="12"
                fill="rgba(22, 66, 58, 0.25)"
                stroke="rgba(222,177,84,0.18)"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <rect x="-210" y="126" width="130" height="72" rx="6" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(89,184,163,0.22)" />
              <rect x="-45" y="126" width="106" height="72" rx="6" fill="rgba(222, 177, 84, 0.07)" stroke="rgba(222,177,84,0.22)" />
              <rect x="92" y="126" width="118" height="72" rx="6" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(89,184,163,0.22)" />

              {/* بدنه بال غربی (آموزش و حیاط صبحانه) */}
              <rect
                x="-245"
                y="-82"
                width="205"
                height="176"
                rx="6"
                fill="url(#roofGrad)"
                stroke="rgba(222,177,84,0.52)"
                strokeWidth="1.8"
              />
              {/* حیاط مرکزی غربی */}
              <rect
                x="-205"
                y="-44"
                width="126"
                height="98"
                rx="4"
                fill="url(#courtyardGrad)"
                stroke="rgba(89,184,163,0.45)"
                strokeWidth="1.3"
              />
              <line x1="-205" y1="5" x2="-79" y2="5" stroke="rgba(89,184,163,0.22)" strokeDasharray="3 3" />
              <line x1="-142" y1="-44" x2="-142" y2="54" stroke="rgba(89,184,163,0.22)" strokeDasharray="3 3" />

              {/* بدنه پل و لابی مرکزی (محل سایت ۱ و میزهای بسیج و هیئت) */}
              <rect
                x="-40"
                y="-58"
                width="76"
                height="148"
                rx="4"
                fill="#194b42"
                stroke="rgba(222,177,84,0.68)"
                strokeWidth="2"
              />
              {/* هایلایت معماری لابی مرکزی (آبی) */}
              <rect
                x="-14"
                y="-24"
                width="44"
                height="62"
                rx="8"
                fill="rgba(59, 130, 246, 0.32)"
                stroke="rgba(59, 130, 246, 0.85)"
                strokeWidth="1.5"
              />
              {/* نوار فیروزه‌ای میزهای بسیج (جلو-راست لابی) */}
              <rect
                x="18"
                y="42"
                width="54"
                height="14"
                rx="7"
                fill="rgba(34, 211, 238, 0.42)"
                stroke="#22d3ee"
                strokeWidth="1.4"
              />
              {/* نوار فیروزه‌ای تیره میزهای هیئت (جلو-چپ لابی) */}
              <rect
                x="-48"
                y="48"
                width="36"
                height="14"
                rx="7"
                fill="rgba(13, 148, 136, 0.55)"
                stroke="#14b8a6"
                strokeWidth="1.4"
              />
              {/* ناحیه زرد پذیرایی صبحانه هیئت */}
              <rect
                x="-76"
                y="-6"
                width="30"
                height="28"
                rx="8"
                fill="rgba(250, 204, 21, 0.42)"
                stroke="#facc15"
                strokeWidth="1.5"
              />
              {/* ناحیه قرمز آموزش */}
              <rect
                x="-166"
                y="62"
                width="52"
                height="24"
                rx="8"
                fill="rgba(239, 68, 68, 0.42)"
                stroke="#ef4444"
                strokeWidth="1.5"
              />
              {/* ناحیه سبز پایگاه بسیج برادران */}
              <rect
                x="-36"
                y="-76"
                width="38"
                height="22"
                rx="8"
                fill="rgba(34, 197, 94, 0.4)"
                stroke="#22c55e"
                strokeWidth="1.5"
              />

              {/* بدنه بال شرقی (تریا، انتشارات و پایگاه بسیج خواهران) */}
              <rect
                x="36"
                y="-114"
                width="212"
                height="196"
                rx="6"
                fill="url(#roofGrad)"
                stroke="rgba(222,177,84,0.52)"
                strokeWidth="1.8"
              />
              {/* حیاط مرکزی شرقی */}
              <rect
                x="76"
                y="-74"
                width="132"
                height="116"
                rx="4"
                fill="url(#courtyardGrad)"
                stroke="rgba(89,184,163,0.45)"
                strokeWidth="1.3"
              />
              <line x1="76" y1="-16" x2="208" y2="-16" stroke="rgba(89,184,163,0.22)" strokeDasharray="3 3" />
              <line x1="142" y1="-74" x2="142" y2="42" stroke="rgba(89,184,163,0.22)" strokeDasharray="3 3" />

              {/* ناحیه نارنجی تریا */}
              <rect
                x="114"
                y="-108"
                width="82"
                height="24"
                rx="9"
                fill="rgba(249, 115, 22, 0.42)"
                stroke="#f97316"
                strokeWidth="1.5"
              />
              {/* ناحیه بنفش انتشارات (همکف) و بسیج خواهران (طبقه اول) */}
              <rect
                x="208"
                y="-38"
                width="32"
                height="46"
                rx="9"
                fill="rgba(168, 85, 247, 0.42)"
                stroke="#a855f7"
                strokeWidth="1.5"
              />
            </g>

            {/* برچسب‌های راهنمای محوطه */}
            <text x="234" y="294" textAnchor="middle" fill="rgba(166,186,180,0.68)" fontSize="10.5">
              حیاط غربی
            </text>
            <text x="506" y="160" textAnchor="middle" fill="rgba(166,186,180,0.68)" fontSize="10.5">
              حیاط شرقی
            </text>
            <text x="478" y="388" textAnchor="middle" fill="rgba(222,177,84,0.75)" fontSize="11" fontWeight="600">
              محوطه ورودی دانشگاه گناباد
            </text>

            {/* فلش مسیر ورود از سمت بلوار شهدای گمنام */}
            <g>
              <path
                d="M 88 430 Q 124 405, 166 388"
                fill="none"
                stroke="#deb154"
                strokeWidth="3.5"
                strokeLinecap="round"
                markerEnd="url(#entryArrowHead)"
              />
              <rect
                x="30"
                y="436"
                width="136"
                height="26"
                rx="8"
                fill="rgba(11, 31, 28, 0.92)"
                stroke="rgba(222,177,84,0.5)"
                strokeWidth="1.1"
              />
              <text x="98" y="453" textAnchor="middle" fill="#deb154" fontSize="11" fontWeight="700">
                ورود از بلوار شهدای گمنام
              </text>
            </g>

            {/* خط مسیر پیاده‌روی زنده تا بخش انتخاب‌شده */}
            <path
              d={routePath}
              fill="none"
              stroke={selected.color}
              strokeWidth="3.2"
              strokeDasharray="7 5"
              strokeLinecap="round"
              opacity="0.92"
            />

            {/* قطب‌نمای شمال گوشه بالا-چپ */}
            <g transform="translate(46, 48)">
              <circle r="21" fill="rgba(11, 31, 28, 0.9)" stroke="rgba(222,177,84,0.45)" strokeWidth="1.2" />
              <path d="M 0 -13 L 4.5 0 L 0 -3 L -4.5 0 Z" fill="#ef4444" />
              <path d="M 0 13 L 4.5 0 L 0 3 L -4.5 0 Z" fill="rgba(244,241,232,0.45)" />
              <text y="-25" textAnchor="middle" fill="#deb154" fontSize="10.5" fontWeight="700">
                شمال
              </text>
            </g>

            {/* پین‌های رنگی تعاملی برای هر ۸ بخش واقعی دانشگاه */}
            {CAMPUS_MAP_NODES.map((node, idx) => {
              const isSelected = node.id === selected.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelected(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(node);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${node.shortLabel} (${node.colorLabel})`}
                  className="cursor-pointer focus:outline-none"
                  filter="url(#pinGlow)"
                >
                  {isSelected && (
                    <circle
                      r="25"
                      fill={node.color}
                      fillOpacity="0.24"
                      stroke={node.color}
                      strokeWidth="1.8"
                    />
                  )}
                  <circle
                    r={isSelected ? 17 : 14}
                    fill={node.color}
                    stroke="#061815"
                    strokeWidth={isSelected ? 3 : 2.2}
                  />
                  <text
                    y="4.5"
                    textAnchor="middle"
                    fill="#061815"
                    fontSize={isSelected ? '13' : '11.5'}
                    fontWeight="900"
                  >
                    {toPersianDigits(idx + 1)}
                  </text>
                </g>
              );
            })}

            {/* برچسب شناور خوانا کنار پین انتخاب‌شده بدون هم‌پوشانی با سایر پین‌ها */}
            <g
              transform={`translate(${Math.min(625, Math.max(135, selected.x))}, ${
                selected.y < 125 ? selected.y + 38 : selected.y - 34
              })`}
            >
              <rect
                x="-94"
                y="-15"
                width="188"
                height="28"
                rx="9"
                fill="rgba(6, 24, 21, 0.95)"
                stroke={selected.color}
                strokeWidth="1.6"
              />
              <text
                y="3.5"
                textAnchor="middle"
                fill="#f4f1e8"
                fontSize="11.5"
                fontWeight="700"
              >
                {selected.shortLabel}
              </text>
            </g>
          </svg>
        </div>

        {/* راهنمای رنگی تعاملی (دکمه‌های سریع هر ۸ بخش با رنگ واقعی) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CAMPUS_MAP_NODES.map((node, idx) => {
            const active = selected.id === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelected(node)}
                aria-pressed={active}
                className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 text-right ${
                  active
                    ? 'bg-emerald-deep text-[#f4f1e8] border border-gold shadow-sm'
                    : 'bg-canvas border border-line text-ink-muted hover:text-ink hover:border-gold/40'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-black/20"
                  style={{ backgroundColor: node.color }}
                  aria-hidden="true"
                />
                <span className="truncate">
                  {toPersianDigits(idx + 1)}. {node.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* کارت جزئیات بخش انتخاب‌شده */}
      <div className="lg:col-span-5 rounded-3xl border border-line bg-surface p-6 sm:p-7 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
            <span className="font-bold text-ink inline-flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: selected.color }}
                aria-hidden="true"
              />
              <span>رنگ {selected.colorLabel}</span>
              <span className="text-ink-muted">·</span>
              <span className="text-gold">{selected.category}</span>
            </span>
            {selected.stepBadge && (
              <span className="px-2.5 py-1 rounded-lg bg-gold-soft text-gold font-bold text-[11px]">
                {selected.stepBadge}
              </span>
            )}
          </div>

          <h4 className="text-xl sm:text-2xl font-extrabold text-ink leading-snug">
            {selected.label}
          </h4>
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">{selected.description}</p>

          <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
            <div className="rounded-xl border border-line bg-canvas p-3.5 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-ink-muted block">موقعیت و طبقه</span>
                <span className="text-sm text-ink font-semibold">{selected.floor}</span>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3.5 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-ink-muted block">ساعت پاسخگویی و فعالیت</span>
                <span className="text-sm text-ink font-semibold">{selected.hours}</span>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3.5 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-ink-muted block">نکته کاربردی برای نوورود</span>
                <span className="text-sm text-ink leading-relaxed">{selected.tip}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-line space-y-2.5">
          <p className="text-[11px] text-ink-muted flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>خراسان رضوی، گناباد، بلوار قصبه، انتهای بلوار شهدای گمنام، مجتمع آموزش عالی گناباد</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            <a
              href="https://neshan.org/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-bold transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>مسیریابی دانشگاه در نشان</span>
            </a>
            <a
              href="https://balad.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-line bg-canvas text-ink hover:border-gold/50 text-xs font-bold transition-colors"
            >
              <span>مسیریابی در بلد</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
