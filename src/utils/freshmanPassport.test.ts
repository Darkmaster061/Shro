import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_OFFICIAL_MAJORS,
  buildPassportSerial,
  findRegistrationDayForMajor,
} from './freshmanPassport';

test('ALL_OFFICIAL_MAJORS lists all 20 official 1405 majors across 3 registration days', () => {
  assert.equal(ALL_OFFICIAL_MAJORS.length, 20);
  const unique = new Set(ALL_OFFICIAL_MAJORS.map((m) => m.major));
  assert.equal(unique.size, 20);
});

test('findRegistrationDayForMajor resolves exact official day for each major', () => {
  const mech = findRegistrationDayForMajor('مهندسی مکانیک');
  assert.ok(mech);
  assert.equal(mech.id, 'day-1');
  assert.equal(mech.dateJalali, '۱۴۰۵/۰۹/۰۱');

  const comp = findRegistrationDayForMajor('مهندسی کامپیوتر');
  assert.ok(comp);
  assert.equal(comp.id, 'day-2');
  assert.equal(comp.dateJalali, '۱۴۰۵/۰۹/۰۲');

  const mgmt = findRegistrationDayForMajor('مدیریت صنعتی');
  assert.ok(mgmt);
  assert.equal(mgmt.id, 'day-3');
  assert.equal(mgmt.dateJalali, '۱۴۰۵/۰۹/۰۳');

  assert.equal(findRegistrationDayForMajor('رشته ناموجود'), null);
});

test('buildPassportSerial is deterministic and formatted as UOG-1405-XXXX', () => {
  const s1 = buildPassportSerial('حسین کریمی', 'مهندسی کامپیوتر');
  const s2 = buildPassportSerial('حسین کریمی', 'مهندسی کامپیوتر');
  const s3 = buildPassportSerial('مریم احمدی', 'مهندسی برق');
  assert.equal(s1, s2);
  assert.match(s1, /^UOG-1405-\d{4}$/);
  assert.notEqual(s1, s3);
});
