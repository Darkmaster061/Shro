import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { OFFICIAL_BASIJ_CADRES } from '../src/data/basijCadresOfficial';
import { db, getSettings, initDatabase } from './db';
import {
  buildOfflinePortalHtml,
  collectOfflineSnapshot,
  extractTodoItems,
  safeJsonForScript,
  type OfflinePortalSnapshot,
} from './offlineExport';

const SAMPLE_SNAPSHOT: OfflinePortalSnapshot = {
  exportedAtIso: '2026-11-18T12:00:00.000Z',
  exportedBy: 'owner',
  settings: {
    siteTitle: 'پرتال هوشمند نوورودی‌ها',
    universityName: 'مجتمع آموزش عالی گناباد',
    heroImageUrl: '',
    accentColor: '#deb154',
    basijLogoUrl: '',
    heyatLogoUrl: '',
    urgentBannerEnabled: true,
    urgentBannerText: 'اطلاعیه نمونه [نیاز به تکمیل]',
    urgentBannerLink: '/registration',
    targetEventTitle: 'شروع ثبت‌نام [نیاز به تکمیل]',
    targetEventDateJalali: '۱۴۰۵/۰۷/۰۱ [نیاز به تکمیل]',
    targetEventDateIso: '2026-09-23T08:00:00.000Z',
    basijTelegramUrl: 'https://t.me/gonabad_basij_placeholder',
    basijEitaaUrl: '',
    basijBaleUrl: '',
    basijRubikaUrl: '',
    heyatTelegramUrl: 'https://t.me/gonabad_heyat_placeholder',
    heyatEitaaUrl: '',
    heyatBaleUrl: '',
    heyatRubikaUrl: '',
    contactPhones: 'دفتر بسیج: [نیاز به تکمیل]',
    responseHours: 'شنبه تا چهارشنبه [نیاز به تکمیل]',
    basijOfficeLocation: 'ساختمان فرهنگی [نیاز به تکمیل]',
    heyatOfficeLocation: 'جنب نمازخانه [نیاز به تکمیل]',
    basijIntroText: 'معرفی بسیج [نیاز به تکمیل]',
    heyatIntroText: 'معرفی هیئت [نیاز به تکمیل]',
    cadresPdfUrl: '',
    cadresPdfTitle: '',
    autoPurgeDays: 0,
  },
  announcements: [
    {
      id: 1,
      title: 'اطلاعیه آزمایشی </script><script>alert(1)</script>',
      summary: 'خلاصه اطلاعیه',
      body: 'متن کامل',
      category: 'ثبت‌نام',
      dateJalali: '۱۴۰۵/۰۷/۰۱',
      eventDateIso: '2026-09-23',
      eventTime: '۰۸:۰۰',
      location: 'سالن اجتماعات',
      pinned: true,
      published: true,
      isDemo: true,
    },
  ],
  faqs: [
    {
      id: 1,
      category: 'ثبت‌نام',
      question: 'مدارک ثبت‌نام چیست؟',
      answer: 'اصل شناسنامه و کارت ملی',
      helpfulYes: 5,
      helpfulNo: 0,
      published: true,
      isDemo: true,
    },
  ],
  dorms: [],
  cadres: OFFICIAL_BASIJ_CADRES.map((c, idx) => ({
    id: idx + 1,
    name: c.name,
    category: c.category,
    shortDesc: c.shortDesc,
    fullDesc: c.fullDesc,
    leadName: '[نیاز به تکمیل]',
    meetingSchedule: '[نیاز به تکمیل]',
    contactInfo: '[نیاز به تکمیل]',
    joinLink: '',
    highlights: c.highlights,
    tags: c.tags,
    imageUrl: '',
    published: true,
    pdfPage: c.pdfPage,
    isDemo: false,
  })),
  heyatPrograms: [],
};

test('safeJsonForScript neutralizes closing script tags and HTML angle brackets', () => {
  const out = safeJsonForScript({ x: '</script><script>alert(1)</script>' });
  assert.equal(out.includes('</script>'), false);
  assert.equal(out.includes('\\u003c/script\\u003e'), true);
});

test('extractTodoItems detects placeholders and missing logos cleanly', () => {
  const todos = extractTodoItems(SAMPLE_SNAPSHOT);
  assert.ok(todos.length >= 6);
  assert.ok(todos.some((t) => t.section === 'کانون‌های بسیج'));
  assert.ok(todos.some((t) => t.section === 'هویت بصری'));
});

test('buildOfflinePortalHtml generates a 100% self-contained RTL HTML with zero external CDNs and no raw script injection', () => {
  const html = buildOfflinePortalHtml(SAMPLE_SNAPSHOT);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('lang="fa" dir="rtl"'));
  assert.ok(html.includes('کانون پیشران علمی'));
  assert.ok(html.includes('کپی برای ارسال در ایتا/تلگرام'));
  // Zero external script/stylesheet CDNs
  assert.equal(/<script[^>]+src=["']https?:/i.test(html), false);
  assert.equal(/<link[^>]+href=["']https?:/i.test(html), false);
  // XSS payload safely escaped inside embedded JSON
  assert.equal(html.includes('</script><script>alert(1)</script>'), false);
  // No sensitive private DB fields leaked
  assert.equal(html.includes('birth_hash'), false);
  assert.equal(html.includes('password_hash'), false);
});

test('collectOfflineSnapshot queries live SQLite schema cleanly and embeds local Vazirmatn font', () => {
  initDatabase();
  const snapshot = collectOfflineSnapshot(
    db,
    getSettings(),
    path.resolve(process.cwd(), 'uploads'),
    'owner'
  );
  assert.equal(snapshot.cadres.length, 25);
  assert.ok(snapshot.faqs.length > 0);
  assert.ok(snapshot.heyatPrograms.length >= 9, 'Expected upcoming + Fall 1405 archive Heyat programs');
  assert.equal(snapshot.settings.heyatTelegramUrl, 'https://t.me/mohebbanolhosein_uog');
  assert.ok((snapshot.fontWoff2Base64 || '').length > 50_000);
  const html = buildOfflinePortalHtml(snapshot);
  assert.ok(html.includes('font/woff2;base64,'));
  assert.ok(html.includes('@mohebbanolhosein_uog'));
  assert.ok(html.includes('عصرهای عاشقی'));
  assert.ok(html.includes('حجت‌الاسلام‌والمسلمین فاطمی'));
  assert.ok(html.includes('8MVF+8RH'), 'Expected Parvin dorm Plus Code');
  assert.ok(html.includes('9M78+XJ3'), 'Expected Khatam dorm Plus Code');
  assert.ok(html.includes('پایگاه بسیج خواهران'), 'Expected purple zone in campus map');
  assert.ok(html.includes('خیابان غفاری'), 'Expected shuttle city station');
  assert.ok(html.includes('اتاق ۲۲۳'), 'Expected free general physician room');
  assert.ok(html.includes('مهشید کوهستانی'), 'Expected dorm counselor name');
  assert.ok(html.includes('یارانه غذای دانشجویی'), 'Expected official food pricing table');
  assert.equal(html.includes('birth_hash'), false);
  assert.equal(html.includes('password_hash'), false);
  // Extract inline app script and assert valid JavaScript syntax
  const scripts = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
  const appScript = scripts.find((m) => !m[0].includes('application/json'))?.[1] || '';
  assert.ok(appScript.length > 1000, 'Expected inline offline app script');
  assert.doesNotThrow(() => new Function(appScript), 'Generated offline HTML inline script must be valid JS');
});
