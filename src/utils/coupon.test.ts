import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBirthHashInput,
  parseStudentsCsv,
  resolveOfflineClaimConflict,
} from './coupon';

test('normalizes birth hash input across Persian/Arabic variants and digits', () => {
  const a = buildBirthHashInput('علي', 'كريمي', '۱۳۸۷/۰۵/۲۰');
  const b = buildBirthHashInput('علی ', 'کریمی', '1387/5/20');
  assert.equal(a, 'علی|کریمی|1387/05/20');
  assert.equal(a, b);
});

test('parses CSV with valid rows, errors, and duplicate detection', () => {
  const csv = [
    'نام,نام‌خانوادگی,تاریخ تولد,یادداشت',
    'محمدرضا,احمدی,۱۳۸۷/۰۳/۱۵,مهندسی کامپیوتر',
    'محمدرضا,احمدی,1387/03/15,تکراری',
    'سارا,حسینی,1387/14/99,تاریخ اشتباه',
    'فاطمه,رضایی,۱۳۸۶/۱۱/۰۴,مهندسی برق',
  ].join('\n');

  const result = parseStudentsCsv(csv);
  assert.equal(result.validCount, 2);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.errorCount, 1);
});

test('offline conflict resolution keeps earliest valid claim', () => {
  const first = resolveOfflineClaimConflict(null, '2026-09-23T07:05:00Z');
  assert.equal(first.accepted, true);

  const laterDuplicate = resolveOfflineClaimConflict(
    '2026-09-23T07:05:00Z',
    '2026-09-23T07:10:00Z'
  );
  assert.equal(laterDuplicate.accepted, false);
  assert.equal(laterDuplicate.winnerIso, '2026-09-23T07:05:00Z');
});
