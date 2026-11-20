import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import type { SiteSettings } from '../src/types/portal';
import {
  OFFICIAL_BASIJ_CADRES,
  OFFICIAL_BASIJ_PDF_TITLE,
  OFFICIAL_BASIJ_PDF_URL,
} from '../src/data/basijCadresOfficial';
import { normalizeNameCompact } from '../src/utils/persian';
import { computeBirthHash, generateCouponCode } from './security';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/portal.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'پرتال هوشمند نوورودی‌ها',
  universityName: 'مجتمع آموزش عالی گناباد',
  basijLogoUrl: '/assets/basij-logo-official.png',
  heyatLogoUrl: '',
  heroImageUrl: '',
  accentColor: '#deb154',
  targetEventTitle: 'آغاز ثبت‌نام حضوری نوورودی‌های ۱۴۰۵ (یکشنبه ۱ تا سه‌شنبه ۳ آذر)',
  targetEventDateIso: '2026-11-22T08:00:00+03:30',
  targetEventDateJalali: '۱۴۰۵/۰۹/۰۱ تا ۱۴۰۵/۰۹/۰۳ (ساعت ۰۸:۰۰ تا ۱۴:۰۰)',
  urgentBannerEnabled: true,
  urgentBannerText:
    'اطلاعیه رسمی ثبت‌نام حضوری ۱۴۰۵ منتشر شد: یکشنبه ۱ تا سه‌شنبه ۳ آذرماه (ساعت ۸ تا ۱۴) بر اساس رشته — روز مراجعه رشته‌ات را ببین!',
  urgentBannerLink: '/guide',
  basijTelegramUrl: 'https://t.me/BasijUOG',
  basijEitaaUrl: 'https://eitaa.com/basijuog',
  basijBaleUrl: '',
  basijRubikaUrl: '',
  heyatTelegramUrl: 'https://t.me/mohebbanolhosein_uog',
  heyatEitaaUrl: '',
  heyatBaleUrl: '',
  heyatRubikaUrl: '',
  contactPhones:
    'تلفن دانشگاه: ۰۵۱۵۷۲۰۲۱۲۲ | تماس ضروری پذیرفته‌شدگان: ۰۹۰۲۴۹۷۴۳۱۱ و ۰۹۱۵۸۹۴۴۲۰۸ | خوابگاه خواهران: ۰۵۱۵۷۲۰۲۱۴۴ | خوابگاه برادران: ۰۵۱۵۷۲۰۲۱۴۵ | تغذیه: ۰۵۱۵۷۲۰۲۱۴۳',
  responseHours: 'روزهای ثبت‌نام حضوری (۱ تا ۳ آذر ۱۴۰۵): ساعت ۰۸:۰۰ تا ۱۴:۰۰',
  basijOfficeLocation: 'مجتمع آموزش عالی گناباد (انتهای بلوار شهدای گمنام)، پایگاه بسیج دانشجویی (حوزه شهید شوریده)',
  heyatOfficeLocation: 'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد — هیئت دانشجویی محبان‌الحسین (ع)',
  basijIntroText:
    'بسیج دانشجویی دانشگاه گناباد (حوزه شهید شوریده) با هدف همراهی علمی، فرهنگی، مهارتی و جهادی با دانشجویان، از نخستین روز ورود شما در کنارتان است.',
  heyatIntroText:
    'هیئت دانشجویی محبان‌الحسین (ع) دانشگاه گناباد، محفل صمیمی همدلی، معنویت و برنامه‌های هفتگی دانشجویان در مسجد حضرت فاطمه زهرا (س) و جوار مزار شهدای گمنام است. هر هفته یکشنبه‌ها (عصرهای عاشقی) و سه‌شنبه‌ها (مجالس روضه هفتگی) و در ایام ثبت‌نام با ایستگاه صبحانه میزبان شما نوورودی‌های عزیز هستیم.',
  cadresPdfUrl: OFFICIAL_BASIJ_PDF_URL,
  cadresPdfTitle: OFFICIAL_BASIJ_PDF_TITLE,
  autoPurgeDays: Number(process.env.AUTO_PURGE_DAYS || 0),
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','editor','food_manager','scanner')),
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      first_name_norm TEXT NOT NULL,
      last_name_norm TEXT NOT NULL,
      birth_hash TEXT UNIQUE NOT NULL,
      coupon_code TEXT UNIQUE NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_students_name_norm ON students(first_name_norm, last_name_norm);
    CREATE INDEX IF NOT EXISTS idx_students_coupon ON students(coupon_code);

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date_jalali TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      meal_id INTEGER NOT NULL,
      claimed_at TEXT NOT NULL,
      staff_user_id INTEGER,
      UNIQUE(student_id, meal_id),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suspicious_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      meal_id INTEGER,
      attempt_type TEXT NOT NULL,
      detail TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      helpful_yes INTEGER NOT NULL DEFAULT 0,
      helpful_no INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      date_jalali TEXT NOT NULL,
      event_date_iso TEXT,
      event_time TEXT,
      location TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dorms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      address TEXT NOT NULL,
      distance_to_campus TEXT NOT NULL,
      neshan_url TEXT NOT NULL,
      balad_url TEXT NOT NULL,
      monthly_fee TEXT NOT NULL,
      capacity TEXT NOT NULL,
      room_type TEXT NOT NULL,
      curfew_hours TEXT NOT NULL,
      supervisor_phone TEXT NOT NULL,
      facilities_json TEXT NOT NULL,
      rules_json TEXT NOT NULL,
      required_docs_json TEXT NOT NULL,
      gallery_json TEXT NOT NULL,
      faq_json TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cadres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      short_desc TEXT NOT NULL,
      full_desc TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      meeting_schedule TEXT NOT NULL,
      join_link TEXT NOT NULL,
      contact_info TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      pdf_page INTEGER NOT NULL DEFAULT 1,
      published INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS heyat_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date_jalali TEXT NOT NULL,
      date_iso TEXT NOT NULL,
      time_range TEXT NOT NULL,
      location TEXT NOT NULL,
      speaker TEXT NOT NULL,
      maddah TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT NOT NULL,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_score INTEGER NOT NULL,
      breakfast_score INTEGER NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT NOT NULL,
      contact_info TEXT NOT NULL,
      topic TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // مهاجرت امن ستون pdf_page برای دیتابیس‌های قبلی
  const cadreCols = db.prepare('PRAGMA table_info(cadres)').all() as { name: string }[];
  if (!cadreCols.some((c) => c.name === 'pdf_page')) {
    db.exec('ALTER TABLE cadres ADD COLUMN pdf_page INTEGER NOT NULL DEFAULT 1');
  }

  seedInitialData();
}

