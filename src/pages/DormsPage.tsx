import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bus,
  Camera,
  Check,
  Clock,
  Columns,
  Expand,
  HeartPulse,
  Images,
  MapPin,
  Navigation,
  Phone,
  Printer,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { TiltCard } from '../components/TiltCard';
import { PhotoLightbox } from '../components/PhotoLightbox';
import {
  DORM_ALBUM_META,
  getDormPhotos,
  resolveDormKeyByName,
  type CampusPhoto,
  type DormPhotoKey,
} from '../data/campusGallery';
import {
  DORM_PACKING_LIST,
  OFFICIAL_DORM_FEES_1405,
  OFFICIAL_SHUTTLE_SCHEDULE,
  OFFICIAL_UNIVERSITY_CONTACT,
  OFFICIAL_WELLNESS_SERVICES,
} from '../data/orientation';
import { toPersianDigits } from '../utils/persian';
import type { DormItem } from '../types/portal';

const GENDERS = ['همه', 'پسران', 'دختران', 'متأهلین'] as const;

export const DormsPage: React.FC = () => {
  const [dorms, setDorms] = useState<DormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<(typeof GENDERS)[number]>('همه');
  const [selectedDorm, setSelectedDorm] = useState<DormItem | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [shuttleTab, setShuttleTab] = useState<'sisters' | 'brothers' | 'thursday'>('sisters');
  const [dormPhotoTab, setDormPhotoTab] = useState<DormPhotoKey>('parvin');
  const [lightboxState, setLightboxState] = useState<{
    photos: CampusPhoto[];
    index: number;
  } | null>(null);
  const [packedIds, setPackedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gonabad_packing') || '[]');
    } catch {
      return [];
    }
  });

  const activeDormAlbumPhotos = useMemo(() => getDormPhotos(dormPhotoTab), [dormPhotoTab]);

  /** استخراج لیست تصاویر واقعی هر خوابگاه (تصاویر ذخیره‌شده در دیتابیس یا آلبوم محلی رسمی همان خوابگاه) */
  const resolvePhotosForDorm = (dorm: DormItem): CampusPhoto[] => {
    const dormKey = resolveDormKeyByName(dorm.name, dorm.gender);
    const curated = dormKey ? getDormPhotos(dormKey) : [];
    if (dorm.gallery && dorm.gallery.length > 0) {
      return dorm.gallery.map((url, idx) => {
        const matched = curated.find((p) => p.src === url);
        if (matched) return matched;
        return {
          id: `dorm-${dorm.id}-${idx}`,
          src: url,
          thumbSrc: url,
          title: `${dorm.name} — تصویر ${toPersianDigits(idx + 1)}`,
          caption: dorm.address,
          album: dorm.name,
          category: 'dorms',
        };
      });
    }
    return curated;
  };

  useEffect(() => {
    api
      .getDorms()
      .then(setDorms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    genderFilter === 'همه'
      ? dorms
      : dorms.filter((d) => d.gender === genderFilter);

  const comparedDorms = dorms.filter((d) => compareIds.includes(d.id));

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const togglePack = (id: string) => {
    setPackedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('gonabad_packing', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* سرصفحه و فیلتر */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-semibold text-gold mb-1">
            اسکان و رفاه دانشجویی · اطلاعیه رسمی {OFFICIAL_UNIVERSITY_CONTACT.updatedJalali}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink">
            خوابگاه‌های پروین اعتصامی و خاتم‌الانبیاء
          </h1>
          <p className="mt-2 text-sm text-ink-muted max-w-2xl">
            تعرفه رسمی هر ترم به تفکیک نوع اتاق، شماره‌های داخلی امور خوابگاه و تغذیه، مسیریابی و چک‌لیست وسایل ضروری خوابگاهی.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-surface border border-line p-1 rounded-xl">
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                genderFilter === g
                  ? 'bg-gold text-[#071714]'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* اطلاعیه رسمی بدون نیاز به پیش‌ثبت‌نام + داخلی‌های مستقیم */}
      <section className="rounded-3xl border border-gold/40 bg-gradient-to-l from-gold-soft via-surface to-surface p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-gold">نکته بسیار مهم برای نوورودی‌ها و خانواده‌ها</p>
          <h2 className="text-base sm:text-xl font-extrabold text-ink">
            برای استفاده از خوابگاه، نیاز به پیش‌ثبت‌نام و مراجعه حضوری قبلی نیست!
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-7">
            بلافاصله بعد از تکمیل فرایند ثبت‌نام حضوری دانشجو (۱ تا ۳ آذر) و دریافت کارت دانشجویی، امکان ثبت‌نام و حضور در خوابگاه فراهم خواهد بود.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            OFFICIAL_UNIVERSITY_CONTACT.dormSisters,
            OFFICIAL_UNIVERSITY_CONTACT.dormBrothers,
            OFFICIAL_UNIVERSITY_CONTACT.nutritionOffice,
          ].map((office) => (
            <div key={office.phone} className="rounded-xl border border-line bg-canvas px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-ink">{office.title}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{office.person}</p>
              </div>
              <a
                href={`tel:${office.phone}`}
                dir="ltr"
                className="text-xs font-bold text-gold hover:underline tabular-nums inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{office.phone}</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* جدول رسمی هزینه خوابگاه‌های پروین اعتصامی و خاتم‌الانبیاء */}
      <section aria-labelledby="dorm-fees-heading" className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gold">تعرفه رسمی سال تحصیلی ۱۴۰۵–۱۴۰۶</p>
          <h2 id="dorm-fees-heading" className="text-xl sm:text-2xl font-bold text-ink">
            هزینه خوابگاه‌های پروین اعتصامی (خواهران) و خاتم‌الانبیاء (برادران)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {OFFICIAL_DORM_FEES_1405.map((table) => (
            <div key={table.dormName} className="rounded-2xl border border-line bg-surface p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <span className="text-xs font-bold text-gold">{table.genderLabel}</span>
                  <h3 className="text-lg font-extrabold text-ink">{table.dormName}</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">{table.note}</p>
                </div>
                <div className="text-left text-xs">
                  <span className="text-ink-muted block">{table.contactPerson}</span>
                  <span dir="ltr" className="font-bold text-gold tabular-nums">{table.contactPhone}</span>
                </div>
              </div>

              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th className="py-2 px-2 font-semibold">نوع اتاق</th>
                    <th className="py-2 px-2 font-semibold text-left">مبلغ شهریه هر ترم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {table.rows.map((r) => (
                    <tr key={r.roomType}>
                      <td className="py-2.5 px-2 font-medium text-ink">{r.roomType}</td>
                      <td className="py-2.5 px-2 font-bold text-gold text-left tabular-nums">{r.feeToman}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* موقعیت دقیق، کد پلاس و مسیریابی مستقیم در نشان و بلد */}
              <div className="pt-3 border-t border-line space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                  <p className="text-ink-muted leading-relaxed flex-1 min-w-[200px]">
                    <strong className="text-ink">نشانی دقیق: </strong>
                    {table.address}
                  </p>
                  <span
                    dir="ltr"
                    className="px-2 py-0.5 rounded-md border border-line bg-canvas text-[11px] font-mono font-semibold text-gold shrink-0"
                    title="کد پلاس موقعیت دقیق خوابگاه"
                  >
                    Plus: {table.plusCode}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={table.neshanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] px-3.5 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-gold" />
                    <span>مسیریابی در نشان</span>
                  </a>
                  <a
                    href={table.baladUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] px-3.5 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gold" />
                    <span>مسیریابی در بلد</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* فهرست کارت خوابگاه‌ها */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 rounded-2xl border border-line bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-muted">
          خوابگاهی با این فیلتر ثبت نشده است.
        </div>
      ) : (
        <div
          className={`grid gap-5 ${
            filtered.length <= 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filtered.map((dorm) => {
            const isCompared = compareIds.includes(dorm.id);
            const dormPhotos = resolvePhotosForDorm(dorm);
            const coverPhoto = dormPhotos[0];
            return (
              <TiltCard key={dorm.id}>
                <article className="h-full rounded-2xl border border-line bg-surface overflow-hidden flex flex-col justify-between">
                  {/* هدر تصویری واقعی خوابگاه (کاملاً محلی WebP) با دسترسی مستقیم به گالری */}
                  <div className="relative h-52 bg-emerald-deep/90 text-[#f4f1e8] p-5 flex flex-col justify-between overflow-hidden group">
                    {coverPhoto ? (
                      <>
                        <img
                          src={coverPhoto.thumbSrc}
                          srcSet={
                            coverPhoto.thumbSrc !== coverPhoto.src
                              ? `${coverPhoto.thumbSrc} 640w, ${coverPhoto.src} 1280w`
                              : undefined
                          }
                          sizes="(max-width: 768px) 100vw, 50vw"
                          alt={dorm.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-[#04110f]/92 via-[#04110f]/35 to-[#04110f]/35"
                        />
                      </>
                    ) : (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 shamsi-pattern opacity-40"
                      />
                    )}
                    <div className="relative flex items-center justify-between gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-[#051210]/70 backdrop-blur-md border border-white/15 font-semibold text-gold">
                        خوابگاه {dorm.gender}
                      </span>
                      {dormPhotos.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setLightboxState({ photos: dormPhotos, index: 0 })}
                          className="px-2.5 py-1 rounded-lg bg-[#051210]/75 backdrop-blur-md border border-white/20 hover:border-gold text-white font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-gold" />
                          <span className="tabular-nums">{toPersianDigits(dormPhotos.length)} تصویر</span>
                        </button>
                      ) : (
                        dorm.isDemo && <span className="opacity-75">نمونه</span>
                      )}
                    </div>
                    <h2 className="relative text-lg font-extrabold leading-snug drop-shadow">
                      {dorm.name}
                    </h2>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-sm text-ink-muted">
                      <p>
                        <strong className="text-ink">آدرس: </strong>
                        {dorm.address}
                      </p>
                      <p>
                        <strong className="text-ink">نوع اتاق: </strong>
                        {dorm.roomType}
                      </p>
                      <p>
                        <strong className="text-ink">تعرفه: </strong>
                        {dorm.monthlyFee}
                      </p>
                      <p className="text-xs">
                        امکانات: {dorm.facilities.slice(0, 3).join(' · ')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-line space-y-2">
                      {(dorm.neshanUrl || dorm.baladUrl) && (
                        <div className="flex items-center gap-2">
                          <a
                            href={dorm.neshanUrl || 'https://neshan.org/maps'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-h-[36px] rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5 text-gold" />
                            <span>نشان</span>
                          </a>
                          <a
                            href={dorm.baladUrl || 'https://balad.ir'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-h-[36px] rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5 text-gold" />
                            <span>بلد</span>
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDorm(dorm)}
                          className="flex-1 min-h-[42px] rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-semibold transition-colors cursor-pointer"
                        >
                          مشاهده جزئیات کامل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCompare(dorm.id)}
                          aria-pressed={isCompared}
                          className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isCompared
                              ? 'border-gold bg-gold text-[#071714]'
                              : 'border-line bg-canvas text-ink hover:border-gold/50'
                          }`}
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>{isCompared ? 'در مقایسه' : 'مقایسه'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </TiltCard>
            );
          })}
        </div>
      )}

      {/* جدول مقایسه خوابگاه‌ها */}
      {comparedDorms.length >= 2 && (
        <section
          aria-labelledby="compare-heading"
          className="rounded-2xl border border-gold/40 bg-surface p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="compare-heading" className="text-lg sm:text-xl font-bold text-ink">
              مقایسه کنارهم خوابگاه‌های انتخاب‌شده ({toPersianDigits(comparedDorms.length)})
            </h2>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-ink-muted hover:text-ink cursor-pointer"
            >
              پاک کردن مقایسه
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="border-b border-line text-ink">
                  <th className="py-3 px-3 font-bold">شاخص</th>
                  {comparedDorms.map((d) => (
                    <th key={d.id} className="py-3 px-3 font-bold text-gold">
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-muted">
                {[
                  { label: 'نوع خوابگاه', get: (d: DormItem) => d.gender },
                  { label: 'فاصله تا دانشگاه', get: (d: DormItem) => d.distanceToCampus },
                  { label: 'تعرفه', get: (d: DormItem) => d.monthlyFee },
                  { label: 'ظرفیت', get: (d: DormItem) => d.capacity },
                  { label: 'نوع اتاق‌ها', get: (d: DormItem) => d.roomType },
                  { label: 'ساعت تردد', get: (d: DormItem) => d.curfewHours },
                  { label: 'امکانات', get: (d: DormItem) => d.facilities.join('، ') },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 px-3 font-medium text-ink whitespace-nowrap">{row.label}</td>
                    {comparedDorms.map((d) => (
                      <td key={d.id} className="py-3 px-3">
                        {row.get(d)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* گالری تصاویر واقعی سراهای دانشجویی */}
      <section
        id="dorm-gallery"
        aria-labelledby="dorm-gallery-heading"
        className="rounded-3xl border border-line bg-surface p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-line pb-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
              <Images className="w-4 h-4" />
              <span>تصاویر واقعی محیط اسکان و سراهای دانشجویی</span>
            </p>
            <h2 id="dorm-gallery-heading" className="text-xl sm:text-2xl font-extrabold text-ink">
              گالری عکس خوابگاه‌های دانشگاه گناباد
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              {DORM_ALBUM_META[dormPhotoTab].subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="انتخاب آلبوم خوابگاه"
              className="flex flex-wrap gap-1.5 bg-canvas border border-line p-1 rounded-xl"
            >
              {(['parvin', 'khatam', 'andisheh'] as DormPhotoKey[]).map((key) => {
                const active = dormPhotoTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setDormPhotoTab(key)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      active
                        ? 'bg-gold text-[#071714]'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {key === 'parvin'
                      ? 'پروین اعتصامی (خواهران)'
                      : key === 'khatam'
                        ? 'خاتم‌الانبیاء (برادران)'
                        : 'سرای اندیشه (برادران)'}
                  </button>
                );
              })}
            </div>

            <Link
              to="/gallery"
              className="min-h-[40px] px-3.5 rounded-xl border border-gold/40 bg-canvas hover:border-gold text-xs font-bold text-gold-strong dark:text-gold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>کل گالری دانشگاه</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeDormAlbumPhotos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxState({ photos: activeDormAlbumPhotos, index: idx })}
              aria-label={`مشاهده بزرگ ${photo.title}`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-line bg-emerald-deep/30 text-right cursor-pointer hover:border-gold/55 transition-all"
            >
              <img
                src={photo.thumbSrc}
                srcSet={`${photo.thumbSrc} 640w, ${photo.src} 1280w`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                alt={photo.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#04110f]/85 via-transparent to-transparent"
              />
              <span className="absolute top-2.5 left-2.5 w-8 h-8 rounded-lg bg-[#051210]/70 backdrop-blur-md border border-white/15 text-[#deb154] flex items-center justify-center opacity-85 group-hover:opacity-100">
                <Expand className="w-3.5 h-3.5" />
              </span>
              <div className="absolute bottom-2.5 right-3 left-3">
                <p className="text-xs font-bold text-white line-clamp-1">{photo.title}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* برنامه رسمی زمان‌بندی سرویس ایاب و ذهاب دانشجویان */}
      <section
        id="shuttle"
        aria-labelledby="shuttle-heading"
        className="rounded-3xl border border-line bg-surface p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-line pb-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gold inline-flex items-center gap-1.5">
              <Bus className="w-4 h-4" />
              <span>رفت‌وآمد رسمی دانشگاه و خوابگاه‌ها</span>
            </p>
            <h2 id="shuttle-heading" className="text-xl sm:text-2xl font-bold text-ink">
              برنامه زمان‌بندی سرویس ایاب و ذهاب دانشجویان
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              ایستگاه داخل شهر:{' '}
              <strong className="text-ink">{OFFICIAL_SHUTTLE_SCHEDULE.cityStation}</strong>
            </p>
          </div>

          <div
            role="tablist"
            aria-label="انتخاب برنامه سرویس"
            className="flex flex-wrap gap-1.5 bg-canvas border border-line p-1 rounded-xl"
          >
            {[
              { id: 'sisters' as const, label: 'دختران · روزهای عادی' },
              { id: 'brothers' as const, label: 'پسران · روزهای عادی' },
              { id: 'thursday' as const, label: 'پسران · پنج‌شنبه‌ها' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={shuttleTab === tab.id}
                onClick={() => setShuttleTab(tab.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  shuttleTab === tab.id
                    ? 'bg-gold text-[#071714]'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const activeSchedule =
            shuttleTab === 'sisters'
              ? OFFICIAL_SHUTTLE_SCHEDULE.sistersRegular
              : shuttleTab === 'brothers'
                ? OFFICIAL_SHUTTLE_SCHEDULE.brothersRegular
                : OFFICIAL_SHUTTLE_SCHEDULE.brothersThursday;

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <h3 className="text-sm sm:text-base font-bold text-ink">{activeSchedule.title}</h3>
                <span className="text-ink-muted inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  <span>{toPersianDigits(activeSchedule.rows.length)} نوبت حرکت در برنامه</span>
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-canvas">
                <table className="w-full text-sm text-center border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface text-xs text-gold">
                      <th className="py-3 px-4 font-bold">{activeSchedule.fromOriginLabel}</th>
                      <th className="py-3 px-4 font-bold border-r border-line">
                        {activeSchedule.fromCampusLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {activeSchedule.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface/60">
                        <td className="py-2.5 px-4 font-bold tabular-nums text-ink">
                          {row.fromOrigin}
                        </td>
                        <td className="py-2.5 px-4 font-bold tabular-nums text-gold border-r border-line">
                          {row.fromCampus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-ink font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{OFFICIAL_SHUTTLE_SCHEDULE.ruleNote}</span>
                </div>
                <span className="text-xs font-bold text-gold">
                  ایستگاه داخل شهر: {OFFICIAL_SHUTTLE_SCHEDULE.cityStation}
                </span>
              </div>
            </div>
          );
        })()}
      </section>

      {/* خدمات رسمی سلامت، پزشک رایگان و مشاور در خوابگاه */}
      <section id="wellness" aria-labelledby="wellness-heading" className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gold inline-flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4" />
            <span>مرکز مشاوره، سلامت و سبک زندگی مجتمع آموزش عالی گناباد</span>
          </p>
          <h2 id="wellness-heading" className="text-xl sm:text-2xl font-bold text-ink mt-1">
            پزشک عمومی رایگان و حضور مشاور در خوابگاه
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {OFFICIAL_WELLNESS_SERVICES.map((svc) => (
            <article
              key={svc.id}
              className="rounded-2xl border border-line bg-surface p-5 sm:p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gold inline-flex items-center gap-1.5">
                    {svc.id === 'general-physician' ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : (
                      <HeartPulse className="w-4 h-4" />
                    )}
                    <span>{svc.badge}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-ink">{svc.title}</h3>
                  <p className="text-sm font-semibold text-gold mt-1">{svc.provider}</p>
                  <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{svc.serviceDetail}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                    <span className="text-ink-muted block mb-0.5">زمان حضور</span>
                    <strong className="text-ink">{svc.schedule}</strong>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                    <span className="text-ink-muted block mb-0.5">مکان مراجعه</span>
                    <strong className="text-ink">{svc.location}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-line flex flex-wrap gap-2">
                {svc.highlights.map((h) => (
                  <span
                    key={h}
                    className="px-2.5 py-1 rounded-lg border border-line bg-canvas text-[11px] font-medium text-ink-muted"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* لیست قابل چاپ «چه چیزی با خودم ببرم؟» */}
      <section aria-labelledby="packing-heading" className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold mb-1">چک‌لیست چمدان خوابگاهی</p>
            <h2 id="packing-heading" className="text-xl sm:text-2xl font-bold text-ink">
              چه چیزی با خودم به خوابگاه ببرم؟
            </h2>
            <p className="text-xs text-ink-muted mt-1 tabular-nums">
              {toPersianDigits(packedIds.length)} از {toPersianDigits(DORM_PACKING_LIST.length)} مورد آماده شده است.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print min-h-[42px] px-4 rounded-xl border border-line bg-canvas hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gold" />
            <span>چاپ لیست وسایل</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DORM_PACKING_LIST.map((item) => {
            const done = packedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => togglePack(item.id)}
                aria-pressed={done}
                className={`text-right rounded-xl border p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  done
                    ? 'border-emerald-500/45 bg-emerald-500/8'
                    : 'border-line bg-canvas hover:border-gold/40'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-line bg-surface'
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5" />}
                </span>
                <div>
                  <p className="text-[11px] text-gold font-medium">{item.group}</p>
                  <p className={`text-sm mt-0.5 ${done ? 'line-through text-ink-muted' : 'text-ink'}`}>
                    {item.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* مودال جزئیات کامل خوابگاه */}
      {selectedDorm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`جزئیات ${selectedDorm.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedDorm(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl glass-panel p-6 sm:p-8 my-auto max-h-[88vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold text-gold">خوابگاه {selectedDorm.gender}</p>
                <h2 className="text-2xl font-bold text-ink mt-0.5">{selectedDorm.name}</h2>
              </div>
              <button
                type="button"
                aria-label="بستن جزئیات خوابگاه"
                onClick={() => setSelectedDorm(null)}
                className="p-2 rounded-xl border border-line text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* نوار تصاویر واقعی این خوابگاه داخل مودال */}
            {(() => {
              const modalPhotos = resolvePhotosForDorm(selectedDorm);
              if (modalPhotos.length === 0) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gold inline-flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>تصاویر واقعی {selectedDorm.name}</span>
                    </span>
                    <span className="text-ink-muted">برای بزرگ‌نمایی روی عکس بزن</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {modalPhotos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setLightboxState({ photos: modalPhotos, index: idx })}
                        className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-line hover:border-gold cursor-pointer"
                      >
                        <img
                          src={photo.thumbSrc}
                          alt={photo.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                          <Expand className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="text-xs text-ink-muted block">آدرس</span>
                <span className="font-medium text-ink">{selectedDorm.address}</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="text-xs text-ink-muted block">فاصله تا دانشگاه</span>
                <span className="font-medium text-ink">{selectedDorm.distanceToCampus}</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="text-xs text-ink-muted block">هزینه و ظرفیت</span>
                <span className="font-medium text-ink">
                  {selectedDorm.monthlyFee} · {selectedDorm.capacity}
                </span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="text-xs text-ink-muted block">ساعت تردد و تماس سرپرست</span>
                <span className="font-medium text-ink">{selectedDorm.curfewHours}</span>
                <span className="block text-xs text-gold mt-1 inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedDorm.supervisorPhone}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href={selectedDorm.neshanUrl || 'https://neshan.org/maps'}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 rounded-xl bg-emerald-deep text-[#f4f1e8] hover:bg-emerald-mid text-xs font-semibold inline-flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>مسیریابی با نشان</span>
              </a>
              <a
                href={selectedDorm.baladUrl || 'https://balad.ir'}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 rounded-xl border border-line bg-surface hover:border-gold/50 text-xs font-semibold text-ink inline-flex items-center gap-2"
              >
                <span>مسیریابی با بلد</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <div>
                <h3 className="font-bold text-ink mb-2">امکانات خوابگاه</h3>
                <ul className="space-y-1.5 text-ink-muted list-disc list-inside">
                  {selectedDorm.facilities.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-ink mb-2">قوانین و نکات مهم</h3>
                <ul className="space-y-1.5 text-ink-muted list-disc list-inside">
                  {selectedDorm.rules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-ink text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>مدارک لازم برای تحویل اتاق</span>
              </h3>
              <p className="text-sm text-ink-muted">{selectedDorm.requiredDocs.join(' · ')}</p>
            </div>

            {selectedDorm.faq.length > 0 && (
              <div className="border-t border-line pt-4 space-y-2.5">
                <h3 className="font-bold text-ink text-sm">سوالات متداول این خوابگاه</h3>
                {selectedDorm.faq.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-line bg-surface p-3.5 text-sm">
                    <p className="font-semibold text-ink">{item.q}</p>
                    <p className="text-ink-muted mt-1">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* نمایشگر تمام‌صفحه تصاویر خوابگاه‌ها */}
      <PhotoLightbox
        photos={lightboxState?.photos ?? []}
        activeIndex={lightboxState ? lightboxState.index : null}
        onClose={() => setLightboxState(null)}
        onChangeIndex={(nextIdx) =>
          setLightboxState((prev) => (prev ? { ...prev, index: nextIdx } : null))
        }
      />
    </div>
  );
};
