import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Cpu,
  Globe2,
  HeartHandshake,
  LayoutGrid,
  Network,
  Palette,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  BASIJ_AXIS_META,
  groupCadresByAxis,
  type AxisVisualMeta,
} from '../data/basijVisuals';
import { GeometricLatticeBg } from './GeometricLatticeBg';
import { toPersianDigits } from '../utils/persian';
import type { CadreItem } from '../types/portal';

interface BasijOrgChartProps {
  cadres: CadreItem[];
  activeAxis: string;
  onSelectAxis: (axis: string) => void;
  onSelectCadre: (cadre: CadreItem) => void;
  highlightedIds: Set<number>;
  savedIds: number[];
  onToggleSave: (cadreId: number) => void;
  majorReason?: string;
}

const RIGHT_AXES = ['فرهنگی', 'جهادی', 'سایر موضوعات'];
const LEFT_AXES = ['سیاسی', 'هنر و رسانه', 'علمی'];

export const AxisIcon: React.FC<{ iconKey: AxisVisualMeta['iconKey']; className?: string }> = ({
  iconKey,
  className = 'w-4 h-4',
}) => {
  switch (iconKey) {
    case 'book':
      return <BookOpen className={className} />;
    case 'heart':
      return <HeartHandshake className={className} />;
    case 'scale':
      return <Scale className={className} />;
    case 'palette':
      return <Palette className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'globe':
    default:
      return <Globe2 className={className} />;
  }
};

interface PositionedNode {
  cadre: CadreItem;
  meta: AxisVisualMeta;
  x: number;
  y: number;
  side: 'left' | 'right';
}

interface PositionedAxis {
  meta: AxisVisualMeta;
  count: number;
  x: number;
  y: number;
  side: 'left' | 'right';
}

/**
 * چارت تعاملی و منظومه‌ای ۲۵ کانون رسمی بسیج دانشجویی (جایگزین کامل PDF)
 * در دسکتاپ: چارت درختی-معماری دوطرفه با خطوط بزیر نورانی و تمرکز روی محورها
 * در موبایل (یا حالت منظومه): نقشه عمودی متصل و کاملاً خوانا بدون نیاز به زوم
 */
