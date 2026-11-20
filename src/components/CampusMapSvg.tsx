import React, { useMemo, useState } from 'react';
import { Clock, Compass, Footprints, Info, Layers, MapPin, Navigation } from 'lucide-react';
import { CAMPUS_MAP_NODES, type CampusMapNode } from '../data/orientation';
import { toPersianDigits } from '../utils/persian';

/**
 * جایگاه هوشمند برچسب شناور برای هر پین تا هیچ‌وقت روی پین‌های مجاور یا لبه نقشه نیفتد
 */
function getCalloutPosition(node: CampusMapNode): { x: number; y: number; width: number } {
  const width = node.id === 'press-sisters' ? 214 : 176;
  switch (node.id) {
    case 'press-sisters':
      // گوشه پایینی سمت شرق بال دوم (۵۸۰، ۱۸۳) — قرارگیری برچسب زیر پین بدون برخورد با پین ۷ و ۱
      return { x: 590, y: 230, width };
    case 'cafeteria':
      // ضلع شرقی (۵۵۱، ۱۳۱) — قرارگیری برچسب بالا/راست بدون برخورد با پین ۸
      return { x: 642, y: 90, width };
    case 'basij-base':
      // گوشه بالایی سمت راست سالن مرکزی (۳۵۷، ۱۸۵) — قرارگیری برچسب بالای پین
      return { x: 342, y: 142, width };
    case 'lobby':
      return { x: 386, y: 208, width };
    case 'basij-desks':
      return { x: 545, y: 268, width };
    case 'heyat-desks':
      return { x: 492, y: 318, width };
    case 'breakfast':
      return { x: 214, y: 312, width };
    case 'edu':
      return { x: 307, y: 416, width };
    default:
      return {
        x: Math.min(635, Math.max(125, node.x)),
        y: node.y < 125 ? node.y + 38 : node.y - 34,
        width,
      };
  }
}

/**
 * نقشه معماری تعاملی واقعی ساختمان اصلی دانشگاه گناباد (صددرصد آفلاین با SVG بومی)
 * منطبق با پلان دو حیاط مرکزی و کدگذاری رنگی ۸ نقطه کلیدی ثبت‌نام (گام صفر تا تحویل مدارک).
 */
