import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSafeUrl,
  escapeCsvCell,
  detectSafeFileType,
  createSelfHostedCaptcha,
  verifySelfHostedCaptcha,
} from './security';

test('sanitizeSafeUrl allows safe http/https and relative paths, and blocks dangerous schemes', () => {
  assert.equal(sanitizeSafeUrl('https://t.me/BasijUOG'), 'https://t.me/BasijUOG');
  assert.equal(sanitizeSafeUrl('http://localhost:3000/guide'), 'http://localhost:3000/guide');
  assert.equal(sanitizeSafeUrl('/assets/basij-logo-official.png'), '/assets/basij-logo-official.png');

  assert.equal(sanitizeSafeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeSafeUrl('JAVASCRIPT:alert(1)'), '');
  assert.equal(sanitizeSafeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeSafeUrl('vbscript:msgbox(1)'), '');
  assert.equal(sanitizeSafeUrl('//evil.example/phish'), '');
  assert.equal(sanitizeSafeUrl('/guide', false), '');
});

test('escapeCsvCell neutralizes spreadsheet formula injection and escapes double quotes', () => {
  assert.equal(escapeCsvCell('=CMD|\' /C calc\'!A0'), `"'=CMD|' /C calc'!A0"`);
  assert.equal(escapeCsvCell('+SUM(A1:A2)'), `"'` + `+SUM(A1:A2)"`);
  assert.equal(escapeCsvCell('-2+3'), `"'-2+3"`);
  assert.equal(escapeCsvCell('@HYPERLINK("http://x")'), `"'@HYPERLINK(""http://x"")"`);
  assert.equal(escapeCsvCell('علی "احمدی"'), '"علی ""احمدی"""');
  assert.equal(escapeCsvCell('مهندسی کامپیوتر'), '"مهندسی کامپیوتر"');
});

test('detectSafeFileType blocks malicious SVG vectors and allows clean SVG and PNG', () => {
  const cleanSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');
  assert.equal(detectSafeFileType(cleanSvg, 'logo.svg').allowed, true);

  const scriptSvg = Buffer.from('<svg><script>alert(1)</script></svg>');
  assert.equal(detectSafeFileType(scriptSvg, 'bad.svg').allowed, false);

  const foreignObjSvg = Buffer.from('<svg><foreignObject><body><img src=x onerror=alert(1)></body></foreignObject></svg>');
  assert.equal(detectSafeFileType(foreignObjSvg, 'bad2.svg').allowed, false);

  const entitySvg = Buffer.from('<svg><a href="&#x6a;avascript:alert(1)">x</a></svg>');
  assert.equal(detectSafeFileType(entitySvg, 'bad3.svg').allowed, false);

  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectSafeFileType(pngBytes, 'photo.png').allowed, true);

  const fakePng = Buffer.from('<html><script>alert(1)</script></html>');
  assert.equal(detectSafeFileType(fakePng, 'fake.png').allowed, false);
});

test('self-hosted captcha verifies valid answer and rejects wrong or tampered tokens', () => {
  const cap = createSelfHostedCaptcha();
  // Extract numbers from Persian digits question
  const english = cap.question.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const match = english.match(/(\d+)\s*\+\s*(\d+)/);
  assert.ok(match);
  const sum = Number(match[1]) + Number(match[2]);
  assert.equal(verifySelfHostedCaptcha(cap.token, String(sum)), true);
  assert.equal(verifySelfHostedCaptcha(cap.token, String(sum + 1)), false);
  assert.equal(verifySelfHostedCaptcha(cap.token + 'tamper', String(sum)), false);
});
