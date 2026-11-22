import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  FATEMIYEH_CATEGORIES,
  FATEMIYEH_EVENT_META,
  FATEMIYEH_PHOTOS,
  FATEMIYEH_VIDEO_REPORT,
  filterFatemiyehPhotos,
  getFatemiyehGalleryHighlights,
} from './heyatFatemiyeh';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

test('all Fatemiyeh report photos, video, poster, and Heyat logo exist locally on disk', () => {
  assert.equal(FATEMIYEH_PHOTOS.length, 20);
  assert.ok(
    FATEMIYEH_VIDEO_REPORT.src.startsWith('/assets/heyat/') &&
      FATEMIYEH_VIDEO_REPORT.src.endsWith('.mp4')
  );
  assert.ok(
    FATEMIYEH_VIDEO_REPORT.poster.startsWith('/assets/heyat/') &&
      FATEMIYEH_VIDEO_REPORT.poster.endsWith('.webp')
  );
  assert.ok(fs.existsSync(path.join(PUBLIC_DIR, 'assets/heyat-logo-official.png')));
  assert.ok(fs.existsSync(path.join(PUBLIC_DIR, FATEMIYEH_VIDEO_REPORT.src.slice(1))));
  assert.ok(fs.existsSync(path.join(PUBLIC_DIR, FATEMIYEH_VIDEO_REPORT.poster.slice(1))));

  const ids = new Set<string>();
  for (const photo of FATEMIYEH_PHOTOS) {
    assert.ok(!ids.has(photo.id), `duplicate id ${photo.id}`);
    ids.add(photo.id);
    assert.ok(photo.src.startsWith('/assets/heyat/') && photo.src.endsWith('.webp'));
    assert.ok(photo.thumbSrc.startsWith('/assets/heyat/') && photo.thumbSrc.endsWith('-sm.webp'));
    assert.ok(!photo.src.includes('http'), 'must never depend on external URLs');
    assert.ok(
      fs.existsSync(path.join(PUBLIC_DIR, photo.src.slice(1))),
      `missing asset on disk: ${photo.src}`
    );
    assert.ok(
      fs.existsSync(path.join(PUBLIC_DIR, photo.thumbSrc.slice(1))),
      `missing thumb on disk: ${photo.thumbSrc}`
    );
  }
});

test('filterFatemiyehPhotos covers all 4 thematic groups cleanly', () => {
  assert.equal(filterFatemiyehPhotos('all').length, FATEMIYEH_PHOTOS.length);
  for (const cat of FATEMIYEH_CATEGORIES) {
    if (cat.id === 'all') continue;
    const subset = filterFatemiyehPhotos(cat.id);
    assert.ok(subset.length >= 3, `category ${cat.id} should have at least 3 photos`);
    assert.ok(subset.every((p) => p.subCategory === cat.id));
  }
});

test('official Fatemiyeh metadata and gallery highlights are complete', () => {
  assert.ok(FATEMIYEH_EVENT_META.motto.includes('لطف و نگاه فاطمه'));
  assert.ok(FATEMIYEH_EVENT_META.speaker.includes('فاطمی'));
  assert.ok(FATEMIYEH_EVENT_META.maddahan.includes('مهدی میری'));
  assert.ok(FATEMIYEH_EVENT_META.shuttle.includes('پروین اعتصامی'));
  assert.ok(FATEMIYEH_EVENT_META.martyrGuest.includes('فکه'));
  assert.equal(getFatemiyehGalleryHighlights().length, 4);
});