export const CampusMapSvg: React.FC = () => {
  const [selected, setSelected] = useState<CampusMapNode>(CAMPUS_MAP_NODES[0]);

  const routePointsStr = useMemo(
    () => selected.routeWaypoints.map(([px, py]) => `${px},${py}`).join(' '),
    [selected]
  );

  const callout = useMemo(() => getCalloutPosition(selected), [selected]);

  return (
    <div
      data-testid="interactive-campus-map"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* بوم نقشه معماری واقعی ساختمان اصلی */}
      <div className="lg:col-span-7 rounded-3xl border border-line bg-surface p-4 sm:p-6 flex flex-col justify-between gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-ink">
              پلان رنگی ساختمان اصلی دانشگاه گناباد
            </h3>
            <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
              منطبق با چیدمان واقعی دو حیاط مرکزی در روزهای ثبت‌نام — روی هر شماره یا دکمه زیر نقشه بزن تا مسیر پیاده‌روی و راهنمایش روشن شود.
            </p>
          </div>
          <span className="text-xs text-gold font-semibold inline-flex items-center gap-1 shrink-0 bg-gold-soft/60 px-2.5 py-1 rounded-lg border border-gold/25">
            <Navigation className="w-3.5 h-3.5" />
            <span>{toPersianDigits(CAMPUS_MAP_NODES.length)} بخش کلیدی</span>
          </span>
        </div>

        {/* نوار خلاصه مسیر پیشنهادی روز ثبت‌نام برای جلوگیری از سردرگمی */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted bg-canvas/90 border border-line rounded-xl px-3 py-2">
          <span className="font-bold text-gold ml-1">ترتیب پیشنهادی ورود:</span>
          {[
            { node: CAMPUS_MAP_NODES[0], label: '۱. میز بسیج (گام صفر)' },
            { node: CAMPUS_MAP_NODES[1], label: '۲. لابی و سایت ۱' },
            { node: CAMPUS_MAP_NODES[3], label: '۴. صبحانه هیئت' },
            { node: CAMPUS_MAP_NODES[4], label: '۵. آموزش (تحویل مدارک)' },
          ].map((item, idx) => {
            const isCurrent = selected.id === item.node.id;
            return (
              <React.Fragment key={item.node.id}>
                {idx > 0 && (
                  <span aria-hidden="true" className="text-ink-muted/60">
                    ←
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(item.node)}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer font-semibold ${
                    isCurrent
                      ? 'bg-gold/15 text-gold border border-gold/40'
                      : 'text-ink hover:text-gold hover:bg-surface-elevated border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="relative w-full overflow-hidden rounded-2xl border border-gold/30 bg-[#051512] text-[#f4f1e8] shadow-inner">
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
                  stroke="rgba(222,177,84,0.065)"
                  strokeWidth="1"
                />
              </pattern>
              <radialGradient id="campusAmbient" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="rgba(19, 78, 66, 0.28)" />
                <stop offset="100%" stopColor="rgba(5, 21, 18, 0)" />
              </radialGradient>
              <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#16463e" />
                <stop offset="100%" stopColor="#0c2823" />
              </linearGradient>
              <linearGradient id="hallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1d544a" />
                <stop offset="100%" stopColor="#123831" />
              </linearGradient>
              <linearGradient id="courtyardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#071e1a" />
                <stop offset="100%" stopColor="#0b2e27" />
              </linearGradient>
              <filter id="pinGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="3" stdDeviation="4.5" floodColor="#000000" floodOpacity="0.6" />
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

            {/* پس‌زمینه مشبک معماری + هاله ملایم مرکز */}
            <rect width="760" height="480" fill="url(#campusRealGrid)" />
            <rect width="760" height="480" fill="url(#campusAmbient)" />

            {/* جاده شمالی و بلوار ورودی جنوبی */}
            <path
              d="M 0 38 L 760 118"
              fill="none"
              stroke="rgba(244,241,232,0.06)"
              strokeWidth="18"
            />
            <path
              d="M 28 480 L 148 412 L 700 286"
              fill="none"
              stroke="rgba(244,241,232,0.07)"
              strokeWidth="18"
              strokeLinecap="round"
            />

            {/* پلان معماری دو حیاط مرکزی ساختمان اصلی (با حاشیه امن بالا برای گوشه شمال شرقی) */}
            <g transform="translate(380, 248) scale(0.92) rotate(-32)">
              {/* سایه عمیق حجم ساختمان */}
              <g transform="translate(-12, -12)" opacity="0.52">
                <rect x="-245" y="-82" width="205" height="176" rx="8" fill="#020a08" />
                <rect x="-40" y="-88" width="76" height="178" rx="6" fill="#020a08" />
                <rect x="36" y="-114" width="212" height="196" rx="8" fill="#020a08" />
              </g>

              {/* محوطه سنگ‌فرش و فضای سبز ورودی روبه‌روی ساختمان */}
              <rect
                x="-240"
                y="106"
                width="474"
                height="110"
                rx="14"
                fill="rgba(22, 66, 58, 0.22)"
                stroke="rgba(222,177,84,0.22)"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              {/* باغچه‌ها و مسیرهای سنگ‌فرش محوطه */}
              <rect x="-214" y="124" width="128" height="72" rx="8" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(89,184,163,0.22)" />
              <rect x="-48" y="124" width="108" height="72" rx="8" fill="rgba(222, 177, 84, 0.08)" stroke="rgba(222,177,84,0.28)" />
              <rect x="94" y="124" width="118" height="72" rx="8" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(89,184,163,0.22)" />
              {/* نشانگر درب اصلی ورودی وسط ساختمان */}
              <rect x="-12" y="88" width="44" height="14" rx="4" fill="#deb154" fillOpacity="0.28" stroke="#deb154" strokeWidth="1.2" />

              {/* ========== بال غربی (آموزش و حیاط صبحانه) ========== */}
              <rect
                x="-245"
                y="-82"
                width="205"
                height="176"
                rx="8"
                fill="url(#roofGrad)"
                stroke="rgba(222,177,84,0.55)"
                strokeWidth="1.8"
              />
              {/* حیاط مرکزی غربی */}
              <rect
                x="-205"
                y="-44"
                width="126"
                height="98"
                rx="5"
                fill="url(#courtyardGrad)"
                stroke="rgba(89,184,163,0.48)"
                strokeWidth="1.3"
              />
              <line x1="-205" y1="5" x2="-79" y2="5" stroke="rgba(89,184,163,0.18)" strokeDasharray="3 3" />
              <line x1="-142" y1="-44" x2="-142" y2="54" stroke="rgba(89,184,163,0.18)" strokeDasharray="3 3" />
              <circle cx="-142" cy="5" r="8" fill="rgba(89,184,163,0.12)" stroke="rgba(89,184,163,0.35)" strokeWidth="1" />

              {/* ۴. ناحیه زرد پذیرایی صبحانه هیئت (در ضلع پایینی و گوشه پایین حیاط غربی) */}
              <rect
                x="-124"
                y="20"
                width="44"
                height="32"
                rx="7"
                fill={selected.id === 'breakfast' ? 'rgba(250, 204, 21, 0.62)' : 'rgba(250, 204, 21, 0.36)'}
                stroke="#facc15"
                strokeWidth={selected.id === 'breakfast' ? 2.2 : 1.5}
              />

              {/* ۵. ناحیه قرمز آموزش (ضلع جلویی بال غربی رو به محوطه) */}
              <rect
                x="-166"
                y="62"
                width="52"
                height="24"
                rx="7"
                fill={selected.id === 'edu' ? 'rgba(239, 68, 68, 0.62)' : 'rgba(239, 68, 68, 0.38)'}
                stroke="#ef4444"
                strokeWidth={selected.id === 'edu' ? 2.2 : 1.5}
              />

              {/* ========== سالن و لابی مرکزی (امتدادیافته تا گوشه بالا برای پایگاه بسیج) ========== */}
              <rect
                x="-40"
                y="-88"
                width="76"
                height="178"
                rx="6"
                fill="url(#hallGrad)"
                stroke="rgba(222,177,84,0.72)"
                strokeWidth="2"
              />
              {/* ۲. هایلایت معماری لابی مرکزی و سایت ۱ (آبی) */}
              <rect
                x="-14"
                y="-24"
                width="44"
                height="58"
                rx="8"
                fill={selected.id === 'lobby' ? 'rgba(59, 130, 246, 0.55)' : 'rgba(59, 130, 246, 0.32)'}
                stroke="#3b82f6"
                strokeWidth={selected.id === 'lobby' ? 2.2 : 1.5}
              />
              {/* ۶. ناحیه سبز پایگاه بسیج برادران (گوشه بالایی سمت راست سالن مرکزی، چسبیده به دیواره بال شرقی) */}
              <rect
                x="-2"
                y="-84"
                width="34"
                height="26"
                rx="7"
                fill={selected.id === 'basij-base' ? 'rgba(34, 197, 94, 0.62)' : 'rgba(34, 197, 94, 0.38)'}
                stroke="#22c55e"
                strokeWidth={selected.id === 'basij-base' ? 2.2 : 1.5}
              />
              {/* ۱. نوار فیروزه‌ای میزهای بسیج (گام صفر — ورودی سمت راست لابی) */}
              <rect
                x="18"
                y="42"
                width="54"
                height="15"
                rx="7"
                fill={selected.id === 'basij-desks' ? 'rgba(34, 211, 238, 0.68)' : 'rgba(34, 211, 238, 0.4)'}
                stroke="#22d3ee"
                strokeWidth={selected.id === 'basij-desks' ? 2.2 : 1.4}
              />
              {/* ۳. نوار فیروزه‌ای تیره میزهای هیئت (کنار زرد پذیرایی صبحانه) */}
              <rect
                x="-50"
                y="48"
                width="38"
                height="15"
                rx="7"
                fill={selected.id === 'heyat-desks' ? 'rgba(13, 148, 136, 0.78)' : 'rgba(13, 148, 136, 0.52)'}
                stroke="#14b8a6"
                strokeWidth={selected.id === 'heyat-desks' ? 2.2 : 1.4}
              />

              {/* ========== بال شرقی (تریا در ضلع شرقی و انتشارات/بسیج خواهران در گوشه شمال شرقی) ========== */}
              <rect
                x="36"
                y="-114"
                width="212"
                height="196"
                rx="8"
                fill="url(#roofGrad)"
                stroke="rgba(222,177,84,0.55)"
                strokeWidth="1.8"
              />
              {/* حیاط مرکزی شرقی */}
              <rect
                x="76"
                y="-74"
                width="132"
                height="116"
                rx="5"
                fill="url(#courtyardGrad)"
                stroke="rgba(89,184,163,0.48)"
                strokeWidth="1.3"
              />
              <line x1="76" y1="-16" x2="208" y2="-16" stroke="rgba(89,184,163,0.18)" strokeDasharray="3 3" />
              <line x1="142" y1="-74" x2="142" y2="42" stroke="rgba(89,184,163,0.18)" strokeDasharray="3 3" />
              <circle cx="142" cy="-16" r="9" fill="rgba(89,184,163,0.12)" stroke="rgba(89,184,163,0.35)" strokeWidth="1" />

              {/* ۷. ناحیه نارنجی تریا (جابجا شده به ضلع شرقی — جای قبلی بنفش) */}
              <rect
                x="208"
                y="-44"
                width="34"
                height="68"
                rx="8"
                fill={selected.id === 'cafeteria' ? 'rgba(249, 115, 22, 0.65)' : 'rgba(249, 115, 22, 0.38)'}
                stroke="#f97316"
                strokeWidth={selected.id === 'cafeteria' ? 2.2 : 1.5}
              />

              {/* ۸. ناحیه بنفش انتشارات (همکف) و پایگاه بسیج خواهران (طبقه اول) — گوشه پایینی سمت شرق بال دوم (زیر تریا) */}
              <rect
                x="200"
                y="34"
                width="44"
                height="42"
                rx="8"
                fill={selected.id === 'press-sisters' ? 'rgba(168, 85, 247, 0.68)' : 'rgba(168, 85, 247, 0.42)'}
                stroke="#a855f7"
                strokeWidth={selected.id === 'press-sisters' ? 2.2 : 1.6}
              />
            </g>

            {/* برچسب‌های راهنمای محوطه و فضاهای کلیدی برای جهت‌یابی فوری دانشجو */}
            <text x="255" y="294" textAnchor="middle" fill="rgba(166,186,180,0.78)" fontSize="11" fontWeight="600">
              حیاط غربی
            </text>
            <text x="486" y="168" textAnchor="middle" fill="rgba(166,186,180,0.78)" fontSize="11" fontWeight="600">
              حیاط شرقی
            </text>
            <text x="458" y="346" textAnchor="middle" fill="rgba(222,177,84,0.88)" fontSize="10" fontWeight="700">
              درب اصلی لابی
            </text>
            <text x="488" y="408" textAnchor="middle" fill="rgba(222,177,84,0.72)" fontSize="11" fontWeight="600">
              محوطه ورودی دانشگاه گناباد
            </text>

            {/* فلش و برچسب مسیر ورود از بلوار شهدای گمنام */}
            <g>
              <path
                d="M 88 438 Q 120 422, 152 412"
                fill="none"
                stroke="#deb154"
                strokeWidth="3.2"
                strokeLinecap="round"
                markerEnd="url(#entryArrowHead)"
              />
              <rect
                x="24"
                y="442"
                width="146"
                height="26"
                rx="8"
                fill="rgba(9, 28, 25, 0.94)"
                stroke="rgba(222,177,84,0.55)"
                strokeWidth="1.2"
              />
              <text x="97" y="459" textAnchor="middle" fill="#deb154" fontSize="11" fontWeight="700">
                ورود از بلوار شهدای گمنام
              </text>
            </g>

            {/* خط مسیر پیاده‌روی واقعی روی راهروها (هاله نرم + خط‌چین رنگی) */}
            <polyline
              points={routePointsStr}
              fill="none"
              stroke={selected.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.16"
            />
            <polyline
              points={routePointsStr}
              fill="none"
              stroke={selected.color}
              strokeWidth="3"
              strokeDasharray="7 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />
            {/* نقطه شروع مسیر پیاده‌روی */}
            <circle cx="152" cy="412" r="5" fill="#deb154" stroke="#051512" strokeWidth="2" />

            {/* قطب‌نمای شمال گوشه بالا-چپ */}
            <g transform="translate(46, 52)">
              <circle r="21" fill="rgba(9, 28, 25, 0.92)" stroke="rgba(222,177,84,0.48)" strokeWidth="1.2" />
              <path d="M 0 -13 L 4.5 0 L 0 -3 L -4.5 0 Z" fill="#ef4444" />
              <path d="M 0 13 L 4.5 0 L 0 3 L -4.5 0 Z" fill="rgba(244,241,232,0.45)" />
              <text y="-26" textAnchor="middle" fill="#deb154" fontSize="10.5" fontWeight="700">
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
                  aria-label={`${toPersianDigits(idx + 1)}. ${node.shortLabel} (${node.colorLabel})`}
                  className="cursor-pointer focus:outline-none"
                  filter="url(#pinGlow)"
                >
                  {isSelected && (
                    <circle
                      r="23"
                      fill={node.color}
                      fillOpacity="0.24"
                      stroke={node.color}
                      strokeWidth="1.8"
                    />
                  )}
                  <circle
                    r={isSelected ? 16 : 13.5}
                    fill={node.color}
                    stroke={isSelected ? '#ffffff' : '#051512'}
                    strokeWidth={isSelected ? 2.8 : 2.2}
                  />
                  <text
                    y="4.5"
                    textAnchor="middle"
                    fill="#051512"
                    fontSize={isSelected ? '13' : '11.5'}
                    fontWeight="900"
                  >
                    {toPersianDigits(idx + 1)}
                  </text>
                </g>
              );
            })}

            {/* برچسب شناور خوانا برای پین انتخاب‌شده با موقعیت مهندسی‌شده بدون هم‌پوشانی */}
            <g transform={`translate(${callout.x}, ${callout.y})`} className="pointer-events-none">
              <rect
                x={-callout.width / 2}
                y="-15"
                width={callout.width}
                height="28"
                rx="9"
                fill="rgba(5, 21, 18, 0.96)"
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

        {/* راهنمای رنگی تعاملی ۸ بخش (خوانا و بدون برش متن در موبایل) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CAMPUS_MAP_NODES.map((node, idx) => {
            const active = selected.id === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelected(node)}
                aria-pressed={active}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold leading-snug transition-all cursor-pointer inline-flex items-center gap-2 text-right ${
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
                <span className="whitespace-normal">
                  {toPersianDigits(idx + 1)}. {node.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* کارت جزئیات و راهنمای پیاده‌روی بخش انتخاب‌شده */}
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
          <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">{selected.description}</p>

          {/* مسیر پیاده‌روی گام‌به‌گام برای جلوگیری از سردرگمی */}
          <div className="mt-4 rounded-2xl border border-gold/30 bg-gold-soft/35 p-4 space-y-2.5">
            <p className="text-xs font-extrabold text-gold flex items-center gap-1.5">
              <Footprints className="w-4 h-4 shrink-0" />
              <span>چطور از ورودی دانشگاه تا اینجا بروم؟</span>
            </p>
            <ol className="space-y-2 text-xs sm:text-sm text-ink">
              {selected.walkSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5 leading-relaxed">
                  <span
                    className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5 text-[#051512]"
                    style={{ backgroundColor: selected.color }}
                  >
                    {toPersianDigits(i + 1)}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="rounded-xl border border-line bg-canvas p-3 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-ink-muted block">موقعیت و طبقه</span>
                <span className="text-sm text-ink font-semibold">{selected.floor}</span>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-ink-muted block">ساعت پاسخگویی و فعالیت</span>
                <span className="text-sm text-ink font-semibold">{selected.hours}</span>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-ink-muted block">نکته کاربردی برای نوورود</span>
                <span className="text-sm text-ink leading-relaxed">{selected.tip}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-line space-y-2.5">
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
