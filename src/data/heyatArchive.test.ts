import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  HEYAT_ARCHIVE_CATEGORIES,
  HEYAT_ARCHIVE_PHOTOS,
  HEYAT_EXECUTIVE_TEAMS,
  filterHeyatArchivePhotos,
  getFreshmenWelcomePhotos,
} from './heyatArchive';

const PUBLIC_ROOT = path.resolve(process.cwd(), 'public');

test('همه ۳۱ تصویر آرشیو برنامه‌های هیئت (نسخه کامل و بندانگشتی WebP) به‌صورت محلی روی دیسک موجود هستند', () => {
  assert.equal(HEYAT_ARCHIVE_PHOTOS.length, 31);
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();

  for (const photo of HEYAT_ARCHIVE_PHOTOS) {
    assert.ok(!seenIds.has(photo.id), `شناسه تکراری در آرشیو هیئت: ${photo.id}`);
    seenIds.add(photo.id);
    assert.ok(!seenPaths.has(photo.src), `مسیر تکراری تصویر: ${photo.src}`);
    seenPaths.add(photo.src);

    assert.ok(photo.src.startsWith('/assets/heyat/archive/'), `مسیر باید محلی باشد: ${photo.src}`);
    assert.ok(!photo.src.includes('http'), `لینک خارجی ممنوع است: ${photo.src}`);
    assert.ok(!photo.src.includes('Screenshot'), `اسکرین‌شات خصوصی هرگز نباید نمایش داده شود: ${photo.src}`);

    const fullPath = path.join(PUBLIC_ROOT, photo.src.replace(/^\//, ''));
    const thumbPath = path.join(PUBLIC_ROOT, photo.thumbSrc.replace(/^\//, ''));

    assert.ok(fs.existsSync(fullPath), `فایل تصویر کامل یافت نشد: ${fullPath}`);
    assert.ok(fs.existsSync(thumbPath), `فایل بندانگشتی یافت نشد: ${thumbPath}`);
    assert.ok(fs.statSync(fullPath).size > 2048, `حجم تصویر کامل غیرعادی است: ${photo.src}`);
    assert.ok(fs.statSync(thumbPath).size > 1024, `حجم بندانگشتی غیرعادی است: ${photo.thumbSrc}`);
  }
});

test('فیلتر دسته‌بندی آرشیو برنامه‌های هیئت دقیق است و هر دسته حداقل ۳ تصویر دارد', () => {
  assert.equal(filterHeyatArchivePhotos('all').length, HEYAT_ARCHIVE_PHOTOS.length);
  let sum = 0;

  for (const tab of HEYAT_ARCHIVE_CATEGORIES) {
    if (tab.id === 'all') continue;
    const filtered = filterHeyatArchivePhotos(tab.id);
    assert.ok(filtered.length >= 3, `دسته ${tab.id} باید حداقل ۳ تصویر داشته باشد`);
    assert.ok(filtered.every((p) => p.archiveCategory === tab.id));
    sum += filtered.length;
  }

  assert.equal(sum, HEYAT_ARCHIVE_PHOTOS.length);
  assert.equal(getFreshmenWelcomePhotos().length, 4);
});

test('هر ۱۰ بخش اجرایی رسمی هیئت دانشجویی محبان‌الحسین (ع) بدون تکرار و کامل تعریف شده‌اند', () => {
  assert.equal(HEYAT_EXECUTIVE_TEAMS.length, 10);
  const names = new Set(HEYAT_EXECUTIVE_TEAMS.map((t) => t.name));
  assert.equal(names.size, 10);
  for (const expected of [
    'بخش بانی‌یاب',
    'بخش پذیرایی',
    'بخش تجهیزات',
    'بخش تدارکات و پشتیبانی',
    'بخش رسانه',
    'بخش فضاسازی',
    'بخش فضای مجازی',
    'بخش نظافت',
    'بخش هماهنگی',
    'بخش انتظامات',
  ]) {
    assert.ok(names.has(expected), `تیم اجرایی ${expected} یافت نشد`);
  }
});