export const BasijOrgChart: React.FC<BasijOrgChartProps> = ({
  cadres,
  activeAxis,
  onSelectAxis,
  onSelectCadre,
  highlightedIds,
  savedIds,
  onToggleSave,
  majorReason,
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'columns'>('graph');
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  const [hoveredCadreId, setHoveredCadreId] = useState<number | null>(null);

  const grouped = useMemo(() => groupCadresByAxis(cadres), [cadres]);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const focusedAxis = hoveredAxis || (activeAxis !== 'همه' ? activeAxis : null);
  const hasMajorFilter = highlightedIds.size > 0;

  // محاسبه مختصات دقیق چارت دوطرفه بدون هیچ همپوشانی (viewBox: 1240 x 840)
  const layout = useMemo(() => {
    const center = { x: 620, y: 420 };
    const axisNodes: PositionedAxis[] = [];
    const cadreNodes: PositionedNode[] = [];

    const buildSide = (axisKeys: string[], side: 'left' | 'right') => {
      const sideGroups = axisKeys
        .map((key) => grouped.find((g) => g.meta.key === key))
        .filter((g): g is NonNullable<typeof g> => Boolean(g));

      const totalItems = sideGroups.reduce((s, g) => s + g.items.length, 0);
      const pitch = side === 'right' ? 54 : 51;
      const groupGap = side === 'right' ? 30 : 24;
      const totalHeight =
        Math.max(0, totalItems - 1) * pitch + Math.max(0, sideGroups.length - 1) * groupGap;
      let cursorY = center.y - totalHeight / 2;

      const axisX = side === 'right' ? 812 : 428;
      const cadreX = side === 'right' ? 1094 : 146;

      sideGroups.forEach((group, gIdx) => {
        const firstY = cursorY;
        group.items.forEach((cadre, cIdx) => {
          const y = cursorY;
          cadreNodes.push({ cadre, meta: group.meta, x: cadreX, y, side });
          if (cIdx < group.items.length - 1) cursorY += pitch;
        });
        const lastY = cursorY;
        axisNodes.push({
          meta: group.meta,
          count: group.items.length,
          x: axisX,
          y: (firstY + lastY) / 2,
          side,
        });
        if (gIdx < sideGroups.length - 1) {
          cursorY += pitch + groupGap;
        }
      });
    };

    buildSide(RIGHT_AXES, 'right');
    buildSide(LEFT_AXES, 'left');

    return { center, axisNodes, cadreNodes };
  }, [grouped]);

  const isCadreEmphasized = (c: CadreItem) => {
    if (hoveredCadreId === c.id) return true;
    if (focusedAxis && c.category === focusedAxis) return true;
    if (!focusedAxis && hasMajorFilter) return highlightedIds.has(c.id);
    if (!focusedAxis && !hasMajorFilter) return true;
    return false;
  };

  const isAxisEmphasized = (axisKey: string) => {
    if (!focusedAxis) return true;
    return focusedAxis === axisKey;
  };

  return (
    <div
      data-testid="basij-org-chart"
      className="relative rounded-3xl border border-line bg-surface overflow-hidden"
    >
      <GeometricLatticeBg opacity={0.075} />

      {/* نوار ابزار بالای چارت */}
      <div className="relative z-10 p-4 sm:p-6 border-b border-line flex flex-wrap items-center justify-between gap-4 bg-surface/85 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold text-gold">
            ساختار بصری و تعاملی · چارت قرار قیام ۹
          </p>
          <h2 className="text-lg sm:text-2xl font-extrabold text-ink mt-0.5">
            نقشه جامع {toPersianDigits(cadres.length || 25)} کانون در {toPersianDigits(6)} محور تخصصی
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            روی هر محور یا کانون کلیک کن تا مسیر آن روشن شود و شناسنامه کامل مأموریت و کارگروه‌هایش باز شود.
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl border border-line bg-canvas">
          <button
            type="button"
            onClick={() => setViewMode('graph')}
            aria-pressed={viewMode === 'graph'}
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              viewMode === 'graph'
                ? 'bg-gold text-[#071714]'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>نمای چارت درختی</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('columns')}
            aria-pressed={viewMode === 'columns'}
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              viewMode === 'columns'
                ? 'bg-gold text-[#071714]'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>نمای منظومه محوری</span>
          </button>
        </div>
      </div>

      {/* راهنمای رنگی ۶ محور (قابل کلیک برای فوکوس) */}
      <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-line bg-canvas/55 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectAxis('همه')}
          className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeAxis === 'همه'
              ? 'bg-gold text-[#071714]'
              : 'border border-line bg-surface text-ink-muted hover:text-ink'
          }`}
        >
          همه محورها ({toPersianDigits(cadres.length || 25)})
        </button>

        {BASIJ_AXIS_META.map((axis) => {
          const count = cadres.filter((c) => c.category === axis.key).length;
          const active = activeAxis === axis.key;
          return (
            <button
              key={axis.key}
              type="button"
              onClick={() => onSelectAxis(active ? 'همه' : axis.key)}
              onMouseEnter={() => setHoveredAxis(axis.key)}
              onMouseLeave={() => setHoveredAxis(null)}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors border ${
                active
                  ? 'text-ink shadow-sm'
                  : 'border-line bg-surface text-ink-muted hover:text-ink'
              }`}
              style={
                active
                  ? {
                      borderColor: axis.accent,
                      backgroundColor: axis.accentSoft,
                    }
                  : undefined
              }
            >
              <span style={{ color: axis.accent }}>
                <AxisIcon iconKey={axis.iconKey} className="w-3.5 h-3.5" />
              </span>
              <span>{axis.shortLabel}</span>
              <span className="tabular-nums opacity-75">({toPersianDigits(count)})</span>
            </button>
          );
        })}
      </div>

      {/* بنر توضیح تطبیق رشته در صورت فعال بودن */}
      {majorReason && hasMajorFilter && (
        <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-gold/25 bg-gold-soft/45 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="w-4 h-4 text-gold shrink-0" />
            <span>
              <strong className="text-gold">پیشنهاد هوشمند رشته تو: </strong>
              {majorReason} ({toPersianDigits(highlightedIds.size)} کانون روی چارت برجسته شدند)
            </span>
          </div>
        </div>
      )}

      {/* نمای ۱: چارت تعاملی SVG دسکتاپ */}
      {viewMode === 'graph' && (
        <div className="hidden lg:block relative z-10 p-4 sm:p-6">
          <div className="rounded-2xl border border-line bg-[#061613] text-[#f4f1e8] overflow-hidden shadow-inner">
            <svg
              viewBox="0 0 1240 840"
              className="w-full h-auto block select-none"
              role="img"
              aria-label="چارت تعاملی ۲۵ کانون رسمی بسیج دانشجویی در ۶ محور"
            >
              <defs>
                <radialGradient id="basijHubGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#deb154" stopOpacity="0.28" />
                  <stop offset="65%" stopColor="#166556" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#061613" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* هاله مرکزی */}
              <circle cx={layout.center.x} cy={layout.center.y} r="230" fill="url(#basijHubGlow)" />

              {/* خطوط اتصال مرکز ← ۶ محور */}
              {layout.axisNodes.map((ax) => {
                const startX = ax.side === 'right' ? layout.center.x + 68 : layout.center.x - 68;
                const endX = ax.side === 'right' ? ax.x - 72 : ax.x + 72;
                const midX = (startX + endX) / 2;
                const d = `M ${startX} ${layout.center.y} C ${midX} ${layout.center.y}, ${midX} ${ax.y}, ${endX} ${ax.y}`;
                const emphasized = isAxisEmphasized(ax.meta.key);
                return (
                  <path
                    key={`hub-${ax.meta.key}`}
                    d={d}
                    fill="none"
                    stroke={ax.meta.accent}
                    strokeWidth={emphasized ? 2.6 : 1.2}
                    strokeOpacity={emphasized ? 0.85 : 0.16}
                    style={{ transition: 'stroke-opacity 180ms ease, stroke-width 180ms ease' }}
                  />
                );
              })}

              {/* خطوط اتصال ۶ محور ← ۲۵ کانون */}
              {layout.cadreNodes.map((node) => {
                const ax = layout.axisNodes.find((a) => a.meta.key === node.meta.key);
                if (!ax) return null;
                const startX = node.side === 'right' ? ax.x + 72 : ax.x - 72;
                const endX = node.side === 'right' ? node.x - 122 : node.x + 122;
                const midX = (startX + endX) / 2;
                const d = `M ${startX} ${ax.y} C ${midX} ${ax.y}, ${midX} ${node.y}, ${endX} ${node.y}`;
                const emphasized = isCadreEmphasized(node.cadre);
                const isMajorHit = highlightedIds.has(node.cadre.id);
                return (
                  <path
                    key={`edge-${node.cadre.id}`}
                    d={d}
                    fill="none"
                    stroke={isMajorHit ? '#deb154' : node.meta.accent}
                    strokeWidth={hoveredCadreId === node.cadre.id || isMajorHit ? 2.4 : 1.35}
                    strokeOpacity={emphasized ? 0.78 : 0.12}
                    style={{ transition: 'stroke-opacity 180ms ease, stroke-width 180ms ease' }}
                  />
                );
              })}

              {/* هسته مرکزی (شمسه بسیج دانشجویی) */}
              <g
                transform={`translate(${layout.center.x}, ${layout.center.y})`}
                onClick={() => onSelectAxis('همه')}
                role="button"
                tabIndex={0}
                aria-label="نمایش همه ۶ محور و ۲۵ کانون بسیج دانشجویی"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAxis('همه');
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x="-54"
                  y="-54"
                  width="108"
                  height="108"
                  rx="18"
                  transform="rotate(45)"
                  fill="rgba(222, 177, 84, 0.1)"
                  stroke="rgba(222, 177, 84, 0.42)"
                  strokeWidth="1.5"
                />
                <circle
                  r="66"
                  fill="#0a241f"
                  stroke="#deb154"
                  strokeWidth="2.4"
                />
                <circle
                  r="58"
                  fill="none"
                  stroke="rgba(222, 177, 84, 0.28)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  y="-12"
                  textAnchor="middle"
                  fill="#deb154"
                  fontSize="11.5"
                  fontWeight="700"
                >
                  ساختار کانونی
                </text>
                <text
                  y="9"
                  textAnchor="middle"
                  fill="#f4f1e8"
                  fontSize="14.5"
                  fontWeight="800"
                >
                  بسیج دانشجویی
                </text>
                <text
                  y="29"
                  textAnchor="middle"
                  fill="#a6bab4"
                  fontSize="11"
                >
                  {toPersianDigits(cadres.length || 25)} کانون · {toPersianDigits(6)} محور
                </text>
              </g>

              {/* ۶ گره محوری */}
              {layout.axisNodes.map((ax) => {
                const emphasized = isAxisEmphasized(ax.meta.key);
                const selected = activeAxis === ax.meta.key;
                return (
                  <g
                    key={`ax-${ax.meta.key}`}
                    transform={`translate(${ax.x}, ${ax.y})`}
                    onClick={() => onSelectAxis(selected ? 'همه' : ax.meta.key)}
                    onMouseEnter={() => setHoveredAxis(ax.meta.key)}
                    onMouseLeave={() => setHoveredAxis(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectAxis(selected ? 'همه' : ax.meta.key);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${ax.meta.title} با ${toPersianDigits(ax.count)} کانون`}
                    className="cursor-pointer focus:outline-none"
                    style={{
                      opacity: emphasized ? 1 : 0.34,
                      transition: 'opacity 180ms ease',
                    }}
                  >
                    <rect
                      x="-72"
                      y="-27"
                      width="144"
                      height="54"
                      rx="14"
                      fill={selected ? ax.meta.accent : '#0c2722'}
                      stroke={ax.meta.accent}
                      strokeWidth={selected ? 2.4 : 1.6}
                    />
                    <text
                      y="-3"
                      textAnchor="middle"
                      fill={selected ? '#061613' : '#f4f1e8'}
                      fontSize="13.5"
                      fontWeight="800"
                    >
                      {ax.meta.shortLabel}
                    </text>
                    <text
                      y="15"
                      textAnchor="middle"
                      fill={selected ? '#061613' : '#a6bab4'}
                      fontSize="11"
                      fontWeight="600"
                    >
                      {toPersianDigits(ax.count)} کانون تخصصی
                    </text>
                  </g>
                );
              })}

              {/* ۲۵ گره کانون */}
              {layout.cadreNodes.map((node) => {
                const emphasized = isCadreEmphasized(node.cadre);
                const isHovered = hoveredCadreId === node.cadre.id;
                const isMajorHit = highlightedIds.has(node.cadre.id);
                const isSaved = savedSet.has(node.cadre.id);
                const label =
                  node.cadre.name.length > 29
                    ? `${node.cadre.name.slice(0, 28)}…`
                    : node.cadre.name;

                return (
                  <g
                    key={`cadre-${node.cadre.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => onSelectCadre(node.cadre)}
                    onMouseEnter={() => {
                      setHoveredCadreId(node.cadre.id);
                      setHoveredAxis(node.meta.key);
                    }}
                    onMouseLeave={() => {
                      setHoveredCadreId(null);
                      setHoveredAxis(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCadre(node.cadre);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`باز کردن شناسنامه ${node.cadre.name}`}
                    className="cursor-pointer focus:outline-none"
                    style={{
                      opacity: emphasized ? 1 : 0.28,
                      transition: 'opacity 180ms ease',
                    }}
                  >
                    <rect
                      x="-122"
                      y="-19"
                      width="244"
                      height="38"
                      rx="11"
                      fill={
                        isHovered
                          ? node.meta.accent
                          : isMajorHit
                          ? 'rgba(222, 177, 84, 0.18)'
                          : '#0b201c'
                      }
                      stroke={
                        isHovered
                          ? '#f4f1e8'
                          : isMajorHit
                          ? '#deb154'
                          : node.meta.accentBorder
                      }
                      strokeWidth={isHovered || isMajorHit ? 2 : 1.15}
                    />
                    <text
                      x={isSaved ? 6 : 0}
                      y="4.5"
                      textAnchor="middle"
                      fill={isHovered ? '#061613' : '#f4f1e8'}
                      fontSize="12.2"
                      fontWeight={isHovered || isMajorHit ? '700' : '500'}
                    >
                      {label}
                    </text>
                    {isSaved && (
                      <circle
                        cx="-108"
                        cy="0"
                        r="4.5"
                        fill="#deb154"
                        stroke="#061613"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* نمای ۲: منظومه محوری (همیشه روی موبایل/تبلت + قابل انتخاب روی دسکتاپ) */}
      <div
        className={`relative z-10 p-4 sm:p-6 ${
          viewMode === 'graph' ? 'lg:hidden' : 'block'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {grouped
            .filter((g) => activeAxis === 'همه' || g.meta.key === activeAxis)
            .map(({ meta, items }) => (
              <div
                key={meta.key}
                className="rounded-2xl border border-line bg-canvas/85 p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3 border-b border-line pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: meta.accentSoft,
                        color: meta.accent,
                        border: `1px solid ${meta.accentBorder}`,
                      }}
                    >
                      <AxisIcon iconKey={meta.iconKey} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-ink">{meta.title}</h3>
                      <p className="text-xs text-ink-muted mt-0.5">{meta.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-ink-muted shrink-0">
                    {toPersianDigits(items.length)} کانون
                  </span>
                </div>

                {/* خط اتصال عمودی شاخه‌های کانون */}
                <div
                  className="relative pr-4 space-y-2.5"
                  style={{
                    borderRight: `1px solid ${meta.accentBorder}`,
                  }}
                >
                  {items.map((cadre) => {
                    const isMajorHit = highlightedIds.has(cadre.id);
                    const isSaved = savedSet.has(cadre.id);
                    return (
                      <div
                        key={cadre.id}
                        className={`rounded-xl border p-3 transition-colors flex items-center justify-between gap-2 ${
                          isMajorHit
                            ? 'border-gold bg-gold-soft/45'
                            : 'border-line bg-surface hover:border-gold/45'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectCadre(cadre)}
                          className="flex-1 text-right min-w-0 cursor-pointer"
                        >
                          <span className="block text-sm font-bold text-ink truncate">
                            {cadre.name}
                          </span>
                          <span className="block text-xs text-ink-muted truncate mt-0.5">
                            {cadre.highlights[0] || cadre.shortDesc}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleSave(cadre.id)}
                          aria-label={
                            isSaved
                              ? `حذف ${cadre.name} از نشان‌شده‌ها`
                              : `نشان کردن ${cadre.name}`
                          }
                          aria-pressed={isSaved}
                          className={`min-h-[34px] min-w-[34px] rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                            isSaved
                              ? 'border-gold bg-gold text-[#071714]'
                              : 'border-line bg-canvas text-ink-muted hover:text-gold'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
