import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import type {
  BreakfastAnalyticsSummary,
  BreakfastReportFilters,
  DetailedBreakfastRecord,
  ReportColumnKey,
} from '../src/types/portal';
import { normalizeNameCompact, toPersianDigits } from '../src/utils/persian';
import { formatJalaliTime } from '../src/utils/jalali';

export interface ReportColumnDefinition {
  key: ReportColumnKey;
  label: string;
  width: number;
  sensitive?: boolean;
  defaultSelected: boolean;
}

export const REPORT_COLUMN_DEFS: ReportColumnDefinition[] = [
  { key: 'rowNum', label: 'ردیف', width: 8, defaultSelected: true },
  { key: 'studentNumber', label: 'شماره دانشجویی', width: 18, defaultSelected: true },
  { key: 'cohortGroup', label: 'گروه / ورودی', width: 16, defaultSelected: true },
  { key: 'firstName', label: 'نام', width: 16, defaultSelected: true },
  { key: 'lastName', label: 'نام‌خانوادگی', width: 20, defaultSelected: true },
  { key: 'nationalId', label: 'کد ملی', width: 16, sensitive: true, defaultSelected: true },
  { key: 'phone', label: 'شماره تماس', width: 16, sensitive: true, defaultSelected: true },
  { key: 'birthJalali', label: 'تاریخ تولد شمسی', width: 16, sensitive: true, defaultSelected: false },
  { key: 'major', label: 'رشته تحصیلی', width: 24, defaultSelected: true },
  { key: 'status', label: 'وضعیت صبحانه', width: 20, defaultSelected: true },
  { key: 'mealName', label: 'وعده دریافتی', width: 24, defaultSelected: true },
  { key: 'claimedAt', label: 'زمان تحویل صبحانه', width: 18, defaultSelected: true },
  { key: 'authorizedBy', label: 'ثبت‌کننده کد', width: 16, defaultSelected: false },
  { key: 'note', label: 'توضیحات', width: 22, defaultSelected: false },
];

export const DEFAULT_SELECTED_COLUMNS: ReportColumnKey[] = REPORT_COLUMN_DEFS.filter(
  (c) => c.defaultSelected
).map((c) => c.key);

export const REPORT_COLUMN_KEYS_SET = new Set<ReportColumnKey>(
  REPORT_COLUMN_DEFS.map((c) => c.key)
);

/**
 * خنثی‌سازی تزریق فرمول اکسل (CSV/Excel Formula Injection) برای امنیت فایل‌های خروجی
 */
