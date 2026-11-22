import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickSearchIndex, searchPortalQuick } from './quickSearch';

test('buildQuickSearchIndex indexes all 20 official majors, 13 steps, and 25 Basij cadres', () => {
  const idx = buildQuickSearchIndex();
  const majors = idx.filter((i) => i.category === 'روز ثبت‌نام رشته');
  const steps = idx.filter((i) => i.category === 'ایستگاه ثبت‌نام');
  const cadres = idx.filter((i) => i.category === 'کانون بسیج');

  assert.equal(majors.length, 20);
  assert.equal(steps.length, 13);
  assert.ok(cadres.length >= 25);
});

test('searchPortalQuick resolves registration day immediately when student searches major with Arabic/Persian variants', () => {
  // استفاده از ي عربی به جای ی فارسی برای تست نرمال‌سازی
  const res = searchPortalQuick('كامپيوتر');
  assert.ok(res.length > 0);
  assert.equal(res[0].category, 'روز ثبت‌نام رشته');
  assert.ok(res[0].title.includes('مهندسی کامپیوتر'));
  assert.ok(res[0].title.includes('دوشنبه'));
});

test('searchPortalQuick finds breakfast coupon, dorms, and Heyat gatherings offline', () => {
  const couponRes = searchPortalQuick('ژتون صبحانه');
  assert.ok(couponRes.some((r) => r.to === '/coupon'));

  const dormRes = searchPortalQuick('پروین اعتصامی');
  assert.ok(dormRes.some((r) => r.to === '/dorms'));

  const heyatRes = searchPortalQuick('فاطمیه');
  assert.ok(heyatRes.some((r) => r.to === '/heyat'));
});

test('searchPortalQuick returns curated default shortcuts when query is empty', () => {
  const defaults = searchPortalQuick('');
  assert.equal(defaults.length, 6);
  assert.equal(defaults[0].to, '/coupon');
});
