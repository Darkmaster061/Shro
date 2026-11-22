import React, { useMemo, useState } from 'react';
import {
  Camera,
  ClipboardCheck,
  Coffee,
  ExternalLink,
  HandHeart,
  Layers,
  Maximize2,
  Palette,
  Send,
  Share2,
  Shield,
  Sparkles,
  Truck,
  Users,
  Volume2,
} from 'lucide-react';
import {
  HEYAT_ARCHIVE_CATEGORIES,
  HEYAT_ARCHIVE_PHOTOS,
  HEYAT_EXECUTIVE_TEAMS,
  filterHeyatArchivePhotos,
  type HeyatArchiveCategory,
  type HeyatTeamIconKey,
} from '../data/heyatArchive';
import { HEYAT_OFFICIAL_INFO } from '../data/orientation';
import { PhotoLightbox } from './PhotoLightbox';
import { GeometricLatticeBg } from './GeometricLatticeBg';
import { toPersianDigits } from '../utils/persian';

interface HeyatArchiveAndTeamsSectionProps {
  channelUrl: string;
}

const TEAM_ICON_MAP: Record<HeyatTeamIconKey, React.FC<{ className?: string }>> = {
  sponsor: HandHeart,
  hospitality: Coffee,
  equipment: Volume2,
  logistics: Truck,
  media: Camera,
  decor: Palette,
  social: Share2,
  cleaning: Sparkles,
  coordination: ClipboardCheck,
  order: Shield,
};

/**
 * آرشیو گزارش تصویری جامع برنامه‌های هیئت دانشجویی محبان‌الحسین (ع)
 * به همراه معرفی ۱۰ بخش اجرایی هیئت برای آشنایی و مشارکت داوطلبانه نوورودی‌ها
 */
