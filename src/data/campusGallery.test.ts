import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMPUS_GALLERY_PHOTOS,
  filterCampusPhotos,
  getDormPhotos,
  getFeaturedCampusPhotos,
  resolveDormKeyByName,
} from './campusGallery';

test('all campus gallery photos use strictly local WebP paths', () => {
  assert.ok(CAMPUS_GALLERY_PHOTOS.length >= 28);
  for (const photo of CAMPUS_GALLERY_PHOTOS) {
    const validFullPrefix =
      photo.src.startsWith('/assets/campus/') || photo.src.startsWith('/assets/heyat/');
    const validThumbPrefix =
      photo.thumbSrc.startsWith('/assets/campus/') || photo.thumbSrc.startsWith('/assets/heyat/');
    assert.ok(validFullPrefix && photo.src.endsWith('.webp'));
    assert.ok(validThumbPrefix && photo.thumbSrc.endsWith('-sm.webp'));
    assert.ok(!photo.src.includes('http'), 'must never depend on external URLs');
  }
});

test('filterCampusPhotos separates categories cleanly and returns all for "all"', () => {
  assert.equal(filterCampusPhotos('all').length, CAMPUS_GALLERY_PHOTOS.length);
  const dorms = filterCampusPhotos('dorms');
  assert.ok(dorms.length >= 8);
  assert.ok(dorms.every((p) => p.category === 'dorms'));
});

test('getDormPhotos returns dedicated sets for Parvin, Khatam, and Andisheh', () => {
  assert.ok(getDormPhotos('parvin').length >= 4);
  assert.ok(getDormPhotos('khatam').length >= 4);
  assert.ok(getDormPhotos('andisheh').length >= 2);
});

test('resolveDormKeyByName maps official dorm names accurately', () => {
  assert.equal(resolveDormKeyByName('خوابگاه پروین اعتصامی (ویژه خواهران)', 'دختران'), 'parvin');
  assert.equal(resolveDormKeyByName('خوابگاه خاتم‌الانبیاء (ویژه برادران)', 'پسران'), 'khatam');
  assert.equal(resolveDormKeyByName('سرای دانشجویی اندیشه', 'پسران'), 'andisheh');
});

test('getFeaturedCampusPhotos returns balanced highlights for HomePage', () => {
  const featured = getFeaturedCampusPhotos();
  assert.equal(featured.length, 6);
});
