import React, { useEffect, useState } from 'react';
import { CalendarPlus, MapPin, Pin } from 'lucide-react';
import { api } from '../api/client';
import { buildIcsContent } from '../utils/jalali';
import type { AnnouncementItem } from '../types/portal';

const CATS = ['همه', 'ثبت‌نام', 'خوابگاه', 'بسیج', 'هیئت', 'عمومی'] as const;

export const AnnouncementsPage: React.FC = () => {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof CATS)[number]>('همه');

  useEffect(() => {
    api
      .getAnnouncements()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible =
    filter === 'همه' ? items : items.filter((i) => i.category === filter);

  const exportIcs = (ann: AnnouncementItem) => {
    const ics = buildIcsContent({
      title: ann.title,
      description: ann.body,
      location: ann.location || 'مجتمع آموزش عالی گناباد',
      startIso: ann.eventDateIso || new Date().toISOString(),
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gonabad-event-${ann.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-semibold text-gold mb-1">اخبار و تقویم رویدادها</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink">اطلاعیه‌ها و رویدادها</h1>
          <p className="mt-2 text-sm text-ink-muted">
            مهم‌ترین خبرهای روزهای ثبت‌نام، خوابگاه، کانون‌ها و هیئت به همراه امکان ذخیره در تقویم گوشی.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-surface border border-line p-1 rounded-xl">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                filter === c
                  ? 'bg-gold text-[#071714]'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 rounded-2xl border border-line bg-surface animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-muted">
          اطلاعیه‌ای در این دسته‌بندی ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((ann) => (
            <article
              key={ann.id}
              className={`rounded-2xl border p-6 space-y-3 ${
                ann.pinned ? 'border-gold/45 bg-surface' : 'border-line bg-surface'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <div className="flex flex-wrap items-center gap-2">
                  {ann.pinned && (
                    <span className="inline-flex items-center gap-1 text-gold font-bold">
                      <Pin className="w-3.5 h-3.5" />
                      مهم
                    </span>
                  )}
                  <span className="text-gold font-semibold">{ann.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{ann.dateJalali}</span>
                  {ann.eventTime && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">ساعت {ann.eventTime}</span>
                    </>
                  )}
                  {ann.isDemo && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>نمونه</span>
                    </>
                  )}
                </div>

                {ann.eventDateIso && (
                  <button
                    type="button"
                    onClick={() => exportIcs(ann)}
                    className="text-gold hover:underline font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>افزودن به تقویم (ICS)</span>
                  </button>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-ink">{ann.title}</h2>
              <p className="text-sm text-ink-muted leading-relaxed">{ann.body}</p>

              {ann.location && (
                <p className="text-xs text-ink-muted inline-flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                  <span>محل برگزاری: {ann.location}</span>
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