export const HeyatArchiveAndTeamsSection: React.FC<HeyatArchiveAndTeamsSectionProps> = ({
  channelUrl,
}) => {
  const [activeCat, setActiveCat] = useState<HeyatArchiveCategory>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showAllInAllTab, setShowAllInAllTab] = useState(false);

  const filteredPhotos = useMemo(() => filterHeyatArchivePhotos(activeCat), [activeCat]);

  const counts = useMemo(() => {
    const map: Record<HeyatArchiveCategory, number> = {
      all: HEYAT_ARCHIVE_PHOTOS.length,
      freshmen: 0,
      fatemiyeh: 0,
      celebrations: 0,
      ashqi: 0,
      'imam-sadiq': 0,
    };
    for (const p of HEYAT_ARCHIVE_PHOTOS) {
      map[p.archiveCategory] += 1;
    }
    return map;
  }, []);

  // در تب «همه برنامه‌ها» ابتدا ۱۲ تصویر شاخص از همه مناسبت‌ها نمایش داده می‌شود و با یک کلیک کل ۳۱ تصویر باز می‌شود
  const displayedPhotos =
    activeCat === 'all' && !showAllInAllTab ? filteredPhotos.slice(0, 12) : filteredPhotos;

  return (
    <div className="space-y-14">
      {/* ─── بخش ۱: آرشیو گزارش تصویری برنامه‌های هیئت ─── */}
      <section
        id="heyat-archive"
        aria-labelledby="heyat-archive-heading"
        className="scroll-mt-20 rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold text-gold">
              گزارش تصویری فعالیت‌های هیئت · {toPersianDigits(HEYAT_ARCHIVE_PHOTOS.length)} تصویر مستند
            </p>
            <h2
              id="heyat-archive-heading"
              className="text-2xl sm:text-3xl font-extrabold text-ink leading-tight"
            >
              آرشیو تصویری برنامه‌های {HEYAT_OFFICIAL_INFO.officialName}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              از استقبال و صبحانه گرم روزهای ثبت‌نام نوورودی‌ها تا نمایشگاه فاطمیه، جشن عید غدیر، میلاد حضرت زهرا (س)، حضرت زینب (س) و قرار هفتگی «عصرهای عاشقی» در مزار شهدای گمنام.
            </p>
          </div>

          <p className="text-xs text-ink-muted shrink-0">
            منبع تصاویر: واحد رسانه هیئت ·{' '}
            <span dir="ltr" className="font-mono text-gold">
              {HEYAT_OFFICIAL_INFO.telegramHandle}
            </span>
          </p>
        </div>

        {/* تب‌های فیلتر موضوعی */}
        <div
          role="tablist"
          aria-label="فیلتر موضوعی آرشیو تصویری برنامه‌های هیئت"
          className="flex flex-wrap gap-1.5 bg-canvas border border-line p-1.5 rounded-2xl"
        >
          {HEYAT_ARCHIVE_CATEGORIES.map((cat) => {
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveCat(cat.id);
                  setLightboxIndex(null);
                }}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-gold text-[#071714]'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span>{cat.label}</span>
                <span className="tabular-nums opacity-75">
                  ({toPersianDigits(counts[cat.id])})
                </span>
              </button>
            );
          })}
        </div>

        {/* شبکه یکدست تصاویر با نسبت ۴ به ۳ */}
        <div
          data-testid="heyat-archive-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {displayedPhotos.map((photo, idx) => (
            <figure
              key={photo.id}
              className="group relative rounded-2xl overflow-hidden border border-line bg-canvas flex flex-col"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(idx)}
                aria-label={`مشاهده بزرگ تصویر ${photo.title}`}
                className="relative aspect-[4/3] w-full overflow-hidden bg-[#071714] text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <img
                  src={photo.thumbSrc}
                  srcSet={`${photo.thumbSrc} 640w, ${photo.src} 1280w`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  loading={idx < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <span className="pointer-events-none absolute top-2.5 left-2.5 w-8 h-8 rounded-xl bg-black/55 backdrop-blur-sm border border-white/15 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
              </button>
              <figcaption className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] text-gold font-medium truncate">
                    {photo.album} · {photo.eventDate}
                  </p>
                  <p className="text-xs font-bold text-ink leading-snug line-clamp-2">
                    {photo.title}
                  </p>
                </div>
                <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                  {photo.caption}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* دکمه نمایش همه ۳۱ تصویر در تب «همه برنامه‌ها» */}
        {activeCat === 'all' && filteredPhotos.length > 12 && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllInAllTab((prev) => !prev)}
              className="min-h-[44px] px-6 rounded-xl border border-gold/45 bg-gold-soft/50 hover:bg-gold hover:text-[#071714] text-ink font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>
                {showAllInAllTab
                  ? 'نمایش فشرده‌تر (۱۲ تصویر منتخب)'
                  : `مشاهده تمام ${toPersianDigits(filteredPhotos.length)} تصویر آرشیو برنامه‌ها`}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* ─── بخش ۲: تیم‌ها و بخش‌های اجرایی هیئت (دعوت به خادمی نوورودی‌ها) ─── */}
      <section
        id="heyat-teams"
        aria-labelledby="heyat-teams-heading"
        className="scroll-mt-20 relative overflow-hidden rounded-3xl border border-gold/30 bg-surface p-6 sm:p-8 space-y-6"
      >
        <GeometricLatticeBg opacity={0.05} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold text-gold">
              مشارکت و خادمی دانشجویی · {toPersianDigits(HEYAT_EXECUTIVE_TEAMS.length)} بخش اجرایی فعال
            </p>
            <h2
              id="heyat-teams-heading"
              className="text-2xl sm:text-3xl font-extrabold text-ink leading-tight"
            >
              تیم‌ها و بخش‌های اجرایی {HEYAT_OFFICIAL_INFO.officialName}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              هیئت دانشگاه کاملاً با همت خود دانشجویان اداره می‌شود. اگر به عکاسی، فضاسازی، اجرا، پذیرایی یا کارهای فنی علاقه داری، می‌توانی از همین ترم اول به یکی از بخش‌های زیر بپیوندی.
            </p>
          </div>

          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[46px] px-5 rounded-xl bg-gold hover:bg-gold-strong text-[#071714] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>اعلام آمادگی و عضویت در تیم‌های هیئت</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div
          data-testid="heyat-teams-grid"
          className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5"
        >
          {HEYAT_EXECUTIVE_TEAMS.map((team) => {
            const Icon = TEAM_ICON_MAP[team.icon];
            return (
              <article
                key={team.id}
                className="rounded-2xl border border-line bg-canvas p-4 flex flex-col gap-2.5 hover:border-gold/45 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-gold-soft border border-gold/25 text-gold flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-ink leading-snug">
                    {team.name}
                  </h3>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {team.summary}
                </p>
              </article>
            );
          })}
        </div>

        <div className="relative z-10 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-muted">
          <p className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gold shrink-0" />
            <span>
              ثبت‌نام خادمی برای همه دانشجویان خواهر و برادر ورودی جدید در میز استقبال روزهای ثبت‌نام و از طریق کانال رسمی هیئت انجام می‌شود.
            </span>
          </p>
          <span dir="ltr" className="font-mono text-gold font-semibold shrink-0">
            {HEYAT_OFFICIAL_INFO.telegramHandle}
          </span>
        </div>
      </section>

      {/* نمایشگر تمام‌صفحه Lightbox برای آرشیو برنامه‌ها */}
      <PhotoLightbox
        photos={displayedPhotos}
        activeIndex={lightboxIndex}
        onChangeIndex={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
};
