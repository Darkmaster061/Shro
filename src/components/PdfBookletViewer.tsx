import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Search,
  ZoomIn,
  ZoomOut,
  FileText,
  Layers,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizePersian, toEnglishDigits, toPersianDigits } from '../utils/persian';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfBookmarkItem {
  label: string;
  page: number;
}

interface PdfBookletViewerProps {
  url: string;
  title: string;
  bookmarks?: PdfBookmarkItem[];
  jumpRequest?: { page: number; nonce: number } | null;
}

/**
 * نمایشگر داخلی PDF با pdfjs-dist و worker محلی (مناسب دفترچه ۹۳ صفحه‌ای قرار قیام ۹)
 * شامل بارگذاری تنبلانه صفحات، فهرست محورها، جستجوی فارسی در متن، پرش به صفحه، زوم، تمام‌صفحه و دانلود مستقیم
 */
export const PdfBookletViewer: React.FC<PdfBookletViewerProps> = ({
  url,
  title,
  bookmarks = [],
  jumpRequest = null,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerAreaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showThumbs, setShowThumbs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setPageNum(1);
    setPageInput(toPersianDigits(1));
    setSearchHits([]);
    setSearchedOnce(false);

    // disableFontFace: true باعث رندر دقیق برداری فونت‌های فارسی تعبیه‌شده (مثل B Nazanin/B Titr) بدون به‌هم‌ریختگی حروف می‌شود
    const task = pdfjsLib.getDocument({
      url,
      disableFontFace: true,
      standardFontDataUrl: '/pdf-standard-fonts/',
    });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('نمایش مستقیم این فایل در مرورگر شما ممکن نشد. از دکمه دانلود مستقیم استفاده کنید.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      task.destroy().catch(() => {});
    };
  }, [url]);

  // پرش بیرونی از روی کارت‌های کانون به صفحه دقیق آن کانون در دفترچه
  useEffect(() => {
    if (!jumpRequest || !numPages) return;
    const safe = Math.max(1, Math.min(numPages, jumpRequest.page));
    setPageNum(safe);
    setPageInput(toPersianDigits(safe));
  }, [jumpRequest, numPages]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = viewerAreaRef.current
        ? Math.max(260, viewerAreaRef.current.clientWidth - 32)
        : 760;
      const fitScale = Math.min(scale, availableWidth / baseViewport.width);
      const effectiveScale = availableWidth < 600 ? Math.max(0.45, fitScale) : scale;
      const viewport = page.getViewport({ scale: effectiveScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      renderTask = page.render({ canvasContext: ctx, viewport, canvas });
      renderTask.promise.catch(() => {});
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNum, scale]);

  const goToPage = (target: number) => {
    const safe = Math.max(1, Math.min(numPages || 1, target));
    setPageNum(safe);
    setPageInput(toPersianDigits(safe));
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(toEnglishDigits(pageInput));
    if (!Number.isNaN(num)) goToPage(num);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfDoc || !searchQuery.trim()) {
      setSearchHits([]);
      setSearchedOnce(false);
      return;
    }
    setSearching(true);
    setSearchedOnce(true);
    const q = normalizePersian(searchQuery.trim());
    const hits: number[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const text = normalizePersian(
          content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
        );
        if (text.includes(q)) hits.push(i);
      } catch {
        // عبور از صفحه خطادار
      }
    }
    setSearchHits(hits);
    if (hits.length > 0) goToPage(hits[0]);
    setSearching(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-line bg-surface overflow-hidden flex flex-col"
    >
      {/* نوار ابزار نمایشگر PDF */}
      <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-surface-elevated/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-5 h-5 text-gold shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-ink truncate">{title}</h3>
            {numPages > 0 && (
              <p className="text-xs text-ink-muted tabular-nums">
                صفحه {toPersianDigits(pageNum)} از {toPersianDigits(numPages)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowThumbs((v) => !v)}
            className="min-h-[38px] px-3 rounded-lg border border-line bg-surface text-xs text-ink hover:border-gold/50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-gold" />
            <span>فهرست صفحات</span>
          </button>

          <button
            type="button"
            aria-label="کوچک‌نمایی"
            onClick={() => setScale((s) => Math.max(0.65, Number((s - 0.15).toFixed(2))))}
            className="min-h-[38px] min-w-[38px] rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:border-gold/50 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="بزرگ‌نمایی"
            onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
            className="min-h-[38px] min-w-[38px] rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:border-gold/50 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            onClick={toggleFullscreen}
            className="min-h-[38px] min-w-[38px] rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:border-gold/50 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <a
            href={url}
            download="basij-cadres-booklet.pdf"
            className="min-h-[38px] px-3.5 rounded-lg bg-gold text-[#071714] hover:bg-gold-strong text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>دانلود مستقیم PDF</span>
          </a>
        </div>
      </div>

      {/* فهرست پرش سریع محورها */}
      {bookmarks.length > 0 && numPages > 0 && (
        <div className="px-4 py-2.5 border-b border-line bg-canvas/50 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-ink-muted shrink-0 inline-flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-gold" />
            <span>فهرست سریع:</span>
          </span>
          {bookmarks.map((bm) => {
            const active = pageNum === bm.page;
            return (
              <button
                key={bm.label}
                type="button"
                onClick={() => goToPage(bm.page)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-gold text-[#071714] font-bold'
                    : 'border border-line bg-surface text-ink-muted hover:text-ink hover:border-gold/40'
                }`}
              >
                {bm.label}
              </button>
            );
          })}
        </div>
      )}

      {/* جستجو و پرش به صفحه */}
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در متن دفترچه (مثلاً: رسانه، هجرت، آزاداندیشی)..."
              aria-label="جستجو در متن فایل PDF"
              className="w-full min-h-[38px] rounded-lg border border-line bg-canvas pr-9 pl-3 text-xs text-ink"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="min-h-[38px] px-3 rounded-lg border border-line bg-surface hover:border-gold/50 text-ink font-medium cursor-pointer"
          >
            {searching ? '...' : 'جستجو'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="صفحه قبلی"
            disabled={pageNum <= 1}
            onClick={() => goToPage(pageNum - 1)}
            className="min-h-[38px] min-w-[38px] rounded-lg border border-line bg-surface disabled:opacity-40 flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <span className="text-ink-muted">پرش به صفحه:</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="شماره صفحه"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-14 min-h-[36px] text-center rounded-lg border border-line bg-canvas text-ink tabular-nums"
            />
          </form>

          <button
            type="button"
            aria-label="صفحه بعدی"
            disabled={pageNum >= numPages}
            onClick={() => goToPage(pageNum + 1)}
            className="min-h-[38px] min-w-[38px] rounded-lg border border-line bg-surface disabled:opacity-40 flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {searchedOnce && !searching && (
        <div className="px-4 py-2 border-b border-line bg-gold-soft/50 flex flex-wrap items-center gap-2 text-xs">
          {searchHits.length > 0 ? (
            <>
              <span className="text-ink font-medium">
                نتیجه در {toPersianDigits(searchHits.length)} صفحه یافت شد:
              </span>
              {searchHits.slice(0, 15).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  className={`px-2.5 py-1 rounded-md tabular-nums cursor-pointer ${
                    p === pageNum
                      ? 'bg-gold text-[#071714] font-bold'
                      : 'bg-surface border border-line text-ink'
                  }`}
                >
                  صفحه {toPersianDigits(p)}
                </button>
              ))}
            </>
          ) : (
            <span className="text-ink-muted">
              عبارت موردنظر در لایه متنی دفترچه یافت نشد؛ از فهرست محورها یا پرش به صفحه استفاده کنید.
            </span>
          )}
        </div>
      )}

      {/* بدنه نمایشگر */}
      <div className="flex flex-1 min-h-[440px] max-h-[75vh] overflow-hidden">
        {showThumbs && numPages > 0 && (
          <aside className="w-32 sm:w-40 border-l border-line bg-canvas p-2.5 overflow-y-auto space-y-1.5 shrink-0">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`w-full px-3 py-2 rounded-lg text-xs text-right tabular-nums transition-colors cursor-pointer ${
                  p === pageNum
                    ? 'bg-gold text-[#071714] font-bold'
                    : 'bg-surface text-ink-muted hover:text-ink border border-line'
                }`}
              >
                صفحه {toPersianDigits(p)}
              </button>
            ))}
          </aside>
        )}

        <div
          ref={viewerAreaRef}
          className="flex-1 overflow-auto bg-canvas/80 p-4 flex items-start justify-center"
        >
          {loading && (
            <div className="py-20 text-sm text-ink-muted">در حال بارگذاری دفترچه PDF...</div>
          )}
          {!loading && error && (
            <div className="py-16 text-center max-w-md space-y-4">
              <p className="text-sm text-ink-muted">{error}</p>
              <a
                href={url}
                download="basij-cadres-booklet.pdf"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-[#071714] font-bold text-sm"
              >
                <Download className="w-4 h-4" />
                <span>دانلود فایل PDF</span>
              </a>
            </div>
          )}
          {!loading && !error && (
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-lg bg-white max-w-full h-auto"
            />
          )}
        </div>
      </div>
    </div>
  );
};
