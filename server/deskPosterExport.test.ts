import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeskPromoPosterHtml, normalizePosterSiteUrl } from './deskPosterExport';

test('normalizePosterSiteUrl sanitizes valid URLs and rejects javascript schemes', () => {
  assert.equal(normalizePosterSiteUrl('https://voroodi.gonabad.ac.ir/'), 'https://voroodi.gonabad.ac.ir');
  assert.equal(normalizePosterSiteUrl('voroodi.gonabad.ac.ir'), 'https://voroodi.gonabad.ac.ir');
  assert.equal(normalizePosterSiteUrl('javascript:alert(1)'), 'https://gonabad.ac.ir');
});

test('buildDeskPromoPosterHtml builds a 100% offline RTL HTML with embedded vector QR SVGs, A4 poster, 4 flyers, and XSS protection', async () => {
  const html = await buildDeskPromoPosterHtml({
    siteUrl: 'https://voroodi.gonabad.ac.ir',
    siteTitle: 'پرتال هوشمند نوورودی‌ها <script>alert(1)</script>',
    universityName: 'مجتمع آموزش عالی گناباد',
    basijLogoUrl: '/assets/basij-logo.png',
    heyatLogoUrl: '/assets/heyat-logo.jpg',
    generatedAtLabel: 'یکشنبه ۱ آذر ۱۴۰۵',
    autoPrint: false,
  });

  // Zero external CDNs
  assert.equal(html.includes('fonts.googleapis'), false);
  assert.equal(html.includes('cdn.jsdelivr'), false);
  assert.equal(html.includes('unpkg.com'), false);

  // Embedded local Vazirmatn font & vector SVG QRs
  assert.ok(html.includes('font/woff2;base64,'));
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('voroodi.gonabad.ac.ir/coupon'));

  // Both A4 poster and 4 cuttable flyers exist
  assert.ok(html.includes('id="sheet-poster"'));
  assert.ok(html.includes('id="sheet-flyers"'));
  assert.ok(html.includes('تراکت ۴ از ۴'));

  // Official Basij admin handles included
  assert.ok(html.includes('@Basij_GONABAD'));
  assert.ok(html.includes('@Basij_khaharan213'));

  // XSS properly escaped
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});
