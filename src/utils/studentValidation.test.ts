import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFreshman405Number,
  normalizeStudentNumber,
  validateIranianMobile,
  validateIranianNationalId,
  validateStudentNumber,
} from './studentValidation';

test('normalizeStudentNumber converts Persian digits and strips separators', () => {
  assert.equal(normalizeStudentNumber('۴۰۵-۱۲۳ ۲۱۷۳'), '4051232173');
  assert.equal(normalizeStudentNumber(' ٤٠٢١٢٣٢١٧٣ '), '4021232173');
});

test('validateStudentNumber enforces 405 prefix when require405 is true (desk role)', () => {
  const ok405 = validateStudentNumber('۴۰۵۱۲۳۲۱۷۳', { require405: true });
  assert.equal(ok405.valid, true);
  assert.equal(ok405.is405, true);
  assert.equal(ok405.normalized, '4051232173');

  const blocked402 = validateStudentNumber('4021232173', { require405: true });
  assert.equal(blocked402.valid, false);
  assert.equal(blocked402.is405, false);
  assert.ok(blocked402.error?.includes('۴۰۵'));

  const allowedOwner402 = validateStudentNumber('4021232173', { require405: false });
  assert.equal(allowedOwner402.valid, true);
  assert.equal(allowedOwner402.is405, false);
  assert.equal(isFreshman405Number('4059876543'), true);
  assert.equal(isFreshman405Number('4021232173'), false);
});

test('validateStudentNumber rejects too-short or non-numeric inputs', () => {
  assert.equal(validateStudentNumber('40512').valid, false);
  assert.equal(validateStudentNumber('40512345678901').valid, false);
  assert.equal(validateStudentNumber('405abc1234').valid, false);
});

test('validateIranianNationalId verifies official Mod-11 checksum and rejects uniform digits', () => {
  // کد ملی معتبر ریاضی: 0013520849 -> sum = 0*10+0*9+1*8+3*7+5*6+2*5+0*4+8*3+4*2 = 8+21+30+10+24+8 = 101; 101%11 = 2; 11-2 = 9
  const valid1 = validateIranianNationalId('۰۰۱۳۵۲۰۸۴۹');
  assert.equal(valid1.valid, true);
  assert.equal(valid1.normalized, '0013520849');

  // 0499370899 -> valid Iranian test ID
  const valid2 = validateIranianNationalId('0499370899');
  assert.equal(valid2.valid, true);

  // Bad checksum
  assert.equal(validateIranianNationalId('0013520848').valid, false);
  // All identical digits
  assert.equal(validateIranianNationalId('1111111111').valid, false);
  assert.equal(validateIranianNationalId('0000000000').valid, false);
  // Wrong length
  assert.equal(validateIranianNationalId('123456789').valid, false);
});

test('validateIranianMobile normalizes Persian digits and +98 prefixes', () => {
  const m1 = validateIranianMobile('۰۹۱۵ ۱۲۳-۴۵۶۷');
  assert.equal(m1.valid, true);
  assert.equal(m1.normalized, '09151234567');

  const m2 = validateIranianMobile('+98 902 497 4311');
  assert.equal(m2.valid, true);
  assert.equal(m2.normalized, '09024974311');

  const m3 = validateIranianMobile('9158944208');
  assert.equal(m3.valid, true);
  assert.equal(m3.normalized, '09158944208');

  assert.equal(validateIranianMobile('05157202122').valid, false);
  assert.equal(validateIranianMobile('0915123').valid, false);
});