function seedInitialData() {
  // تنظیمات پیش‌فرض
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(k, JSON.stringify(v));
  }

  // ارتقای خودکار دیتابیس قبلی از PDF نمونه به دفترچه رسمی ۹۳ صفحه‌ای قرار قیام ۹
  const curPdfRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('cadresPdfUrl') as
    | { value: string }
    | undefined;
  if (!curPdfRow || curPdfRow.value === JSON.stringify('/sample-cadres.pdf')) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'cadresPdfUrl',
      JSON.stringify(OFFICIAL_BASIJ_PDF_URL)
    );
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'cadresPdfTitle',
      JSON.stringify(OFFICIAL_BASIJ_PDF_TITLE)
    );
  }

  // کاربران ادمین اولیه (فقط اگر جدولی خالی باشد)
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number }).c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO admin_users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    const ownerPass = process.env.ADMIN_PASSWORD || 'Gonabad@Owner2026';
    insertUser.run('owner', 'مدیر کل سامانه', bcrypt.hashSync(ownerPass, 10), 'owner');
    insertUser.run('editor', 'ویراستار محتوا', bcrypt.hashSync('Gonabad@Editor2026', 10), 'editor');
    insertUser.run('food', 'مسئول تغذیه و ژتون', bcrypt.hashSync('Gonabad@Food2026', 10), 'food_manager');
    insertUser.run('scanner', 'مسئول پخش صبحانه', bcrypt.hashSync('Gonabad@Scan2026', 10), 'scanner');
  }

  // وعده‌های صبحانه نمونه
  const mealCount = (db.prepare('SELECT COUNT(*) as c FROM meals').get() as { c: number }).c;
  if (mealCount === 0) {
    const insMeal = db.prepare(
      'INSERT INTO meals (name, date_jalali, start_time, end_time, active) VALUES (?, ?, ?, ?, ?)'
    );
    insMeal.run('صبحانه روز اول ثبت‌نام (نمونه)', '۱۴۰۵/۰۷/۰۱', '۰۷:۰۰', '۰۹:۳۰', 1);
    insMeal.run('صبحانه روز دوم ثبت‌نام (نمونه)', '۱۴۰۵/۰۷/۰۲', '۰۷:۰۰', '۰۹:۳۰', 1);
    insMeal.run('صبحانه روز سوم ثبت‌نام (نمونه)', '۱۴۰۵/۰۷/۰۳', '۰۷:۰۰', '۰۹:۳۰', 0);
  }

  // دانشجویان نمونه برای آزمایش سامانه ژتون و اسکنر (قابل حذف یکجا از ادمین)
  const stuCount = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
  if (stuCount === 0) {
    const demoStudents = [
      { first: 'علی', last: 'محمدی', birth: '1387/05/20', note: 'نمونه - مهندسی کامپیوتر' },
      { first: 'فاطمه', last: 'رضایی', birth: '1386/11/04', note: 'نمونه - مهندسی برق' },
      { first: 'محمدمهدی', last: 'حسینی', birth: '1387/02/12', note: 'نمونه - مهندسی مکانیک' },
      { first: 'زهرا', last: 'کریمی', birth: '1387/08/18', note: 'نمونه - علوم کامپیوتر' },
    ];
    const insStu = db.prepare(`
      INSERT INTO students (first_name, last_name, first_name_norm, last_name_norm, birth_hash, coupon_code, note, active, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `);
    for (const s of demoStudents) {
      const hash = computeBirthHash(s.first, s.last, s.birth);
      if (hash) {
        insStu.run(
          s.first,
          s.last,
          normalizeNameCompact(s.first),
          normalizeNameCompact(s.last),
          hash,
          generateCouponCode(),
          s.note
        );
      }
    }
  }

  // سوالات متداول نمونه
  const faqCount = (db.prepare('SELECT COUNT(*) as c FROM faqs').get() as { c: number }).c;
  if (faqCount === 0) {
    const insFaq = db.prepare(
      'INSERT INTO faqs (category, question, answer, helpful_yes, helpful_no, published, is_demo) VALUES (?, ?, ?, ?, ?, 1, 1)'
    );
    const demoFaqs = [
      [
        'ثبت‌نام',
        'برای ثبت‌نام حضوری در دانشگاه چه مدارکی لازم است؟ (نمونه)',
        'اصل و کپی شناسنامه و کارت ملی، اصل مدرک دیپلم یا گواهی موقت، ۶ قطعه عکس ۳×۴ پشت‌نویسی‌شده، تاییدیه تحصیلی و برگه ثبت‌نام اینترنتی. [لیست دقیق سال جاری: نیاز به تکمیل توسط آموزش]',
        24,
        1,
      ],
      [
        'خوابگاه',
        'نحوه ثبت‌نام و تحویل اتاق خوابگاه برای نوورودی‌ها چگونه است؟ (نمونه)',
        'پس از تکمیل ثبت‌نام آموزشی و دریافت شماره دانشجویی، به اداره امور خوابگاه‌ها مراجعه می‌کنید و فرم تعهدنامه را تکمیل می‌نمایید. وسایل ضروری مانند ملحفه و قفل کمد همراه داشته باشید. [شرایط دقیق: نیاز به تکمیل]',
        31,
        2,
      ],
      [
        'تغذیه و صبحانه',
        'چطور ژتون صبحانه رایگان ایام ثبت‌نام را دریافت کنم؟',
        'وارد بخش «هیئت و ژتون صبحانه» شوید، نام، نام‌خانوادگی و تاریخ تولد شمسی خود را وارد کنید تا کارت QR اختصاصی شما نمایش داده شود. تصویر کارت را در گوشی ذخیره کنید و هنگام دریافت صبحانه به مسئول پخش نشان دهید.',
        45,
        0,
      ],
      [
        'آموزش',
        'انتخاب واحد ترم اول به عهده دانشجو است یا آموزش دانشگاه؟ (نمونه)',
        'معمولاً انتخاب واحد ترم اول نوورودی‌ها به صورت گروهی توسط اداره آموزش انجام می‌شود، اما لازم است پس از دریافت نام کاربری سامانه آموزشی، برنامه هفتگی خود را بررسی کنید. [تاییدیه آموزش: نیاز به تکمیل]',
        19,
        1,
      ],
      [
        'بسیج و کانون‌ها',
        'آیا عضویت در کانون‌های علمی و فرهنگی بسیج هزینه‌ای دارد؟',
        'خیر، عضویت در کانون‌ها و شرکت در اغلب کارگاه‌ها و نشست‌های تخصصی رایگان است و ویژه همراهی علمی، مهارتی و فرهنگی دانشجویان برگزار می‌شود.',
        27,
        0,
      ],
      [
        'حمل‌ونقل و شهر',
        'فاصله ترمینال گناباد تا مجتمع آموزش عالی و خوابگاه‌ها چقدر است؟ (نمونه)',
        'برای مسیریابی دقیق می‌توانید از دکمه‌های «مسیریابی با نشان» و «بلد» در صفحه خوابگاه‌ها و تماس با ما استفاده کنید. [زمان تقریبی و خطوط سرویس: نیاز به تکمیل]',
        15,
        1,
      ],
    ];
    for (const f of demoFaqs) insFaq.run(...f);
  }

  // اطلاعیه‌ها نمونه
  const annCount = (db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number }).c;
  if (annCount === 0) {
    const insAnn = db.prepare(`
      INSERT INTO announcements (title, summary, body, category, date_jalali, event_date_iso, event_time, location, pinned, published, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `);
    const base = Date.now() + 18 * 24 * 60 * 60 * 1000;
    insAnn.run(
      'آغاز ثبت‌نام حضوری نوورودی‌ها و استقرار میز راهنمای دانشجویی (نمونه)',
      'میزهای راهنمای بسیج دانشجویی و هیئت از ساعت ۷:۳۰ صبح در محوطه اصلی دانشگاه پاسخگوی شما هستند.',
      'دانشجویان گرامی می‌توانند برای راهنمایی مراحل ثبت‌نام، کپی مدارک، آشنایی با خوابگاه‌ها و دریافت صبحانه به غرفه استقبال نوورودی‌ها مراجعه کنند. [تاریخ و ساعت دقیق: نیاز به تکمیل]',
      'ثبت‌نام',
      '۱۴۰۵/۰۷/۰۱',
      new Date(base).toISOString(),
      '۰۷:۳۰ تا ۱۴:۰۰',
      'محوطه اصلی دانشگاه [نیاز به تکمیل]',
      1
    );
    insAnn.run(
      'پذیرایی صبحانه ویژه نوورودی‌ها و خانواده‌ها توسط هیئت دانشجویی (نمونه)',
      'در هر سه روز ثبت‌نام با ارائه کارت QR دیجیتال در بخش ژتون صبحانه میزبان شما هستیم.',
      'لطفاً پیش از مراجعه به ایستگاه صبحانه، کارت QR خود را از بخش «ژتون صبحانه» دریافت و روی گوشی ذخیره نمایید. برای عزیزانی که گوشی هوشمند همراه ندارند کارت چاپی در محل ارائه می‌شود.',
      'هیئت',
      '۱۴۰۵/۰۷/۰۱',
      new Date(base + 3600 * 1000).toISOString(),
      '۰۷:۰۰ تا ۰۹:۳۰',
      'جنب نمازخانه دانشگاه [نیاز به تکمیل]',
      1
    );
    insAnn.run(
      'جشن معارفه و آشنایی با کانون‌های علمی و فرهنگی (نمونه)',
      'معرفی انجمن‌ها و کانون‌های فعال، گپ‌وگفت با دانشجویان سال‌بالایی و اهدای بسته خوش‌آمد.',
      'در این نشست صمیمی با مسیر تحصیل، مهارت‌آموزی کنار درس و کانون‌های علمی، رسانه‌ای و جهادی دانشگاه آشنا می‌شوید. [جزئیات نهایی: نیاز به تکمیل]',
      'بسیج',
      '۱۴۰۵/۰۷/۰۵',
      new Date(base + 4 * 86400 * 1000).toISOString(),
      '۱۶:۰۰ تا ۱۸:۳۰',
      'سالن آمفی‌تئاتر دانشگاه [نیاز به تکمیل]',
      0
    );
  }

  // خوابگاه‌ها نمونه
  const dormCount = (db.prepare('SELECT COUNT(*) as c FROM dorms').get() as { c: number }).c;
  if (dormCount === 0) {
    const insDorm = db.prepare(`
      INSERT INTO dorms (name, gender, address, distance_to_campus, neshan_url, balad_url, monthly_fee, capacity, room_type, curfew_hours, supervisor_phone, facilities_json, rules_json, required_docs_json, gallery_json, faq_json, published, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `);
    insDorm.run(
      'خوابگاه پسران شماره ۱ (نمونه)',
      'پسران',
      'گناباد، محدوده دانشگاه [آدرس دقیق: نیاز به تکمیل]',
      '[فاصله دقیق: نیاز به تکمیل]',
      'https://neshan.org/maps',
      'https://balad.ir',
      '[تعرفه مصوب صندوق رفاه: نیاز به تکمیل]',
      '[ظرفیت کل: نیاز به تکمیل]',
      'اتاق‌های ۴ و ۶ نفره [نیاز به تکمیل]',
      'ورود تا ساعت ۲۲:۰۰ [ساعت دقیق: نیاز به تکمیل]',
      '[شماره سرپرست: نیاز به تکمیل]',
      JSON.stringify(['سالن مطالعه', 'اینترنت وای‌فای [نیاز به تکمیل]', 'آشپزخانه اشتراکی', 'نمازخانه', 'لباسشویی [نیاز به تکمیل]']),
      JSON.stringify(['رعایت سکوت پس از ساعت ۲۳:۰۰', 'ممنوعیت استفاده از وسایل گرمایشی غیراستاندارد', 'ثبت تردد با کارت خوابگاه [قوانین کامل: نیاز به تکمیل]']),
      JSON.stringify(['برگه تاییدیه ثبت‌نام آموزشی', '۲ قطعه عکس ۳×۴', 'کپی کارت ملی', 'تکمیل فرم تعهدنامه خوابگاه']),
      JSON.stringify([]),
      JSON.stringify([
        { q: 'آیا یخچال داخل اتاق وجود دارد؟', a: '[اطلاعات دقیق امکانات اتاق: نیاز به تکمیل]' },
        { q: 'سرویس رفت‌وآمد به دانشگاه چگونه است؟', a: '[برنامه سرویس: نیاز به تکمیل]' },
      ])
    );
    insDorm.run(
      'خوابگاه دختران شماره ۱ (نمونه)',
      'دختران',
      'گناباد، بلوار دانشگاه [آدرس دقیق: نیاز به تکمیل]',
      '[فاصله دقیق: نیاز به تکمیل]',
      'https://neshan.org/maps',
      'https://balad.ir',
      '[تعرفه مصوب صندوق رفاه: نیاز به تکمیل]',
      '[ظرفیت کل: نیاز به تکمیل]',
      'اتاق‌های ۴ نفره [نیاز به تکمیل]',
      'طبق آیین‌نامه امور خوابگاه‌ها [ساعت دقیق: نیاز به تکمیل]',
      '[شماره سرپرست: نیاز به تکمیل]',
      JSON.stringify(['سالن مطالعه مجهز', 'سرویس رفت‌وآمد [نیاز به تکمیل]', 'آشپزخانه هر طبقه', 'اتاق تندرستی [نیاز به تکمیل]', 'بوفه']),
      JSON.stringify(['ثبت مرخصی پایان هفته از طریق سامانه', 'رعایت مقررات ایمنی و بهداشت عمومی [قوانین کامل: نیاز به تکمیل]']),
      JSON.stringify(['گواهی ثبت‌نام آموزشی', 'کپی شناسنامه و کارت ملی', 'رضایت‌نامه ولی (مطابق ضوابط)', '۲ قطعه عکس']),
      JSON.stringify([]),
      JSON.stringify([
        { q: 'آیا امکان انتخاب هم‌اتاقی وجود دارد؟', a: 'در روزهای ابتدایی می‌توانید درخواست خود را با سرپرست خوابگاه مطرح کنید [نیاز به تکمیل].' },
      ])
    );
    insDorm.run(
      'خوابگاه خودگردان / متأهلین (نمونه)',
      'متأهلین',
      'گناباد [در صورت وجود و فعال بودن: نیاز به تکمیل]',
      '[فاصله دقیق: نیاز به تکمیل]',
      'https://neshan.org/maps',
      'https://balad.ir',
      '[تعرفه سال جاری: نیاز به تکمیل]',
      '[ظرفیت: نیاز به تکمیل]',
      'سوئیت مستقل [نیاز به تکمیل]',
      'تردد آزاد با کارت اختصاصی [نیاز به تکمیل]',
      '[شماره مسئول: نیاز به تکمیل]',
      JSON.stringify(['سوئیت مستقل', 'آشپزخانه اختصاصی', 'دسترسی به وسایل نقلیه [نیاز به تکمیل]']),
      JSON.stringify(['ارائه سند ازدواج و اشتغال به تحصیل هر دو نفر یا مطابق آیین‌نامه [نیاز به تکمیل]']),
      JSON.stringify(['کپی عقدنامه', 'کارت ملی زوجین', 'معرفی‌نامه امور دانشجویی']),
      JSON.stringify([]),
      JSON.stringify([])
    );
  }

  // کانون‌های رسمی بسیج دانشجویی بر اساس دفترچه «قرار قیام ۹» (۲۵ کانون در ۶ محور)
  const realCadreCount = (
    db.prepare('SELECT COUNT(*) as c FROM cadres WHERE is_demo = 0').get() as { c: number }
  ).c;
  if (realCadreCount === 0) {
    // حذف ۴ کانون نمونه اولیه در صورت وجود و جایگزینی با ۲۵ کانون رسمی دفترچه
    db.prepare('DELETE FROM cadres WHERE is_demo = 1').run();
    const insCadre = db.prepare(`
      INSERT INTO cadres (name, category, short_desc, full_desc, lead_name, meeting_schedule, join_link, contact_info, highlights_json, tags_json, image_url, pdf_page, published, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 1, 0)
    `);
    const insertAll = db.transaction(() => {
      for (const c of OFFICIAL_BASIJ_CADRES) {
        insCadre.run(
          c.name,
          c.category,
          c.shortDesc,
          c.fullDesc,
          '[نام دبیر کانون: نیاز به تکمیل]',
          '[زمان جلسات هفتگی: نیاز به تکمیل]',
          'https://eitaa.com/gonabad_basij_placeholder',
          '[آیدی یا شماره دبیر کانون: نیاز به تکمیل]',
          JSON.stringify(c.highlights),
          JSON.stringify(c.tags),
          c.pdfPage
        );
      }
    });
    insertAll();
  }

  // برنامه‌های هیئت نمونه
  const hpCount = (db.prepare('SELECT COUNT(*) as c FROM heyat_programs').get() as { c: number }).c;
  if (hpCount === 0) {
    const insHp = db.prepare(`
      INSERT INTO heyat_programs (title, date_jalali, date_iso, time_range, location, speaker, maddah, category, description, published, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `);
    const base = Date.now() + 18 * 24 * 60 * 60 * 1000;
    insHp.run(
      'ایستگاه صبحانه استقبال نوورودی‌ها (نمونه)',
      '۱۴۰۵/۰۷/۰۱',
      new Date(base).toISOString(),
      '۰۷:۰۰ تا ۰۹:۳۰',
      'صحن نمازخانه دانشگاه [نیاز به تکمیل]',
      '—',
      '—',
      'صبحانه',
      'پذیرایی گرم صبحانه برای نوورودی‌ها در روزهای ثبت‌نام با ارائه کارت QR دیجیتال ژتون.'
    );
    insHp.run(
      'مراسم هفتگی هیئت دانشجویی (نمونه)',
      '۱۴۰۵/۰۷/۰۸',
      new Date(base + 7 * 86400 * 1000).toISOString(),
      'پس از نماز مغرب و عشا [نیاز به تکمیل]',
      'نمازخانه مرکزی دانشگاه [نیاز به تکمیل]',
      '[نام سخنران: نیاز به تکمیل]',
      '[نام مداح: نیاز به تکمیل]',
      'هفتگی',
      'قرائت زیارت عاشورا، سخنرانی کوتاه دانشجویی و عزاداری هفتگی به همراه پذیرایی چای روضه.'
    );
    insHp.run(
      'محفل انس با قرآن و گفت‌وگوی معرفتی (نمونه)',
      '۱۴۰۵/۰۷/۱۴',
      new Date(base + 13 * 86400 * 1000).toISOString(),
      '۱۹:۳۰ تا ۲۱:۰۰ [نیاز به تکمیل]',
      'سالن اجتماعات خوابگاه [نیاز به تکمیل]',
      '[نام استاد: نیاز به تکمیل]',
      '—',
      'فرهنگی',
      'نشست صمیمی شبانه ویژه دانشجویان خوابگاهی و نوورودی‌ها.'
    );
  }

  // ارتقای یک‌باره و امن داده‌های نمونه اولیه به اطلاعات رسمی اطلاعیه ۱۴۰۵/۰۸/۲۸ دانشگاه
  const migRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('__migration_official_1405_azar') as { value: string } | undefined;

  if (!migRow) {
    const migrateOfficial1405 = db.transaction(() => {
      // ۱) به‌روزرسانی تنظیمات پیش‌فرض تاریخ و تماس
      const upsertSetting = db.prepare(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
      );
      const keysToRefresh: (keyof SiteSettings)[] = [
        'targetEventTitle',
        'targetEventDateIso',
        'targetEventDateJalali',
        'urgentBannerEnabled',
        'urgentBannerText',
        'urgentBannerLink',
        'contactPhones',
        'responseHours',
        'basijOfficeLocation',
        'heyatOfficeLocation',
      ];
      for (const k of keysToRefresh) {
        upsertSetting.run(k, JSON.stringify(DEFAULT_SETTINGS[k]));
      }

      // ۲) به‌روزرسانی تاریخ وعده‌های صبحانه نمونه به ۱ تا ۳ آذر ۱۴۰۵
      db.prepare("UPDATE meals SET date_jalali = '۱۴۰۵/۰۹/۰۱', name = 'صبحانه روز اول ثبت‌نام (یکشنبه ۱ آذر)' WHERE date_jalali = '۱۴۰۵/۰۷/۰۱'").run();
      db.prepare("UPDATE meals SET date_jalali = '۱۴۰۵/۰۹/۰۲', name = 'صبحانه روز دوم ثبت‌نام (دوشنبه ۲ آذر)' WHERE date_jalali = '۱۴۰۵/۰۷/۰۲'").run();
      db.prepare("UPDATE meals SET date_jalali = '۱۴۰۵/۰۹/۰۳', name = 'صبحانه روز سوم ثبت‌نام (سه‌شنبه ۳ آذر)' WHERE date_jalali = '۱۴۰۵/۰۷/۰۳'").run();

      // ۳) جایگزینی خوابگاه‌های نمونه با خوابگاه‌های رسمی پروین اعتصامی و خاتم‌الانبیاء
      db.prepare('DELETE FROM dorms WHERE is_demo = 1').run();
      const insDorm = db.prepare(`
        INSERT INTO dorms (name, gender, address, distance_to_campus, neshan_url, balad_url, monthly_fee, capacity, room_type, curfew_hours, supervisor_phone, facilities_json, rules_json, required_docs_json, gallery_json, faq_json, published, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `);
      insDorm.run(
        'خوابگاه پروین اعتصامی (ویژه خواهران)',
        'دختران',
        'گناباد، مجموعه خوابگاه‌های مجتمع آموزش عالی گناباد [آدرس دقیق بلوک: نیاز به تکمیل]',
        '[فاصله دقیق تا دانشگاه: نیاز به تکمیل]',
        'https://neshan.org/maps',
        'https://balad.ir',
        '۲,۲۵۰,۰۰۰ تا ۴,۲۵۰,۰۰۰ تومان در هر ترم',
        '[ظرفیت دقیق بلوک ۱ و ۲: نیاز به تکمیل]',
        '۲ نفره (بلوک ۱ و ۲)، ۴ نفره، ۸ نفره',
        'طبق آیین‌نامه امور خوابگاه‌ها [ساعت دقیق: نیاز به تکمیل]',
        'امور خوابگاه خواهران (خانم ولیان): ۰۵۱۵۷۲۰۲۱۴۴',
        JSON.stringify([
          'بلوک ۱ (۲ نفره): ۳,۶۲۵,۰۰۰ تومان در ترم',
          'بلوک ۲ (۲ نفره): ۴,۲۵۰,۰۰۰ تومان در ترم',
          'اتاق ۴ نفره: ۳,۰۰۰,۰۰۰ تومان در ترم',
          'اتاق ۸ نفره: ۲,۲۵۰,۰۰۰ تومان در ترم',
          'سایر امکانات و سالن مطالعه [نیاز به تکمیل]',
        ]),
        JSON.stringify([
          'نیاز به پیش‌ثبت‌نام و مراجعه حضوری قبلی نیست.',
          'بلافاصله پس از تکمیل ثبت‌نام حضوری و دریافت کارت دانشجویی، امکان ثبت‌نام و حضور در خوابگاه فراهم است.',
          'سایر ضوابط تردد و مرخصی [نیاز به تکمیل]',
        ]),
        JSON.stringify([
          'کارت دانشجویی صادره پس از ثبت‌نام حضوری',
          'رسید پرداخت الکترونیکی خدمات دانشجویی و خوابگاه',
          'وسایل شخصی (ملحفه، قفل کمد و ظروف)',
        ]),
        JSON.stringify([]),
        JSON.stringify([
          {
            q: 'آیا پیش از روز ثبت‌نام نیاز به پیش‌ثبت‌نام خوابگاه هست؟',
            a: 'خیر؛ طبق اطلاعیه رسمی ۱۴۰۵/۰۸/۲۸، بلافاصله پس از تکمیل ثبت‌نام حضوری و دریافت کارت دانشجویی، امکان ثبت‌نام و حضور در خوابگاه فراهم خواهد بود.',
          },
          {
            q: 'شماره تماس مستقیم امور خوابگاه خواهران چیست؟',
            a: 'خانم ولیان (امور خوابگاه خواهران) با شماره داخلی ۰۵۱۵۷۲۰۲۱۴۴ در ساعات اداری پاسخگو هستند.',
          },
        ])
      );
      insDorm.run(
        'خوابگاه خاتم‌الانبیاء (ویژه برادران)',
        'پسران',
        'گناباد، مجموعه خوابگاه‌های مجتمع آموزش عالی گناباد [آدرس دقیق: نیاز به تکمیل]',
        '[فاصله دقیق تا دانشگاه: نیاز به تکمیل]',
        'https://neshan.org/maps',
        'https://balad.ir',
        '۲,۹۷۰,۰۰۰ تا ۷,۲۵۰,۰۰۰ تومان در هر ترم (غیرسنواتی ۱۴۰۲ و بعد)',
        '[ظرفیت دقیق: نیاز به تکمیل]',
        'اتاق‌های ۲ نفره، ۴ نفره و ۶ نفره',
        'طبق آیین‌نامه امور خوابگاه‌ها [ساعت دقیق: نیاز به تکمیل]',
        'امور خوابگاه برادران (آقای داورپناه): ۰۵۱۵۷۲۰۲۱۴۵',
        JSON.stringify([
          'اتاق ۲ نفره: ۷,۲۵۰,۰۰۰ تومان در ترم',
          'اتاق ۴ نفره: ۴,۲۵۰,۰۰۰ تومان در ترم',
          'اتاق ۶ نفره: ۲,۹۷۰,۰۰۰ تومان در ترم',
          'سایر امکانات، آشپزخانه و سالن مطالعه [نیاز به تکمیل]',
        ]),
        JSON.stringify([
          'نیاز به پیش‌ثبت‌نام و مراجعه حضوری قبلی نیست.',
          'بلافاصله پس از تکمیل ثبت‌نام حضوری و دریافت کارت دانشجویی، پذیرش و حضور در خوابگاه انجام می‌شود.',
          'نرخ‌های درج‌شده مربوط به دانشجویان غیرسنواتی (ورودی ۱۴۰۲ و بعد) است.',
        ]),
        JSON.stringify([
          'کارت دانشجویی صادره پس از ثبت‌نام حضوری',
          'رسید پرداخت الکترونیکی خدمات دانشجویی و خوابگاه',
          'وسایل شخصی ضروری (ملحفه، قفل کمد و وسایل بهداشتی)',
        ]),
        JSON.stringify([]),
        JSON.stringify([
          {
            q: 'زمان تحویل اتاق در خوابگاه خاتم‌الانبیاء چه موقع است؟',
            a: 'بلافاصله بعد از اتمام فرایند ثبت‌نام حضوری (۱ تا ۳ آذر) و دریافت کارت دانشجویی می‌توانید برای ثبت‌نام و استقرار در خوابگاه اقدام کنید.',
          },
          {
            q: 'برای پیگیری امور خوابگاه برادران با چه داخلی تماس بگیرم؟',
            a: 'آقای داورپناه (امور خوابگاه برادران) با شماره داخلی ۰۵۱۵۷۲۰۲۱۴۵ پاسخگو هستند.',
          },
        ])
      );

      // ۴) جایگزینی اطلاعیه‌های نمونه با اطلاعیه‌های رسمی ۱۴۰۵/۰۸/۲۸
      db.prepare('DELETE FROM announcements WHERE is_demo = 1').run();
      const insAnn = db.prepare(`
        INSERT INTO announcements (title, summary, body, category, date_jalali, event_date_iso, event_time, location, pinned, published, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `);
      insAnn.run(
        'اطلاعیه رسمی ثبت‌نام حضوری نوورودی‌های ۱۴۰۵–۱۴۰۶ (۱ تا ۳ آذرماه)',
        'پذیرفته‌شدگان پس از اتمام ثبت‌نام اینترنتی از یکشنبه ۱ آذر تا سه‌شنبه ۳ آذر (ساعت ۸ الی ۱۴) بر اساس رشته با اصل مدارک به مجتمع آموزش عالی گناباد مراجعه نمایند.',
        'برنامه مراجعه حضوری: یکشنبه ۱ آذر (مکانیک، صنایع، مواد، شیمی، عمران، معدن) | دوشنبه ۲ آذر (برق، کامپیوتر، حقوق، باغبانی، طبیعت، زمین‌شناسی) | سه‌شنبه ۳ آذر (شیمی کاربردی، باستان‌شناسی، رشته‌های زبان انگلیسی و زبان‌شناسی، مدیریت صنعتی و بازرگانی). آدرس: گناباد، بلوار قصبه، انتهای بلوار شهدای گمنام. تماس ضروری: ۰۹۰۲۴۹۷۴۳۱۱ و ۰۹۱۵۸۹۴۴۲۰۸.',
        'ثبت‌نام',
        '۱۴۰۵/۰۸/۲۸',
        '2026-11-22T08:00:00+03:30',
        '۰۸:۰۰ تا ۱۴:۰۰',
        'مجتمع آموزش عالی گناباد (انتهای بلوار شهدای گمنام)',
        1
      );
      insAnn.run(
        'نحوه پذیرش خوابگاه‌های پروین اعتصامی و خاتم‌الانبیاء (بدون نیاز به پیش‌ثبت‌نام)',
        'بلافاصله پس از تکمیل ثبت‌نام حضوری و دریافت کارت دانشجویی امکان ثبت‌نام و حضور در خوابگاه فراهم است؛ نیازی به مراجعه قبلی نیست.',
        'هزینه هر ترم خوابگاه پروین اعتصامی (خواهران): ۲ نفره بلوک ۱ (۳,۶۲۵,۰۰۰ تومان)، بلوک ۲ (۴,۲۵۰,۰۰۰ تومان)، ۴ نفره (۳,۰۰۰,۰۰۰ تومان)، ۸ نفره (۲,۲۵۰,۰۰۰ تومان). خوابگاه خاتم‌الانبیاء (برادران غیرسنواتی): ۲ نفره (۷,۲۵۰,۰۰۰ تومان)، ۴ نفره (۴,۲۵۰,۰۰۰ تومان)، ۶ نفره (۲,۹۷۰,۰۰۰ تومان). داخلی خواهران: ۰۵۱۵۷۲۰۲۱۴۴ (خانم ولیان) | برادران: ۰۵۱۵۷۲۰۲۱۴۵ (آقای داورپناه) | تغذیه: ۰۵۱۵۷۲۰۲۱۴۳ (خانم بهرمان).',
        'خوابگاه',
        '۱۴۰۵/۰۸/۲۸',
        '2026-11-22T08:00:00+03:30',
        '۰۸:۰۰ تا ۱۴:۰۰',
        'اداره امور خوابگاه‌ها',
        1
      );
      insAnn.run(
        'الزام ثبت‌نام کلیه نوورودی‌ها در سامانه استعدادیابی فرهنای وزارت علوم (talent.dmsrt.ir)',
        'پیرو بخشنامه وزارت علوم، کلیه دانشجویان نوورود موظف به ثبت علایق و سوابق در سامانه talent.dmsrt.ir هستند.',
        'لطفاً علاوه بر دریافت تاییدیه تحصیلی از emt.medu.ir و پرداخت الکترونیکی هزینه کارت دانشجویی (روزانه ۲,۰۰۰,۰۰۰ ریال | شبانه ۲,۵۰۰,۰۰۰ ریال)، حتماً ثبت اطلاعات در سامانه استعدادیابی فرهنای وزارت علوم به نشانی https://talent.dmsrt.ir را انجام دهید.',
        'عمومی',
        '۱۴۰۵/۰۸/۲۸',
        '2026-11-22T08:00:00+03:30',
        'غیرحضوری',
        'سامانه talent.dmsrt.ir',
        0
      );

      // ۵) جایگزینی سوالات متداول نمونه با پاسخ‌های رسمی ۱۴۰۵/۰۸/۲۸
      db.prepare('DELETE FROM faqs WHERE is_demo = 1').run();
      const insFaq = db.prepare(`
        INSERT INTO faqs (category, question, answer, helpful_yes, helpful_no, published, is_demo)
        VALUES (?, ?, ?, ?, ?, 1, 0)
      `);
      const officialFaqs: [string, string, string, number, number][] = [
        [
          'ثبت‌نام',
          'زمان‌بندی دقیق ثبت‌نام حضوری هر رشته چه روزی است؟',
          'ساعت ۸ تا ۱۴ در مجتمع آموزش عالی گناباد: یکشنبه ۱ آذر (مکانیک، صنایع، مواد، شیمی، عمران، معدن) | دوشنبه ۲ آذر (برق، کامپیوتر، حقوق، باغبانی، طبیعت، زمین‌شناسی) | سه‌شنبه ۳ آذر (شیمی کاربردی، باستان‌شناسی، رشته‌های زبان انگلیسی و زبان‌شناسی، مدیریت صنعتی و بازرگانی).',
          42,
          0,
        ],
        [
          'ثبت‌نام',
          'هزینه صدور کارت دانشجویی و خدمات فرهنگی چقدر است و چگونه پرداخت می‌شود؟',
          'دانشجویان روزانه ۲,۰۰۰,۰۰۰ ریال (۲۰۰ هزار تومان) و دانشجویان شبانه ۲,۵۰۰,۰۰۰ ریال (۲۵۰ هزار تومان) را از طریق پرتال دانشجویی، منوی «مالی ← پرداخت الکترونیکی» و گزینه «هزینه خدمات دانشجویی و فرهنگی و صدور کارت دانشجویی» پرداخت کرده و رسید آن را همراه داشته باشند.',
          36,
          0,
        ],
        [
          'خوابگاه',
          'آیا برای دریافت خوابگاه نیاز به پیش‌ثبت‌نام یا مراجعه قبل از ۱ آذر است؟',
          'خیر! طبق اطلاعیه رسمی، بلافاصله بعد از تکمیل ثبت‌نام حضوری و دریافت کارت دانشجویی، امکان ثبت‌نام و حضور در خوابگاه‌های پروین اعتصامی (خواهران) و خاتم‌الانبیاء (برادران) وجود دارد و نیاز به پیش‌ثبت‌نام قبلی نیست.',
          51,
          0,
        ],
        [
          'ثبت‌نام',
          'سامانه emt.medu.ir و سامانه talent.dmsrt.ir برای چیست؟',
          'از emt.medu.ir باید «رسید تاییدیه تحصیلی» دیپلم را دریافت و در مدارک حضوری تحویل دهید. همچنین طبق بخشنامه وزارت علوم، همه نوورودها باید علایق و سوابق خود را در سامانه استعدادیابی فرهنای وزارت علوم (talent.dmsrt.ir) ثبت کنند.',
          29,
          0,
        ],
        [
          'تغذیه و صبحانه',
          'شماره داخلی امور تغذیه و نحوه دریافت ژتون صبحانه استقبال چیست؟',
          'برای امور تغذیه دانشگاه می‌توانید با خانم بهرمان (داخلی ۰۵۱۵۷۲۰۲۱۴۳) تماس بگیرید. برای صبحانه رایگان ایام ثبت‌نام نیز کافی است در بخش «هیئت و ژتون صبحانه» همین پرتال، کارت QR خود را دریافت و ذخیره نمایید.',
          45,
          0,
        ],
        [
          'آموزش',
          'شهریه دوره شبانه (نوبت دوم) ورودی ۱۴۰۵–۱۴۰۶ چقدر است؟',
          'شهریه ثابت هر نیمسال برای علوم انسانی و علوم ریاضی ۱۶,۰۰۰,۰۰۰ ریال و برای سایر گروه‌ها (فنی‌مهندسی، علوم پایه و...) ۱۸,۰۰۰,۰۰۰ ریال است. جدول کامل شهریه متغیر هر واحد در صفحه «راهنما و ثبت‌نام» درج شده است.',
          23,
          0,
        ],
        [
          'بسیج و کانون‌ها',
          'آیا عضویت در ۲۵ کانون تخصصی بسیج دانشجویی هزینه‌ای دارد؟',
          'خیر، عضویت در کانون‌های بسیج دانشجویی و شرکت در اغلب کارگاه‌ها و نشست‌های علمی، رسانه‌ای، فرهنگی و جهادی رایگان است.',
          27,
          0,
        ],
        [
          'حمل‌ونقل و شهر',
          'آدرس دقیق دانشگاه و شماره‌های تماس ضروری پذیرفته‌شدگان چیست؟',
          'آدرس: خراسان رضوی، گناباد، بلوار قصبه، انتهای بلوار شهدای گمنام، مجتمع آموزش عالی گناباد. تلفن دانشگاه: ۰۵۱۵۷۲۰۲۱۲۲ | شماره‌های همراه ضروری پذیرفته‌شدگان: ۰۹۰۲۴۹۷۴۳۱۱ و ۰۹۱۵۸۹۴۴۲۰۸.',
          34,
          0,
        ],
      ];
      for (const f of officialFaqs) insFaq.run(...f);

      upsertSetting.run('__migration_official_1405_azar', JSON.stringify('1'));
    });
    migrateOfficial1405();
  }

  // ارتقای یک‌باره و امن اطلاعات هیئت به داده‌های واقعی کانال هیئت دانشجویی محبان‌الحسین (ع) (@mohebbanolhosein_uog)
  const heyatMigRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('__migration_heyat_mohebban_1405') as { value: string } | undefined;

  if (!heyatMigRow) {
    const migrateHeyatMohebban = db.transaction(() => {
      const getSettingVal = (k: string): string => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k) as
          | { value: string }
          | undefined;
        if (!row) return '';
        try {
          return String(JSON.parse(row.value));
        } catch {
          return row.value;
        }
      };
      const upsertSetting = db.prepare(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
      );

      // به‌روزرسانی لینک تلگرام رسمی و معرفی هیئت اگر هنوز روی مقادیر نمونه اولیه باشد
      const curTg = getSettingVal('heyatTelegramUrl');
      if (!curTg || curTg.includes('placeholder')) {
        upsertSetting.run('heyatTelegramUrl', JSON.stringify(DEFAULT_SETTINGS.heyatTelegramUrl));
      }
      if (getSettingVal('heyatEitaaUrl').includes('placeholder')) {
        upsertSetting.run('heyatEitaaUrl', JSON.stringify(''));
      }
      if (getSettingVal('heyatBaleUrl').includes('placeholder')) {
        upsertSetting.run('heyatBaleUrl', JSON.stringify(''));
      }
      const curLoc = getSettingVal('heyatOfficeLocation');
      if (!curLoc || curLoc.includes('نیاز به تکمیل')) {
        upsertSetting.run('heyatOfficeLocation', JSON.stringify(DEFAULT_SETTINGS.heyatOfficeLocation));
      }
      const curIntro = getSettingVal('heyatIntroText');
      if (!curIntro || curIntro.includes('نیاز به تکمیل')) {
        upsertSetting.run('heyatIntroText', JSON.stringify(DEFAULT_SETTINGS.heyatIntroText));
      }

      // جایگزینی برنامه‌های نمونه هیئت با برنامه‌های واقعی و گزارش مراسم‌های برگزارشده از اول ترم پاییز ۱۴۰۵
      db.prepare('DELETE FROM heyat_programs WHERE is_demo = 1').run();

      const insHp = db.prepare(`
        INSERT INTO heyat_programs (title, date_jalali, date_iso, time_range, location, speaker, maddah, category, description, published, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `);

      const realPrograms: [string, string, string, string, string, string, string, string, string][] = [
        // برنامه‌های پیش‌رو و قرارهای ثابت هفتگی
        [
          'ایستگاه صبحانه استقبال نوورودی‌ها (۱ تا ۳ آذر ۱۴۰۵)',
          '۱۴۰۵/۰۹/۰۱ تا ۱۴۰۵/۰۹/۰۳',
          '2026-11-22T08:00:00+03:30',
          '۰۷:۳۰ تا ۰۹:۳۰ [ساعت دقیق: نیاز به تایید]',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          '—',
          '—',
          'صبحانه',
          'پذیرایی گرم صبحانه ویژه دانشجویان نوورودی و خانواده‌هایشان در سه روز ثبت‌نام حضوری با ارائه کارت QR دیجیتال ژتون.',
        ],
        [
          'عصرهای عاشقی — قرار هفتگی یکشنبه‌ها',
          'هر هفته یکشنبه‌ها',
          '2026-11-22T15:30:00+03:30',
          '۱۵:۳۰ الی ۱۶:۰۰',
          'مزار شهدای گمنام دانشگاه گناباد',
          '—',
          '—',
          'هفتگی',
          'قرار هفتگی و صمیمی عصرهای یکشنبه در جوار مزار شهدای گمنام دانشگاه؛ پذیرای دانشجویان عزیز و کارکنان محترم دانشگاه هستیم.',
        ],
        [
          'مجالس روضه هفتگی هیئت محبان‌الحسین (ع)',
          'هر هفته سه‌شنبه‌ها',
          '2026-11-24T20:30:00+03:30',
          'ساعت ۲۰:۳۰ (سرویس خوابگاه پروین اعتصامی ساعت ۲۰:۰۰)',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'طبق اعلام هفتگی کانال @mohebbanolhosein_uog',
          'با نوای مداحان اهل بیت (ع)',
          'هفتگی',
          '«بهتر ز صد طبیب و مداوا و مرهم است، یک جرعه چای روضه‌ی هر هفته‌ات حسین (ع)!» ویژه برادران و خواهران همراه با سرویس از سرای پروین اعتصامی.',
        ],
        // گزارش مراسم‌های برگزارشده از ابتدای ترم پاییز ۱۴۰۵ (از جدید به قدیم)
        [
          'پنج شب مراسم عزاداری ایام فاطمیه دوم (برگزارشده)',
          'چهارشنبه ۲۰ تا یکشنبه ۲۴ آبان ۱۴۰۵',
          '2026-11-15T19:45:00+03:30',
          'هر شب ساعت ۱۹:۴۵ (سرویس از درب خوابگاه پروین اعتصامی ۱۹:۰۰)',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'حجت‌الاسلام‌والمسلمین فاطمی',
          'کربلایی مهدی میری، کربلایی سجاد سالارباشی و کربلایی سجاد مختاری',
          'مناسبتی',
          'پنج شب سوگواری ایام شهادت حضرت صدیقه طاهره (س) ویژه برادران و خواهران، همراه با سفره اطعام مادر سادات (س).',
        ],
        [
          'میزبانی از پیکر مطهر شهید گمنام دفاع مقدس در آیین فاطمیه (برگزارشده)',
          'چهارشنبه ۲۰ آبان ۱۴۰۵',
          '2026-11-11T19:45:00+03:30',
          'ساعت ۱۹:۴۵',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'حجت‌الاسلام‌والمسلمین فاطمی',
          'مداحان اهل بیت (ع)',
          'مناسبتی',
          'همزمان با نخستین شب سوگواری ایام فاطمیه دوم، پیکر مطهر شهید گمنام دوران دفاع مقدس (عملیات والفجر مقدماتی فکه) میهمان محفل عزاداران دانشگاه گناباد شد.',
        ],
        [
          'مراسم روضه هفتگی آبان‌ماه (برگزارشده)',
          'سه‌شنبه ۱۲ آبان ۱۴۰۵',
          '2026-11-03T19:45:00+03:30',
          'شامگاه سه‌شنبه',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'سخنرانی مذهبی',
          'مداحان اهل بیت (ع)',
          'هفتگی',
          'برگزاری مجلس روضه هفتگی هیئت دانشجویی محبان‌الحسین (ع) با قرائت قرآن، سخنرانی، روضه‌خوانی و پذیرایی چای روضه.',
        ],
        [
          'سه شب مراسم عزاداری ایام فاطمیه اول (برگزارشده)',
          'پنجشنبه ۳۰ مهر تا شنبه ۲ آبان ۱۴۰۵',
          '2026-10-22T18:00:00+03:30',
          'پنجشنبه و جمعه از ساعت ۱۸:۰۰ · شنبه از ساعت ۲۰:۳۰',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'حجت‌الاسلام‌والمسلمین فاطمی و استاد محمد ملایی',
          'حاج غلامرضا عطارباشی، کربلایی مجتبی حسن‌نژاد، کربلایی مهدی میری، کربلایی سجاد سالارباشی و کربلایی سجاد مختاری',
          'مناسبتی',
          'سه شب آیین سوگواری فاطمیه اول با حضور پرشور دانشجویان در مسجد حضرت فاطمه (س) دانشگاه گناباد.',
        ],
        [
          'جشن میلاد عقیلةالعرب حضرت زینب کبری (س) (برگزارشده)',
          'سه‌شنبه ۲۱ مهرماه ۱۴۰۵',
          '2026-10-13T19:40:00+03:30',
          'ساعت ۱۹:۴۰ (همراه با سرویس از خوابگاه پروین اعتصامی)',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'حجت‌الاسلام مرزانی',
          'کربلایی مهدی میری',
          'مناسبتی',
          'آیین جشن ولادت باسعادت حضرت زینب کبری (س) ویژه برادران و خواهران در مسجد دانشگاه.',
        ],
        [
          'آغاز مجالس روضه هفتگی ترم جدید (برگزارشده)',
          'سه‌شنبه ۱۴ مهرماه ۱۴۰۵',
          '2026-10-06T20:30:00+03:30',
          'ساعت ۲۰:۳۰ (حرکت سرویس از سرای پروین اعتصامی ساعت ۲۰:۰۰)',
          'مسجد حضرت فاطمه زهرا (س) دانشگاه گناباد',
          'حجت‌الاسلام مرزانی',
          'کربلایی مهدی میری',
          'هفتگی',
          'نخستین مجلس روضه هفتگی ترم پاییز ۱۴۰۵ به نیابت از شهید مصطفی علیخانی، ویژه برادران و خواهران.',
        ],
      ];

      for (const p of realPrograms) {
        insHp.run(...p);
      }

      upsertSetting.run('__migration_heyat_mohebban_1405', JSON.stringify('1'));
    });
    migrateHeyatMohebban();
  }

  // ارتقای یک‌باره و امن موقعیت جغرافیایی واقعی خوابگاه‌های پروین اعتصامی (8MVF+8RH) و خاتم‌الانبیاء (9M78+XJ3)
  const dormLocMigRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('__migration_dorm_locations_1405') as { value: string } | undefined;

  if (!dormLocMigRow) {
    const migrateDormLocations = db.transaction(() => {
      db.prepare(`
        UPDATE dorms
        SET address = ?, neshan_url = ?, balad_url = ?
        WHERE name LIKE '%پروین%'
      `).run(
        'استان خراسان رضوی، گناباد، خوابگاه پروین اعتصامی (کد پلاس: 8MVF+8RH)',
        'https://neshan.org/maps/@34.343312,58.674609,17z',
        'https://balad.ir/location?latitude=34.343312&longitude=58.674609&zoom=17'
      );

      db.prepare(`
        UPDATE dorms
        SET address = ?, neshan_url = ?, balad_url = ?
        WHERE name LIKE '%خاتم%'
      `).run(
        'استان خراسان رضوی، گناباد، بلوار جانباز، خوابگاه خاتم (محدوده دانشگاه آزاد گناباد — کد پلاس: 9M78+XJ3)',
        'https://neshan.org/maps/@34.364887,58.666547,17z',
        'https://balad.ir/location?latitude=34.364887&longitude=58.666547&zoom=17'
      );

      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        '__migration_dorm_locations_1405',
        JSON.stringify('1')
      );
    });
    migrateDormLocations();
  }

  // قانون قطعی: هر دانشجو در کل روزهای ثبت‌نام فقط یک نوبت (در روز ثبت‌نام خود) مجاز به دریافت صبحانه است
  const oneBreakfastMigRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('__migration_claims_one_per_student_1405') as { value: string } | undefined;

  if (!oneBreakfastMigRow) {
    const migrateSingleClaim = db.transaction(() => {
      // حذف دریافت‌های تکراری احتمالی قدیمی و حفظ فقط اولین ثبت هر دانشجو
      db.exec(`
        DELETE FROM claims
        WHERE id NOT IN (
          SELECT MIN(id) FROM claims GROUP BY student_id
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_per_student ON claims(student_id);
      `);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        '__migration_claims_one_per_student_1405',
        JSON.stringify('1')
      );
    });
    migrateSingleClaim();
  }

  // ارتقای یک‌باره و امن اطلاعات رسمی کانال و لوگوی بسیج دانشجویی دانشگاه گناباد (حوزه شهید شوریده)
  const basijOfficialMigRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('__migration_basij_official_1405') as { value: string } | undefined;

  if (!basijOfficialMigRow) {
    const migrateBasijOfficial = db.transaction(() => {
      const readSetting = (key: string): string => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
          | { value: string }
          | undefined;
        if (!row) return '';
        try {
          const parsed = JSON.parse(row.value);
          return typeof parsed === 'string' ? parsed : '';
        } catch {
          return row.value;
        }
      };
      const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

      if (!readSetting('basijLogoUrl')) {
        setSetting.run('basijLogoUrl', JSON.stringify('/assets/basij-logo-official.png'));
      }
      const curTg = readSetting('basijTelegramUrl');
      if (!curTg || curTg.includes('placeholder')) {
        setSetting.run('basijTelegramUrl', JSON.stringify('https://t.me/BasijUOG'));
      }
      const curEitaa = readSetting('basijEitaaUrl');
      if (!curEitaa || curEitaa.includes('placeholder')) {
        setSetting.run('basijEitaaUrl', JSON.stringify('https://eitaa.com/basijuog'));
      }
      const curBale = readSetting('basijBaleUrl');
      if (curBale.includes('placeholder')) {
        setSetting.run('basijBaleUrl', JSON.stringify(''));
      }
      const curOffice = readSetting('basijOfficeLocation');
      if (!curOffice || curOffice.includes('نیاز به تکمیل')) {
        setSetting.run('basijOfficeLocation', JSON.stringify(DEFAULT_SETTINGS.basijOfficeLocation));
      }
      const curIntro = readSetting('basijIntroText');
      if (!curIntro || curIntro.includes('نیاز به تکمیل')) {
        setSetting.run('basijIntroText', JSON.stringify(DEFAULT_SETTINGS.basijIntroText));
      }

      setSetting.run('__migration_basij_official_1405', JSON.stringify('1'));
    });
    migrateBasijOfficial();
  }
}

export function getSettings(): SiteSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    try {
      merged[row.key] = JSON.parse(row.value);
    } catch {
      merged[row.key] = row.value;
    }
  }
  return merged as unknown as SiteSettings;
}

export function saveSettings(partial: Partial<SiteSettings>) {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction((entries: [string, unknown][]) => {
    for (const [key, val] of entries) {
      if (key in DEFAULT_SETTINGS && val !== undefined) {
        upsert.run(key, JSON.stringify(val));
      }
    }
  });
  tx(Object.entries(partial));
}

export function logAudit(username: string, action: string, detail: string, ip: string) {
  db.prepare(
    'INSERT INTO audit_log (username, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(username, action, detail, ip);
}