export function sanitizeSpreadsheetValue(value: string): string {
  const str = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!str) return '—';
  if (/^[=+\-@\t]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * کدگذاری امن HTML جهت جلوگیری مطلق از XSS در گزارش گرافیکی HTML
 */
export function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getBreakfastStatusLabel(r: DetailedBreakfastRecord): string {
  if (r.hasClaimed) return 'صبحانه تحویل گرفت';
  if (r.registrationStatus === 'authorized') return 'در انتظار تکمیل فرم';
  return 'ژتون صادر شد (نخورده)';
}

/**
 * فیلتر کردن رکوردهای گزارش بر اساس وضعیت صبحانه، ورودی ۴۰۵/سایر، رشته، وعده و جستجوی متنی
 */
export function filterBreakfastRecords(
  records: DetailedBreakfastRecord[],
  filters: Partial<BreakfastReportFilters>
): DetailedBreakfastRecord[] {
  const status = filters.status || 'all';
  const cohort = filters.cohort || 'all';
  const major = (filters.major || '').trim();
  const mealId = filters.mealId ?? 'all';
  const qRaw = (filters.q || '').trim();
  const qNorm = normalizeNameCompact(qRaw);
  const qLower = qRaw.toLowerCase();

  return records.filter((r) => {
    if (status === 'claimed' && !r.hasClaimed) return false;
    if (status === 'unclaimed_coupon' && (r.hasClaimed || r.registrationStatus !== 'registered')) {
      return false;
    }
    if (status === 'pending_form' && r.registrationStatus !== 'authorized') return false;

    if (cohort === '405' && !r.is405) return false;
    if (cohort === 'non_405' && r.is405) return false;

    if (major && major !== 'همه' && r.major !== major) return false;

    if (mealId !== 'all' && typeof mealId === 'number') {
      if (r.mealId !== mealId) return false;
    }

    if (qRaw) {
      const fullNorm = normalizeNameCompact(`${r.firstName} ${r.lastName}`);
      const hit =
        fullNorm.includes(qNorm) ||
        r.studentNumber.includes(qRaw) ||
        r.nationalId.includes(qRaw) ||
        r.phone.includes(qRaw) ||
        r.major.toLowerCase().includes(qLower) ||
        r.cohortGroup.toLowerCase().includes(qLower) ||
        r.note.toLowerCase().includes(qLower) ||
        r.couponCode.toLowerCase().includes(qLower);
      if (!hit) return false;
    }
    return true;
  });
}

/**
 * محاسبه آمار مدیریتی کامل (کی خورده، کی نخورده، کی فرم نزده، تفکیک ۴۰۵ و رشته)
 */
export function computeBreakfastAnalytics(
  records: DetailedBreakfastRecord[]
): BreakfastAnalyticsSummary {
  const activeRecords = records.filter((r) => r.active);
  const totalAuthorized = activeRecords.length;
  let registeredCount = 0;
  let pendingFormCount = 0;
  let claimedCount = 0;
  let unclaimedWithCouponCount = 0;
  let cohort405Count = 0;
  let otherCohortCount = 0;

  const majorMap = new Map<string, { total: number; claimed: number }>();
  const cohortMap = new Map<string, { total: number; claimed: number }>();

  for (const r of activeRecords) {
    if (r.registrationStatus === 'authorized') {
      pendingFormCount++;
    } else {
      registeredCount++;
    }

    if (r.hasClaimed) {
      claimedCount++;
    } else if (r.registrationStatus === 'registered') {
      unclaimedWithCouponCount++;
    }

    if (r.is405) cohort405Count++;
    else otherCohortCount++;

    const majorKey = r.major?.trim() || 'تکمیل‌نشده';
    const curMajor = majorMap.get(majorKey) || { total: 0, claimed: 0 };
    curMajor.total++;
    if (r.hasClaimed) curMajor.claimed++;
    majorMap.set(majorKey, curMajor);

    const cohortKey = r.cohortGroup?.trim() || (r.is405 ? 'نوورود ۱۴۰۵' : 'سایر');
    const curCohort = cohortMap.get(cohortKey) || { total: 0, claimed: 0 };
    curCohort.total++;
    if (r.hasClaimed) curCohort.claimed++;
    cohortMap.set(cohortKey, curCohort);
  }

  const claimRatePercent =
    totalAuthorized > 0 ? Math.round((claimedCount / totalAuthorized) * 100) : 0;

  const byMajor = Array.from(majorMap.entries())
    .map(([major, stat]) => ({ major, ...stat }))
    .sort((a, b) => b.total - a.total);

  const byCohort = Array.from(cohortMap.entries())
    .map(([cohortGroup, stat]) => ({ cohortGroup, ...stat }))
    .sort((a, b) => b.total - a.total);

  return {
    totalAuthorized,
    registeredCount,
    pendingFormCount,
    claimedCount,
    unclaimedWithCouponCount,
    cohort405Count,
    otherCohortCount,
    claimRatePercent,
    byMajor,
    byCohort,
  };
}

export function extractCellValue(
  r: DetailedBreakfastRecord,
  col: ReportColumnKey,
  index: number
): string {
  switch (col) {
    case 'rowNum':
      return toPersianDigits(index + 1);
    case 'studentNumber':
      return r.studentNumber ? toPersianDigits(r.studentNumber) : '—';
    case 'cohortGroup':
      return r.cohortGroup || (r.is405 ? 'نوورود ۱۴۰۵' : 'سایر');
    case 'firstName':
      return r.firstName || '—';
    case 'lastName':
      return r.lastName || '—';
    case 'nationalId':
      return r.nationalId ? toPersianDigits(r.nationalId) : '—';
    case 'phone':
      return r.phone ? toPersianDigits(r.phone) : '—';
    case 'birthJalali':
      return r.birthJalali ? toPersianDigits(r.birthJalali) : '—';
    case 'major':
      return r.major || '—';
    case 'status':
      return getBreakfastStatusLabel(r);
    case 'mealName':
      return r.mealName ? `${r.mealName}${r.mealDateJalali ? ` (${r.mealDateJalali})` : ''}` : '—';
    case 'claimedAt':
      return r.claimedAt ? formatJalaliTime(r.claimedAt) : '—';
    case 'authorizedBy':
      return r.authorizedBy || '—';
    case 'note':
      return r.note || '—';
  }
}

export function normalizeSelectedColumns(cols?: ReportColumnKey[]): ReportColumnKey[] {
  if (!Array.isArray(cols) || cols.length === 0) return [...DEFAULT_SELECTED_COLUMNS];
  const valid = cols.filter((c) => REPORT_COLUMN_KEYS_SET.has(c));
  return valid.length > 0 ? valid : [...DEFAULT_SELECTED_COLUMNS];
}

export interface ExportMeta {
  title: string;
  universityName: string;
  exportedBy: string;
  generatedAtLabel: string;
  filterSummary: string;
  basijLogoUrl?: string;
  heyatLogoUrl?: string;
  uploadsDir?: string;
}

/**
 * ساخت فایل اکسل گرافیکی و حرفه‌ای (.xlsx) دو شیته و کاملاً راست‌به‌چپ با ExcelJS
 */
export async function buildBreakfastExcelBuffer(
  records: DetailedBreakfastRecord[],
  selectedColumnsInput: ReportColumnKey[],
  meta: ExportMeta
): Promise<Buffer> {
  const selectedColumns = normalizeSelectedColumns(selectedColumnsInput);
  const analytics = computeBreakfastAnalytics(records);

  const wb = new ExcelJS.Workbook();
  wb.creator = meta.exportedBy || 'پرتال نوورودی‌های گناباد';
  wb.created = new Date();

  const EMERALD_DARK = 'FF071714';
  const EMERALD_MID = 'FF0F352E';
  const GOLD_FILL = 'FFDEB154';
  const GOLD_SOFT = 'FFFBF4E4';
  const ROW_ZEBRA = 'FFF5F8F7';
  const WHITE = 'FFFFFFFF';
  const TEXT_DARK = 'FF111827';
  const TEXT_MUTED = 'FF4B5563';
  const GREEN_BG = 'FFD1FAE5';
  const GREEN_FG = 'FF065F46';
  const AMBER_BG = 'FFFEF3C7';
  const AMBER_FG = 'FF92400E';
  const SLATE_BG = 'FFE5E7EB';
  const SLATE_FG = 'FF374151';

  // =======================================================
  // شیت ۱: داشبورد مدیریتی و خلاصه آماری
  // =======================================================
  const summarySheet = wb.addWorksheet('خلاصه مدیریتی', {
    views: [{ rightToLeft: true }],
  });

  summarySheet.columns = [
    { width: 32 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  // بنر عنوان رسمی
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `گزارش مدیریتی سامانه ژتون صبحانه — ${meta.universityName}`;
  titleCell.font = { name: 'Tahoma', size: 15, bold: true, color: { argb: GOLD_FILL } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_DARK } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 38;

  summarySheet.mergeCells('A2:D2');
  const subCell = summarySheet.getCell('A2');
  subCell.value = `هیئت دانشجویی محبان‌الحسین (ع) و بسیج دانشجویی | ${meta.filterSummary} | زمان تهیه: ${meta.generatedAtLabel} | توسط: ${meta.exportedBy}`;
  subCell.font = { name: 'Tahoma', size: 10, color: { argb: WHITE } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_MID } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 24;

  // جدول KPIهای کلیدی
  summarySheet.addRow([]);
  const kpiHeader = summarySheet.addRow(['شاخص کلیدی عملکرد (KPI)', 'تعداد', 'سهم / نرخ', 'توضیحات']);
  kpiHeader.height = 26;
  kpiHeader.eachCell((cell) => {
    cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: EMERALD_DARK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: EMERALD_DARK } },
      bottom: { style: 'medium', color: { argb: EMERALD_DARK } },
      left: { style: 'thin', color: { argb: EMERALD_DARK } },
      right: { style: 'thin', color: { argb: EMERALD_DARK } },
    };
  });

  const kpiRows: [string, number, string, string, string?][] = [
    ['کل کدهای دانشجویی مجازشده (فعال)', analytics.totalAuthorized, '۱۰۰٪', 'مجموع ۴۰۵ و سایر ورودی‌های مجاز'],
    [
      'صبحانه تحویل گرفته‌اند (خورده)',
      analytics.claimedCount,
      `${toPersianDigits(analytics.claimRatePercent)}٪`,
      'تأییدشده در ایستگاه اسکنر صبحانه',
      GREEN_BG,
    ],
    [
      'ژتون صادر شده ولی هنوز نخورده‌اند',
      analytics.unclaimedWithCouponCount,
      analytics.totalAuthorized
        ? `${toPersianDigits(Math.round((analytics.unclaimedWithCouponCount / analytics.totalAuthorized) * 100))}٪`
        : '۰٪',
      'فرم تکمیل شده و QR دارند، هنوز مراجعه نکرده‌اند',
      AMBER_BG,
    ],
    [
      'کد مجازشده ولی هنوز فرم پر نکرده‌اند',
      analytics.pendingFormCount,
      analytics.totalAuthorized
        ? `${toPersianDigits(Math.round((analytics.pendingFormCount / analytics.totalAuthorized) * 100))}٪`
        : '۰٪',
      'در میز استقبال ثبت شده، منتظر تکمیل فرم دانشجو',
      SLATE_BG,
    ],
    ['ورودی نوورود ۱۴۰۵ (شروع با ۴۰۵)', analytics.cohort405Count, '—', 'ثبت‌شده توسط میز استقبال یا مدیریت'],
    ['سایر ورودی‌ها (انجمن، کانون، خادمان)', analytics.otherCohortCount, '—', 'ثبت‌شده انحصاراً توسط مدیریت کل'],
  ];

  for (const [label, count, rate, desc, tint] of kpiRows) {
    const row = summarySheet.addRow([label, toPersianDigits(count), rate, desc]);
    row.height = 24;
    row.eachCell((cell, colNum) => {
      cell.font = {
        name: 'Tahoma',
        size: 10,
        bold: colNum <= 2,
        color: { argb: TEXT_DARK },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: tint || WHITE },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 2 || colNum === 3 ? 'center' : 'right',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });
  }

  // تفکیک بر اساس گروه/ورودی
  summarySheet.addRow([]);
  const cohortTitle = summarySheet.addRow(['تفکیک بر اساس گروه / ورودی', 'کل مجازشده', 'تحویل گرفته', 'درصد تحویل']);
  cohortTitle.height = 25;
  cohortTitle.eachCell((cell) => {
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_MID } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const c of analytics.byCohort) {
    const pct = c.total > 0 ? Math.round((c.claimed / c.total) * 100) : 0;
    const r = summarySheet.addRow([
      sanitizeSpreadsheetValue(c.cohortGroup),
      toPersianDigits(c.total),
      toPersianDigits(c.claimed),
      `${toPersianDigits(pct)}٪`,
    ]);
    r.height = 22;
    r.eachCell((cell, colNum) => {
      cell.font = { name: 'Tahoma', size: 10, color: { argb: TEXT_DARK } };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'right' : 'center' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  }

  // تفکیک بر اساس رشته تحصیلی
  summarySheet.addRow([]);
  const majorTitle = summarySheet.addRow(['تفکیک بر اساس رشته تحصیلی', 'کل مجازشده', 'تحویل گرفته', 'نخورده / در انتظار']);
  majorTitle.height = 25;
  majorTitle.eachCell((cell) => {
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_MID } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const m of analytics.byMajor) {
    const r = summarySheet.addRow([
      sanitizeSpreadsheetValue(m.major),
      toPersianDigits(m.total),
      toPersianDigits(m.claimed),
      toPersianDigits(Math.max(0, m.total - m.claimed)),
    ]);
    r.height = 22;
    r.eachCell((cell, colNum) => {
      cell.font = { name: 'Tahoma', size: 10, color: { argb: TEXT_DARK } };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'right' : 'center' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  }

  // =======================================================
  // شیت ۲: لیست تفصیلی دانشجویان مطابق ستون‌های انتخابی ادمین
  // =======================================================
  const detailSheet = wb.addWorksheet('لیست تفصیلی دانشجویان', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
  });

  const colDefs = selectedColumns.map(
    (key) => REPORT_COLUMN_DEFS.find((d) => d.key === key)!
  );
  detailSheet.columns = colDefs.map((d) => ({ width: d.width }));

  const lastColLetter = detailSheet.getColumn(colDefs.length).letter;

  detailSheet.mergeCells(`A1:${lastColLetter}1`);
  const dTitle = detailSheet.getCell('A1');
  dTitle.value = `${meta.title} — ${meta.universityName} (${toPersianDigits(records.length)} رکورد)`;
  dTitle.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: GOLD_FILL } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_DARK } };
  dTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  detailSheet.getRow(1).height = 34;

  detailSheet.mergeCells(`A2:${lastColLetter}2`);
  const dMeta = detailSheet.getCell('A2');
  dMeta.value = `${meta.filterSummary} | تاریخ تهیه: ${meta.generatedAtLabel} | گزارش‌گیرنده: ${meta.exportedBy}`;
  dMeta.font = { name: 'Tahoma', size: 9, color: { argb: TEXT_MUTED } };
  dMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_SOFT } };
  dMeta.alignment = { vertical: 'middle', horizontal: 'center' };
  detailSheet.getRow(2).height = 22;

  const headerRow = detailSheet.addRow(colDefs.map((d) => d.label));
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_MID } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: EMERALD_DARK } },
      bottom: { style: 'medium', color: { argb: GOLD_FILL } },
      left: { style: 'thin', color: { argb: 'FF1F4E45' } },
      right: { style: 'thin', color: { argb: 'FF1F4E45' } },
    };
  });

  detailSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: Math.max(3, records.length + 3), column: colDefs.length },
  };

  records.forEach((rec, idx) => {
    const values = colDefs.map((d) =>
      sanitizeSpreadsheetValue(extractCellValue(rec, d.key, idx))
    );
    const row = detailSheet.addRow(values);
    row.height = 24;
    const baseFill = idx % 2 === 1 ? ROW_ZEBRA : WHITE;

    row.eachCell((cell, colIndex) => {
      const colKey = colDefs[colIndex - 1]?.key;
      let fillColor = baseFill;
      let fontColor = TEXT_DARK;
      let bold = colKey === 'firstName' || colKey === 'lastName' || colKey === 'studentNumber';

      if (colKey === 'status') {
        bold = true;
        if (rec.hasClaimed) {
          fillColor = GREEN_BG;
          fontColor = GREEN_FG;
        } else if (rec.registrationStatus === 'authorized') {
          fillColor = SLATE_BG;
          fontColor = SLATE_FG;
        } else {
          fillColor = AMBER_BG;
          fontColor = AMBER_FG;
        }
      }

      cell.font = { name: 'Tahoma', size: 10, bold, color: { argb: fontColor } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.alignment = {
        vertical: 'middle',
        horizontal:
          colKey === 'rowNum' ||
          colKey === 'studentNumber' ||
          colKey === 'nationalId' ||
          colKey === 'phone' ||
          colKey === 'status' ||
          colKey === 'claimedAt'
            ? 'center'
            : 'right',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function tryLoadLocalImageDataUri(urlPath?: string, uploadsDir?: string): string {
  if (!urlPath) return '';
  try {
    let filePath = '';
    if (urlPath.startsWith('/assets/')) {
      filePath = path.resolve(process.cwd(), 'public', urlPath.slice(1));
    } else if (urlPath.startsWith('/uploads/') && uploadsDir) {
      filePath = path.resolve(uploadsDir, path.basename(urlPath));
    }
    if (!filePath || !fs.existsSync(filePath)) return '';
    const stat = fs.statSync(filePath);
    if (stat.size > 400_000) return '';
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.svg'
        ? 'image/svg+xml'
        : '';
    if (!mime) return '';
    return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
  } catch {
    return '';
  }
}

/**
 * ساخت گزارش گرافیکی، مستقل و کاملاً آفلاین HTML + آماده چاپ رسمی PDF
 * با نمودارهای SVG داخلی، فیلتر و جستجوی زنده درون‌فایلی و کدگذاری کامل XSS
 */
export function buildBreakfastGraphicHtml(
  records: DetailedBreakfastRecord[],
  selectedColumnsInput: ReportColumnKey[],
  meta: ExportMeta,
  autoPrint = false
): string {
  const selectedColumns = normalizeSelectedColumns(selectedColumnsInput);
  const colDefs = selectedColumns.map(
    (key) => REPORT_COLUMN_DEFS.find((d) => d.key === key)!
  );
  const analytics = computeBreakfastAnalytics(records);

  const basijLogo = tryLoadLocalImageDataUri(meta.basijLogoUrl, meta.uploadsDir);
  const heyatLogo = tryLoadLocalImageDataUri(meta.heyatLogoUrl, meta.uploadsDir);

  // نمودار میله‌ای SVG رشته‌های برتر
  const topMajors = analytics.byMajor.slice(0, 8);
  const maxMajorTotal = Math.max(1, ...topMajors.map((m) => m.total));
  const majorBarsHtml =
    topMajors.length === 0
      ? '<p class="muted">هنوز رشته‌ای ثبت نشده است.</p>'
      : topMajors
          .map((m) => {
            const totalW = Math.max(8, Math.round((m.total / maxMajorTotal) * 100));
            const claimedW = m.total > 0 ? Math.round((m.claimed / m.total) * totalW) : 0;
            return `
              <div class="bar-row">
                <div class="bar-head">
                  <span class="bar-label">${escapeHtml(m.major)}</span>
                  <span class="bar-val">${toPersianDigits(m.claimed)} از ${toPersianDigits(m.total)} نفر</span>
                </div>
                <div class="bar-track">
                  <div class="bar-total" style="width:${totalW}%"></div>
                  <div class="bar-claimed" style="width:${claimedW}%"></div>
                </div>
              </div>
            `;
          })
          .join('');

  // نمودار دایره‌ای دونات SVG برای وضعیت کل
  const totalSafe = Math.max(1, analytics.totalAuthorized);
  const claimedPct = Math.round((analytics.claimedCount / totalSafe) * 100);
  const unclaimedPct = Math.round((analytics.unclaimedWithCouponCount / totalSafe) * 100);
  const pendingPct = Math.max(0, 100 - claimedPct - unclaimedPct);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dashClaimed = (claimedPct / 100) * circ;
  const dashUnclaimed = (unclaimedPct / 100) * circ;
  const dashPending = Math.max(0, circ - dashClaimed - dashUnclaimed);

  const tableHeadHtml = colDefs
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join('');

  const tableBodyHtml = records
    .map((r, idx) => {
      const statusCode = r.hasClaimed
        ? 'claimed'
        : r.registrationStatus === 'authorized'
        ? 'pending'
        : 'unclaimed';
      const searchText = escapeHtml(
        `${r.firstName} ${r.lastName} ${r.studentNumber} ${r.nationalId} ${r.phone} ${r.major} ${r.cohortGroup} ${r.note}`.toLowerCase()
      );
      const cells = colDefs
        .map((c) => {
          const val = extractCellValue(r, c.key, idx);
          if (c.key === 'status') {
            return `<td><span class="badge badge-${statusCode}">${escapeHtml(val)}</span></td>`;
          }
          const isMono =
            c.key === 'studentNumber' || c.key === 'nationalId' || c.key === 'phone';
          return `<td class="${isMono ? 'mono' : ''}">${escapeHtml(val)}</td>`;
        })
        .join('');
      return `<tr data-status="${statusCode}" data-cohort="${r.is405 ? '405' : 'other'}" data-search="${searchText}">${cells}</tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)} | ${escapeHtml(meta.universityName)}</title>
  <style>
    :root {
      --bg: #071714;
      --surface: #0d2420;
      --surface-2: #12312b;
      --gold: #deb154;
      --gold-soft: rgba(222, 177, 84, 0.14);
      --ink: #f4f1e8;
      --muted: #9eb6af;
      --line: rgba(222, 177, 84, 0.22);
      --green: #10b981;
      --amber: #f59e0b;
      --slate: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Vazirmatn, Tahoma, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top right, #11352d 0%, var(--bg) 55%);
      color: var(--ink);
      line-height: 1.7;
      padding: 24px 16px 48px;
    }
    .wrap { max-width: 1280px; margin: 0 auto; }
    .hero {
      background: linear-gradient(135deg, #0b241f 0%, #071714 65%, #162e27 100%);
      border: 1px solid rgba(222, 177, 84, 0.42);
      border-top: 4px solid var(--gold);
      border-radius: 24px;
      padding: 24px 28px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.7);
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logos { display: flex; gap: 8px; }
    .logos img {
      width: 54px; height: 54px; object-fit: contain;
      background: rgba(255,255,255,0.96); border-radius: 14px; padding: 5px;
      border: 1px solid rgba(222,177,84,0.5);
    }
    .eyebrow { color: var(--gold); font-size: 12px; font-weight: 700; margin: 0 0 4px; }
    h1 { margin: 0; font-size: 24px; font-weight: 800; color: #fff; }
    .meta { font-size: 12px; color: var(--muted); margin-top: 6px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn {
      border: 1px solid var(--line);
      background: var(--gold);
      color: #071714;
      font-family: inherit;
      font-weight: 800;
      font-size: 13px;
      padding: 10px 18px;
      border-radius: 12px;
      cursor: pointer;
    }
    .btn-ghost {
      background: rgba(255,255,255,0.06);
      color: var(--ink);
    }
    .kpi-grid {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
      gap: 14px;
    }
    .kpi {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px 18px;
    }
    .kpi-num { font-size: 28px; font-weight: 900; line-height: 1.2; }
    .kpi-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .c-gold { color: var(--gold); }
    .c-green { color: #34d399; }
    .c-amber { color: #fbbf24; }
    .c-slate { color: #cbd5e1; }
    .charts-grid {
      margin-top: 20px;
      display: grid;
      grid-template-columns: minmax(280px, 380px) 1fr;
      gap: 16px;
    }
    @media (max-width: 860px) {
      .charts-grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 20px;
    }
    .card h2 {
      margin: 0 0 14px;
      font-size: 15px;
      font-weight: 800;
      color: var(--gold);
    }
    .donut-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .legend { font-size: 12px; display: flex; flex-direction: column; gap: 8px; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 99px; display: inline-block; }
    .bar-row { margin-bottom: 11px; }
    .bar-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
    .bar-label { font-weight: 700; }
    .bar-val { color: var(--muted); }
    .bar-track {
      position: relative;
      height: 10px;
      border-radius: 99px;
      background: rgba(255,255,255,0.08);
      overflow: hidden;
    }
    .bar-total {
      position: absolute; inset-block: 0; right: 0;
      background: rgba(222, 177, 84, 0.35);
      border-radius: 99px;
    }
    .bar-claimed {
      position: absolute; inset-block: 0; right: 0;
      background: linear-gradient(90deg, #10b981, #34d399);
      border-radius: 99px;
    }
    .table-card { margin-top: 20px; }
    .toolbar {
      display: flex; flex-wrap: wrap; gap: 10px;
      align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .search-input {
      background: var(--bg);
      border: 1px solid var(--line);
      color: var(--ink);
      border-radius: 12px;
      padding: 9px 14px;
      min-width: 240px;
      font-family: inherit;
      font-size: 13px;
    }
    .filter-group { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--line);
      color: var(--muted);
      border-radius: 10px;
      padding: 6px 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .chip.active { background: var(--gold); color: #071714; border-color: var(--gold); }
    .table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid var(--line); }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead th {
      background: var(--surface-2);
      color: var(--gold);
      font-weight: 800;
      padding: 11px 10px;
      text-align: right;
      border-bottom: 2px solid rgba(222, 177, 84, 0.4);
      white-space: nowrap;
    }
    tbody td {
      padding: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      vertical-align: middle;
    }
    tbody tr:nth-child(even) { background: rgba(255,255,255,0.025); }
    tbody tr:hover { background: rgba(222,177,84,0.08); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; direction: ltr; text-align: center; }
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 99px;
      font-size: 11px; font-weight: 800; white-space: nowrap;
    }
    .badge-claimed { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.45); }
    .badge-unclaimed { background: rgba(245,158,11,0.2); color: #fcd34d; border: 1px solid rgba(245,158,11,0.45); }
    .badge-pending { background: rgba(148,163,184,0.2); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.4); }
    .muted { color: var(--muted); font-size: 12px; }
    .footer-note { margin-top: 24px; text-align: center; font-size: 11.5px; color: var(--muted); }
    @media print {
      body { background: #fff !important; color: #111 !important; padding: 0; }
      .no-print { display: none !important; }
      .hero, .kpi, .card {
        background: #fff !important;
        color: #111 !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: none !important;
      }
      .hero { border-top: 4px solid #0f352e !important; }
      h1, .card h2, .eyebrow, .c-gold { color: #0f352e !important; }
      .c-green { color: #047857 !important; }
      .c-amber { color: #b45309 !important; }
      .c-slate, .meta, .kpi-label, .bar-val { color: #475569 !important; }
      thead th { background: #0f352e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-claimed { background: #d1fae5 !important; color: #065f46 !important; border-color: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-unclaimed { background: #fef3c7 !important; color: #92400e !important; border-color: #f59e0b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-pending { background: #e2e8f0 !important; color: #334155 !important; border-color: #94a3b8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .table-wrap { overflow: visible !important; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <div class="brand">
        ${
          basijLogo || heyatLogo
            ? `<div class="logos">${
                basijLogo ? `<img src="${basijLogo}" alt="بسیج دانشجویی" />` : ''
              }${heyatLogo ? `<img src="${heyatLogo}" alt="هیئت محبان‌الحسین" />` : ''}</div>`
            : ''
        }
        <div>
          <p class="eyebrow">هیئت دانشجویی محبان‌الحسین (ع) و بسیج دانشجویی · ${escapeHtml(meta.universityName)}</p>
          <h1>${escapeHtml(meta.title)}</h1>
          <div class="meta">
            ${escapeHtml(meta.filterSummary)} · تهیه شده در ${escapeHtml(meta.generatedAtLabel)} توسط ${escapeHtml(meta.exportedBy)}
          </div>
        </div>
      </div>
      <div class="actions no-print">
        <button type="button" class="btn" onclick="window.print()">چاپ / ذخیره رسمی PDF</button>
      </div>
    </header>

    <section class="kpi-grid">
      <div class="kpi">
        <div class="kpi-num c-gold">${toPersianDigits(analytics.totalAuthorized)}</div>
        <div class="kpi-label">کل کدهای مجازشده</div>
      </div>
      <div class="kpi">
        <div class="kpi-num c-green">${toPersianDigits(analytics.claimedCount)}</div>
        <div class="kpi-label">صبحانه تحویل گرفته‌اند (${toPersianDigits(analytics.claimRatePercent)}٪)</div>
      </div>
      <div class="kpi">
        <div class="kpi-num c-amber">${toPersianDigits(analytics.unclaimedWithCouponCount)}</div>
        <div class="kpi-label">ژتون دارند ولی نخورده‌اند</div>
      </div>
      <div class="kpi">
        <div class="kpi-num c-slate">${toPersianDigits(analytics.pendingFormCount)}</div>
        <div class="kpi-label">کد ثبت شده (منتظر تکمیل فرم)</div>
      </div>
      <div class="kpi">
        <div class="kpi-num c-gold">${toPersianDigits(analytics.cohort405Count)} / ${toPersianDigits(analytics.otherCohortCount)}</div>
        <div class="kpi-label">ورودی ۴۰۵ / انجمن و سایر</div>
      </div>
    </section>

    <section class="charts-grid">
      <div class="card">
        <h2>نمودار وضعیت توزیع صبحانه</h2>
        <div class="donut-wrap">
          <svg width="144" height="144" viewBox="0 0 144 144" aria-label="نمودار توزیع صبحانه">
            <circle cx="72" cy="72" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="18"></circle>
            <circle cx="72" cy="72" r="${radius}" fill="none" stroke="#10b981" stroke-width="18"
              stroke-dasharray="${dashClaimed.toFixed(2)} ${circ.toFixed(2)}" transform="rotate(-90 72 72)"></circle>
            <circle cx="72" cy="72" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="18"
              stroke-dasharray="${dashUnclaimed.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-dashClaimed).toFixed(2)}" transform="rotate(-90 72 72)"></circle>
            <circle cx="72" cy="72" r="${radius}" fill="none" stroke="#94a3b8" stroke-width="18"
              stroke-dasharray="${dashPending.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-(dashClaimed + dashUnclaimed)).toFixed(2)}" transform="rotate(-90 72 72)"></circle>
            <text x="72" y="70" text-anchor="middle" fill="#deb154" font-size="22" font-weight="900">${toPersianDigits(claimedPct)}٪</text>
            <text x="72" y="88" text-anchor="middle" fill="#9eb6af" font-size="10">تحویل صبحانه</text>
          </svg>
          <div class="legend">
            <div class="legend-item"><span class="dot" style="background:#10b981"></span><span>صبحانه خورده: ${toPersianDigits(analytics.claimedCount)} نفر (${toPersianDigits(claimedPct)}٪)</span></div>
            <div class="legend-item"><span class="dot" style="background:#f59e0b"></span><span>ژتون دارد (نخورده): ${toPersianDigits(analytics.unclaimedWithCouponCount)} نفر (${toPersianDigits(unclaimedPct)}٪)</span></div>
            <div class="legend-item"><span class="dot" style="background:#94a3b8"></span><span>در انتظار تکمیل فرم: ${toPersianDigits(analytics.pendingFormCount)} نفر (${toPersianDigits(pendingPct)}٪)</span></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>تفکیک آماری بر اساس رشته تحصیلی (سبز: تحویل گرفته · طلایی: کل ثبت‌شده)</h2>
        ${majorBarsHtml}
      </div>
    </section>

    <section class="card table-card">
      <div class="toolbar no-print">
        <div class="filter-group" id="statusFilters">
          <button type="button" class="chip active" data-f="all">همه (${toPersianDigits(records.length)})</button>
          <button type="button" class="chip" data-f="claimed">صبحانه خورده</button>
          <button type="button" class="chip" data-f="unclaimed">ژتون دارد (نخورده)</button>
          <button type="button" class="chip" data-f="pending">منتظر تکمیل فرم</button>
        </div>
        <input id="qBox" class="search-input" type="search" placeholder="جستجوی زنده در جدول (نام، شماره دانشجویی، رشته...)" />
      </div>
      <div class="table-wrap">
        <table id="reportTable">
          <thead><tr>${tableHeadHtml}</tr></thead>
          <tbody>
            ${
              tableBodyHtml ||
              `<tr><td colspan="${colDefs.length}" style="text-align:center;padding:24px;color:#9eb6af">رکوردی با فیلتر انتخابی یافت نشد.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>

    <p class="footer-note">
      این گزارش به‌صورت ۱۰۰٪ آفلاین توسط سامانه هوشمند نوورودی‌های ${escapeHtml(meta.universityName)} تولید شده است.
    </p>
  </div>

  <script>
    (function(){
      var activeStatus = 'all';
      var qBox = document.getElementById('qBox');
      var rows = Array.prototype.slice.call(document.querySelectorAll('#reportTable tbody tr[data-status]'));
      var btns = Array.prototype.slice.call(document.querySelectorAll('#statusFilters .chip'));
      function apply() {
        var q = (qBox && qBox.value ? qBox.value.trim().toLowerCase() : '');
        rows.forEach(function(tr){
          var okStatus = activeStatus === 'all' || tr.getAttribute('data-status') === activeStatus;
          var okQ = !q || (tr.getAttribute('data-search') || '').indexOf(q) !== -1;
          tr.style.display = (okStatus && okQ) ? '' : 'none';
        });
      }
      btns.forEach(function(b){
        b.addEventListener('click', function(){
          btns.forEach(function(x){ x.classList.remove('active'); });
          b.classList.add('active');
          activeStatus = b.getAttribute('data-f') || 'all';
          apply();
        });
      });
      if (qBox) qBox.addEventListener('input', apply);
      ${autoPrint ? 'window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 350); });' : ''}
    })();
  </script>
</body>
</html>`;
}
