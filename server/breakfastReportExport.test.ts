import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  buildBreakfastExcelBuffer,
  buildBreakfastGraphicHtml,
  computeBreakfastAnalytics,
  filterBreakfastRecords,
  sanitizeSpreadsheetValue,
} from './breakfastReportExport';
import type { DetailedBreakfastRecord } from '../src/types/portal';

const SAMPLE_RECORDS: DetailedBreakfastRecord[] = [
  {
    id: 1,
    studentNumber: '4051232101',
    cohortGroup: 'نوورود ۱۴۰۵',
    is405: true,
    firstName: 'علی',
    lastName: 'محمدی',
    nationalId: '0013520849',
    phone: '09151234567',
    birthJalali: '1387/05/20',
    major: 'مهندسی کامپیوتر',
    registrationStatus: 'registered',
    hasClaimed: true,
    mealId: 1,
    mealName: 'صبحانه روز اول',
    mealDateJalali: '۱۴۰۵/۰۹/۰۱',
    claimedAt: '2026-11-22T04:30:00.000Z',
    authorizedBy: 'desk',
    authorizedAt: '2026-11-22T04:00:00.000Z',
    registeredAt: '2026-11-22T04:15:00.000Z',
    couponCode: 'GNB-AAAA1111',
    note: '',
    active: true,
    isDemo: false,
  },
  {
    id: 2,
    studentNumber: '4051232102',
    cohortGroup: 'نوورود ۱۴۰۵',
    is405: true,
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    birthJalali: '',
    major: '',
    registrationStatus: 'authorized',
    hasClaimed: false,
    mealId: null,
    mealName: '',
    mealDateJalali: '',
    claimedAt: '',
    authorizedBy: 'desk',
    authorizedAt: '2026-11-22T04:05:00.000Z',
    registeredAt: '',
    couponCode: 'GNB-BBBB2222',
    note: '',
    active: true,
    isDemo: false,
  },
  {
    id: 3,
    studentNumber: '4021232173',
    cohortGroup: 'انجمن علمی',
    is405: false,
    firstName: 'رضا',
    lastName: 'احمدی<script>alert(1)</script>',
    nationalId: '0499370899',
    phone: '09024974311',
    birthJalali: '1384/02/10',
    major: 'مهندسی برق',
    registrationStatus: 'registered',
    hasClaimed: false,
    mealId: null,
    mealName: '',
    mealDateJalali: '',
    claimedAt: '',
    authorizedBy: 'owner',
    authorizedAt: '2026-11-22T04:10:00.000Z',
    registeredAt: '2026-11-22T04:20:00.000Z',
    couponCode: 'GNB-CCCC3333',
    note: '=SUM(A1:A5)',
    active: true,
    isDemo: false,
  },
];

test('computeBreakfastAnalytics accurately splits claimed, unclaimed coupon, pending form, and 405 vs non-405', () => {
  const stats = computeBreakfastAnalytics(SAMPLE_RECORDS);
  assert.equal(stats.totalAuthorized, 3);
  assert.equal(stats.claimedCount, 1);
  assert.equal(stats.unclaimedWithCouponCount, 1);
  assert.equal(stats.pendingFormCount, 1);
  assert.equal(stats.registeredCount, 2);
  assert.equal(stats.cohort405Count, 2);
  assert.equal(stats.otherCohortCount, 1);
  assert.equal(stats.claimRatePercent, 33);
});

test('filterBreakfastRecords filters by status, cohort, and query', () => {
  assert.equal(filterBreakfastRecords(SAMPLE_RECORDS, { status: 'claimed' }).length, 1);
  assert.equal(filterBreakfastRecords(SAMPLE_RECORDS, { status: 'pending_form' }).length, 1);
  assert.equal(filterBreakfastRecords(SAMPLE_RECORDS, { status: 'unclaimed_coupon' }).length, 1);
  assert.equal(filterBreakfastRecords(SAMPLE_RECORDS, { cohort: '405' }).length, 2);
  assert.equal(filterBreakfastRecords(SAMPLE_RECORDS, { cohort: 'non_405' }).length, 1);
  assert.equal(filterBreakfastRecords(SAMPLE_RECORDS, { q: '4021232173' }).length, 1);
});

test('sanitizeSpreadsheetValue neutralizes Excel formula injection', () => {
  assert.equal(sanitizeSpreadsheetValue('=SUM(A1:A5)'), "'=SUM(A1:A5)");
  assert.equal(sanitizeSpreadsheetValue('+cmd|calc'), "'+cmd|calc");
  assert.equal(sanitizeSpreadsheetValue('مهندسی کامپیوتر'), 'مهندسی کامپیوتر');
});

test('buildBreakfastExcelBuffer creates valid RTL 2-sheet XLSX with chosen columns', async () => {
  const buf = await buildBreakfastExcelBuffer(
    SAMPLE_RECORDS,
    ['rowNum', 'studentNumber', 'firstName', 'status', 'note'],
    {
      title: 'گزارش تست صبحانه',
      universityName: 'مجتمع آموزش عالی گناباد',
      exportedBy: 'مدیر کل',
      generatedAtLabel: '۱۴۰۵/۰۹/۰۱',
      filterSummary: 'همه رکوردها',
    }
  );
  assert.ok(buf.length > 2000);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  assert.equal(wb.worksheets.length, 2);
  assert.equal(wb.worksheets[0].views[0]?.rightToLeft, true);
  assert.equal(wb.worksheets[1].views[0]?.rightToLeft, true);
  // Check header columns count matches 5 selected columns
  const headerRow = wb.worksheets[1].getRow(3);
  assert.equal(headerRow.cellCount, 5);
  assert.equal(headerRow.getCell(2).value, 'شماره دانشجویی');
  // Verify formula neutralization on row 6 (3rd data row)
  assert.equal(wb.worksheets[1].getRow(6).getCell(5).value, "'=SUM(A1:A5)");
});

test('buildBreakfastGraphicHtml escapes XSS and respects selected columns', () => {
  const html = buildBreakfastGraphicHtml(
    SAMPLE_RECORDS,
    ['studentNumber', 'lastName', 'status'],
    {
      title: 'گزارش گرافیکی صبحانه',
      universityName: 'مجتمع آموزش عالی گناباد',
      exportedBy: 'مدیر کل',
      generatedAtLabel: '۱۴۰۵/۰۹/۰۱',
      filterSummary: 'فیلتر همه',
    }
  );
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('شماره دانشجویی'));
  assert.ok(!html.includes('<th>کد ملی</th>'));
});
