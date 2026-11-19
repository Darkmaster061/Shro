import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toJalali,
  toGregorian,
  parseAndValidateJalaliDate,
  isLeapJalaliYear,
  buildIcsContent,
} from './jalali';

test('converts known Gregorian dates to Jalali accurately', () => {
  // Nowruz 1405 = 2026-03-21
  assert.deepEqual(toJalali(2026, 3, 21), { jy: 1405, jm: 1, jd: 1 });
  // 2026-09-23 = 1405/07/01 (1 Mehr 1405)
  assert.deepEqual(toJalali(2026, 9, 23), { jy: 1405, jm: 7, jd: 1 });
});

test('round-trips Jalali to Gregorian accurately', () => {
  const g = toGregorian(1386, 5, 20);
  assert.deepEqual(toJalali(g.gy, g.gm, g.gd), { jy: 1386, jm: 5, jd: 20 });
});

test('validates Jalali dates including Persian digits and leap year Esfand 30', () => {
  const valid = parseAndValidateJalaliDate('۱۳۸۷/۰۵/۲۰');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, '1387/05/20');

  assert.equal(isLeapJalaliYear(1403), true);
  assert.equal(parseAndValidateJalaliDate('1403/12/30').valid, true);
  assert.equal(parseAndValidateJalaliDate('1404/12/30').valid, false);
  assert.equal(parseAndValidateJalaliDate('1387/13/01').valid, false);
});

test('generates valid ICS event file', () => {
  const ics = buildIcsContent({
    title: 'جشن استقبال نوورودی‌ها',
    description: 'آیین معارفه نوورودی‌های دانشگاه گناباد',
    location: 'سالن آمفی‌تئاتر دانشگاه',
    startIso: '2026-09-23T06:30:00.000Z',
  });
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('SUMMARY:جشن استقبال نوورودی‌ها'));
  assert.ok(ics.includes('END:VCALENDAR'));
});
