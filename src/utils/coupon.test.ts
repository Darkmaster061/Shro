import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBirthHashInput,
  checkSingleBreakfastEligibility,
  findStudentExistingClaim,
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

test('offline conflict resolution keeps earliest valid claim across any day', () => {
  const first = resolveOfflineClaimConflict(null, '2026-11-22T07:05:00Z');
  assert.equal(first.accepted, true);

  const laterSameDay = resolveOfflineClaimConflict(
    '2026-11-22T07:05:00Z',
    '2026-11-22T07:10:00Z'
  );
  assert.equal(laterSameDay.accepted, false);
  assert.equal(laterSameDay.winnerIso, '2026-11-22T07:05:00Z');

  const nextDayAttempt = resolveOfflineClaimConflict(
    '2026-11-22T07:05:00Z',
    '2026-11-23T07:01:00Z'
  );
  assert.equal(nextDayAttempt.accepted, false);
  assert.equal(nextDayAttempt.winnerIso, '2026-11-22T07:05:00Z');
});

test('single-breakfast rule blocks Day 2 and Day 3 once Day 1 is claimed', () => {
  const fresh = checkSingleBreakfastEligibility({}, 1);
  assert.equal(fresh.allowed, true);
  assert.equal(fresh.reason, 'eligible');

  const afterDay1 = { 1: '2026-11-22T07:35:00Z' };

  const retryDay1 = checkSingleBreakfastEligibility(afterDay1, 1);
  assert.equal(retryDay1.allowed, false);
  assert.equal(retryDay1.reason, 'already_claimed_same_meal');
  assert.equal(retryDay1.existingMealId, 1);

  const attemptDay2 = checkSingleBreakfastEligibility(afterDay1, 2);
  assert.equal(attemptDay2.allowed, false);
  assert.equal(attemptDay2.reason, 'already_claimed_other_day');
  assert.equal(attemptDay2.existingMealId, 1);
  assert.equal(attemptDay2.existingClaimedAtIso, '2026-11-22T07:35:00Z');

  const attemptDay3 = checkSingleBreakfastEligibility(afterDay1, 3);
  assert.equal(attemptDay3.allowed, false);
  assert.equal(attemptDay3.reason, 'already_claimed_other_day');

  const earliest = findStudentExistingClaim({
    2: '2026-11-23T08:00:00Z',
    1: '2026-11-22T07:20:00Z',
  });
  assert.deepEqual(earliest, { mealId: 1, claimedAtIso: '2026-11-22T07:20:00Z' });
});
