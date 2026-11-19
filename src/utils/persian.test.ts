import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toPersianDigits,
  toEnglishDigits,
  normalizePersian,
  fuzzyScorePersian,
  searchFaqs,
} from './persian';

test('converts English digits to Persian digits and back', () => {
  assert.equal(toPersianDigits('1405/07/01'), '۱۴۰۵/۰۷/۰۱');
  assert.equal(toEnglishDigits('۱۳۸۷/۰۵/۲۰'), '1387/05/20');
});

test('normalizes Arabic Yeh, Kaf, ZWNJ and extra spaces', () => {
  assert.equal(normalizePersian('كلاس\u200cهای  دانشگاهي'), 'کلاس های دانشگاهی');
});

test('fuzzy search tolerates Persian spelling mistakes and Arabic characters', () => {
  const sampleFaqs = [
    {
      question: 'مدارک لازم برای ثبت‌نام خوابگاه چیست؟',
      answer: 'اصل شناسنامه و کارت ملی برای تحویل اتاق خوابگاه لازم است.',
      category: 'خوابگاه',
    },
    {
      question: 'چگونه ژتون صبحانه دریافت کنم؟',
      answer: 'از بخش هیئت نام و تاریخ تولد شمسی خود را وارد کنید.',
      category: 'هیئت',
    },
  ];

  // غلط املایی رایج: خابگاه به جای خوابگاه
  const resTypo = searchFaqs(sampleFaqs, 'خابگاه');
  assert.equal(resTypo.length, 1);
  assert.equal(resTypo[0].category, 'خوابگاه');

  // حروف عربی + بدون نیم‌فاصله
  const resArabic = searchFaqs(sampleFaqs, 'ثبت نام خوابگاه');
  assert.equal(resArabic.length, 1);

  assert.ok(fuzzyScorePersian('ژتون صبخانه', 'ژتون صبحانه') > 40);
});
