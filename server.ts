import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  db,
  initDatabase,
  getSettings,
  saveSettings,
  logAudit,
} from './server/db';
import {
  computeBirthHash,
  generateCouponCode,
  generateSessionToken,
  createSelfHostedCaptcha,
  verifySelfHostedCaptcha,
  checkRateLimit,
  getClientIp,
  detectSafeFileType,
  requireCsrfHeader,
} from './server/security';
import { normalizeNameCompact, searchFaqs, toPersianDigits } from './src/utils/persian';
import { parseStudentsCsv, resolveOfflineClaimConflict } from './src/utils/coupon';
import { parseAndValidateJalaliDate } from './src/utils/jalali';
import { buildOfflinePortalHtml, collectOfflineSnapshot } from './server/offlineExport';
import type { AdminRole } from './src/types/portal';

initDatabase();

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd ? Number(process.env.PORT || 3000) : 3000;
const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.set('trust proxy', 1);

// هدرهای امنیتی Helmet با CSP سازگار با توسعه و تولید (بدون دامنه خارجی)
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            workerSrc: ["'self'", 'blob:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// سرو ایمن فایل‌های آپلودی بدون امکان اجرای اسکریپت
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    next();
  },
  express.static(uploadsDir)
);

// کش ۶۰ ثانیه‌ای برای APIهای عمومی جهت تحمل بار روزهای ثبت‌نام
const publicCache = new Map<string, { expires: number; data: unknown }>();
function getCached<T>(key: string, loader: () => T, ttlMs = 60_000): T {
  const hit = publicCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const fresh = loader();
  publicCache.set(key, { expires: Date.now() + ttlMs, data: fresh });
  return fresh;
}
function clearPublicCache() {
  publicCache.clear();
}

// میدلور احراز هویت و نقش ادمین
interface AuthedRequest extends express.Request {
  adminUser?: { id: number; username: string; displayName: string; role: AdminRole };
}

function attachAdmin(req: AuthedRequest) {
  const token = req.cookies?.portal_session;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.username, u.display_name, u.role
       FROM sessions s
       JOIN admin_users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as
    | {
        token: string;
        expires_at: number;
        id: number;
        username: string;
        display_name: string;
        role: AdminRole;
      }
    | undefined;

  if (!row || row.expires_at < Date.now()) {
    if (row) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };
}

function requireRole(roles: AdminRole[]) {
  return (req: AuthedRequest, res: express.Response, next: express.NextFunction) => {
    const user = attachAdmin(req);
    if (!user) {
      res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید.' });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'شما مجوز دسترسی به این بخش را ندارید.' });
      return;
    }
    req.adminUser = user;
    next();
  };
}

// ==========================================
// 1. PUBLIC ENDPOINTS
// ==========================================

app.get('/api/public/settings', (_req, res) => {
  res.json(getCached('settings', () => getSettings()));
});

app.get('/api/public/captcha', (_req, res) => {
  res.json(createSelfHostedCaptcha());
});

app.get('/api/public/faq', (req, res) => {
  const q = String(req.query.q || '');
  const category = String(req.query.category || 'همه');
  const all = getCached('faqs', () =>
    (
      db
        .prepare('SELECT * FROM faqs WHERE published = 1 ORDER BY helpful_yes DESC, id ASC')
        .all() as Record<string, unknown>[]
    ).map((r) => ({
      id: r.id as number,
      category: r.category as string,
      question: r.question as string,
      answer: r.answer as string,
      helpfulYes: r.helpful_yes as number,
      helpfulNo: r.helpful_no as number,
      published: Boolean(r.published),
      isDemo: Boolean(r.is_demo),
    }))
  );
  res.json(searchFaqs(all, q, category));
});

app.post('/api/public/faq/:id/vote', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ helpful: z.enum(['yes', 'no']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(id)) {
    res.status(400).json({ error: 'درخواست نامعتبر است.' });
    return;
  }
  const col = parsed.data.helpful === 'yes' ? 'helpful_yes' : 'helpful_no';
  db.prepare(`UPDATE faqs SET ${col} = ${col} + 1 WHERE id = ?`).run(id);
  clearPublicCache();
  res.json({ ok: true });
});

app.get('/api/public/announcements', (_req, res) => {
  const rows = getCached('announcements', () =>
    (
      db
        .prepare('SELECT * FROM announcements WHERE published = 1 ORDER BY pinned DESC, id DESC')
        .all() as Record<string, unknown>[]
    ).map((r) => ({
      id: r.id as number,
      title: r.title as string,
      summary: r.summary as string,
      body: r.body as string,
      category: r.category as string,
      dateJalali: r.date_jalali as string,
      eventDateIso: (r.event_date_iso as string) || undefined,
      eventTime: (r.event_time as string) || undefined,
      location: (r.location as string) || undefined,
      pinned: Boolean(r.pinned),
      published: Boolean(r.published),
      isDemo: Boolean(r.is_demo),
    }))
  );
  res.json(rows);
});

function mapDormRow(r: Record<string, unknown>) {
  return {
    id: r.id as number,
    name: r.name as string,
    gender: r.gender as string,
    address: r.address as string,
    distanceToCampus: r.distance_to_campus as string,
    neshanUrl: r.neshan_url as string,
    baladUrl: r.balad_url as string,
    monthlyFee: r.monthly_fee as string,
    capacity: r.capacity as string,
    roomType: r.room_type as string,
    curfewHours: r.curfew_hours as string,
    supervisorPhone: r.supervisor_phone as string,
    facilities: JSON.parse((r.facilities_json as string) || '[]'),
    rules: JSON.parse((r.rules_json as string) || '[]'),
    requiredDocs: JSON.parse((r.required_docs_json as string) || '[]'),
    gallery: JSON.parse((r.gallery_json as string) || '[]'),
    faq: JSON.parse((r.faq_json as string) || '[]'),
    published: Boolean(r.published),
    isDemo: Boolean(r.is_demo),
  };
}

app.get('/api/public/dorms', (_req, res) => {
  const dorms = getCached('dorms', () =>
    (
      db
        .prepare('SELECT * FROM dorms WHERE published = 1 ORDER BY id ASC')
        .all() as Record<string, unknown>[]
    ).map(mapDormRow)
  );
  res.json(dorms);
});

app.get('/api/public/dorms/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM dorms WHERE id = ? AND published = 1')
    .get(Number(req.params.id)) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'خوابگاه موردنظر یافت نشد.' });
    return;
  }
  res.json(mapDormRow(row));
});

app.get('/api/public/basij/cadres', (_req, res) => {
  const cadres = getCached('cadres', () =>
    (
      db
        .prepare('SELECT * FROM cadres WHERE published = 1 ORDER BY id ASC')
        .all() as Record<string, unknown>[]
    ).map((r) => ({
      id: r.id as number,
      name: r.name as string,
      category: r.category as string,
      shortDesc: r.short_desc as string,
      fullDesc: r.full_desc as string,
      leadName: r.lead_name as string,
      meetingSchedule: r.meeting_schedule as string,
      joinLink: r.join_link as string,
      contactInfo: r.contact_info as string,
      highlights: JSON.parse((r.highlights_json as string) || '[]'),
      tags: JSON.parse((r.tags_json as string) || '[]'),
      imageUrl: (r.image_url as string) || '',
      pdfPage: Number(r.pdf_page || 1),
      published: Boolean(r.published),
      isDemo: Boolean(r.is_demo),
    }))
  );
  res.json(cadres);
});

app.get('/api/public/heyat/programs', (_req, res) => {
  const programs = getCached('heyat_programs', () =>
    (
      db
        .prepare('SELECT * FROM heyat_programs WHERE published = 1 ORDER BY date_iso ASC, id ASC')
        .all() as Record<string, unknown>[]
    ).map((r) => ({
      id: r.id as number,
      title: r.title as string,
      dateJalali: r.date_jalali as string,
      dateIso: r.date_iso as string,
      timeRange: r.time_range as string,
      location: r.location as string,
      speaker: r.speaker as string,
      maddah: r.maddah as string,
      category: r.category as string,
      description: r.description as string,
      published: Boolean(r.published),
      isDemo: Boolean(r.is_demo),
    }))
  );
  res.json(programs);
});

// ==========================================
// 2. COUPON LOOKUP & PUBLIC FORMS
// ==========================================

const lookupSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  birthJalali: z.string().min(8).max(12),
  website: z.string().optional(), // honeypot
});

app.post('/api/coupon/lookup', (req, res) => {
  const ip = getClientIp(req);
  const ipRate = checkRateLimit(`coupon:ip:${ip}`, 10, 10 * 60 * 1000);
  if (!ipRate.allowed) {
    res.status(429).json({
      error: `تعداد تلاش‌ها بیش از حد مجاز است. لطفاً ${toPersianDigits(
        Math.ceil(ipRate.retryAfterSec / 60)
      )} دقیقه دیگر مجدداً تلاش کنید.`,
    });
    return;
  }

  const parsed = lookupSchema.safeParse(req.body);
  if (!parsed.success || (parsed.data.website && parsed.data.website.trim() !== '')) {
    res.status(400).json({ error: 'اطلاعات یافت نشد، با مسئول هیئت تماس بگیر.' });
    return;
  }

  const nameKey = `${normalizeNameCompact(parsed.data.firstName)}:${normalizeNameCompact(parsed.data.lastName)}`;
  const nameRate = checkRateLimit(`coupon:name:${nameKey}`, 5, 10 * 60 * 1000);
  if (!nameRate.allowed) {
    res.status(429).json({
      error: 'تعداد تلاش‌های این نام بیش از حد مجاز است. لطفاً ۱۰ دقیقه دیگر تلاش کنید.',
    });
    return;
  }

  const birthHash = computeBirthHash(
    parsed.data.firstName,
    parsed.data.lastName,
    parsed.data.birthJalali
  );

  const genericError = 'اطلاعات یافت نشد، با مسئول هیئت تماس بگیر.';
  if (!birthHash) {
    res.status(404).json({ error: genericError });
    return;
  }

  const student = db
    .prepare(
      'SELECT id, first_name, last_name, coupon_code, note, active FROM students WHERE birth_hash = ?'
    )
    .get(birthHash) as
    | {
        id: number;
        first_name: string;
        last_name: string;
        coupon_code: string;
        note: string;
        active: number;
      }
    | undefined;

  if (!student || !student.active) {
    res.status(404).json({ error: genericError });
    return;
  }

  const activeMeals = (
    db.prepare('SELECT * FROM meals WHERE active = 1 ORDER BY id ASC').all() as Record<string, unknown>[]
  ).map((m) => ({
    id: m.id as number,
    name: m.name as string,
    dateJalali: m.date_jalali as string,
    startTime: m.start_time as string,
    endTime: m.end_time as string,
    active: Boolean(m.active),
  }));

  const claimedMealIds = (
    db.prepare('SELECT meal_id FROM claims WHERE student_id = ?').all(student.id) as { meal_id: number }[]
  ).map((c) => c.meal_id);

  res.json({
    studentId: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    couponCode: student.coupon_code,
    note: student.note,
    activeMeals,
    claimedMealIds,
  });
});

app.post('/api/questions', (req, res) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`q:${ip}`, 8, 15 * 60 * 1000).allowed) {
    res.status(429).json({ error: 'تعداد ارسال سوال بیش از حد مجاز است.' });
    return;
  }
  const schema = z.object({
    senderName: z.string().max(60).optional().default('ناشناس'),
    category: z.string().min(2).max(40),
    question: z.string().min(6).max(800),
    captchaToken: z.string().min(5),
    captchaAnswer: z.string().min(1),
    website: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || (parsed.data.website && parsed.data.website.trim() !== '')) {
    res.status(400).json({ error: 'لطفاً متن سوال و فیلدهای الزامی را به‌درستی تکمیل کنید.' });
    return;
  }
  if (!verifySelfHostedCaptcha(parsed.data.captchaToken, parsed.data.captchaAnswer)) {
    res.status(400).json({ error: 'پاسخ سوال امنیتی صحیح نیست. لطفاً دوباره امتحان کنید.' });
    return;
  }
  db.prepare(
    'INSERT INTO questions (sender_name, category, question) VALUES (?, ?, ?)'
  ).run(parsed.data.senderName.trim() || 'ناشناس', parsed.data.category, parsed.data.question.trim());
  res.status(201).json({ ok: true, message: 'سوال شما ثبت شد و پس از پاسخگویی به بخش سوالات متداول اضافه خواهد شد.' });
});

app.post('/api/contact', (req, res) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`contact:${ip}`, 6, 15 * 60 * 1000).allowed) {
    res.status(429).json({ error: 'تعداد پیام‌های ارسالی بیش از حد مجاز است.' });
    return;
  }
  const schema = z.object({
    senderName: z.string().min(2).max(60),
    contactInfo: z.string().min(3).max(80),
    topic: z.string().min(2).max(50),
    message: z.string().min(6).max(1200),
    captchaToken: z.string().min(5),
    captchaAnswer: z.string().min(1),
    website: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || (parsed.data.website && parsed.data.website.trim() !== '')) {
    res.status(400).json({ error: 'لطفاً تمام فیلدهای فرم تماس را با دقت تکمیل کنید.' });
    return;
  }
  if (!verifySelfHostedCaptcha(parsed.data.captchaToken, parsed.data.captchaAnswer)) {
    res.status(400).json({ error: 'پاسخ سوال امنیتی اشتباه است.' });
    return;
  }
  db.prepare(
    'INSERT INTO contact_messages (sender_name, contact_info, topic, message) VALUES (?, ?, ?, ?)'
  ).run(
    parsed.data.senderName.trim(),
    parsed.data.contactInfo.trim(),
    parsed.data.topic.trim(),
    parsed.data.message.trim()
  );
  res.status(201).json({ ok: true, message: 'پیام شما با موفقیت ارسال شد.' });
});

app.post('/api/survey', (req, res) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`survey:${ip}`, 5, 60 * 60 * 1000).allowed) {
    res.status(429).json({ error: 'نظر شما قبلاً ثبت شده است. سپاس از همراهی شما.' });
    return;
  }
  const schema = z.object({
    registrationScore: z.number().int().min(1).max(5),
    breakfastScore: z.number().int().min(1).max(5),
    comment: z.string().max(600).optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'امتیازهای واردشده معتبر نیستند.' });
    return;
  }
  db.prepare(
    'INSERT INTO surveys (registration_score, breakfast_score, comment) VALUES (?, ?, ?)'
  ).run(parsed.data.registrationScore, parsed.data.breakfastScore, parsed.data.comment.trim());
  res.status(201).json({ ok: true, message: 'نظر ناشناس شما ثبت شد. ممنون از کمک شما برای بهتر شدن برنامه‌ها!' });
});

// ==========================================
// 3. AUTHENTICATION (ADMIN & SCANNER)
// ==========================================

app.post('/api/admin/login', (req, res) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`login:${ip}`, 15, 15 * 60 * 1000).allowed) {
    res.status(429).json({ error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.' });
    return;
  }
  const schema = z.object({
    username: z.string().min(2).max(50),
    password: z.string().min(4).max(100),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'نام کاربری یا رمز عبور نامعتبر است.' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM admin_users WHERE username = ?')
    .get(parsed.data.username.trim().toLowerCase()) as
    | {
        id: number;
        username: string;
        display_name: string;
        password_hash: string;
        role: AdminRole;
        failed_attempts: number;
        locked_until: number;
      }
    | undefined;

  if (!user) {
    res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    return;
  }

  if (user.locked_until > Date.now()) {
    res.status(423).json({ error: 'حساب کاربری موقتاً به دلیل تلاش ناموفق قفل شده است. چند دقیقه دیگر تلاش کنید.' });
    return;
  }

  const validPass = bcrypt.compareSync(parsed.data.password, user.password_hash);
  if (!validPass) {
    const nextFailed = user.failed_attempts + 1;
    const lockedUntil = nextFailed >= 5 ? Date.now() + 10 * 60 * 1000 : 0;
    db.prepare(
      'UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?'
    ).run(nextFailed, lockedUntil, user.id);
    logAudit(user.username, 'LOGIN_FAILED', `تلاش ناموفق (${nextFailed})`, ip);
    res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    return;
  }

  db.prepare('UPDATE admin_users SET failed_attempts = 0, locked_until = 0 WHERE id = ?').run(user.id);

  const token = generateSessionToken();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // ۱۲ ساعت
  db.prepare(
    'INSERT INTO sessions (token, user_id, role, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, user.id, user.role, expiresAt);

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('portal_session', token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });

  logAudit(user.username, 'LOGIN_SUCCESS', `ورود با نقش ${user.role}`, ip);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
  });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.cookies?.portal_session;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('portal_session', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/admin/me', (req: AuthedRequest, res) => {
  const user = attachAdmin(req);
  res.json({ user: user || null });
});

// ==========================================
// 4. SCANNER PWA ENDPOINTS
// ==========================================

function getMealStats(mealId: number) {
  const total = (db.prepare('SELECT COUNT(*) as c FROM students WHERE active = 1').get() as { c: number }).c;
  const claimed = (db.prepare('SELECT COUNT(*) as c FROM claims WHERE meal_id = ?').get(mealId) as { c: number }).c;
  return { claimed, remaining: Math.max(0, total - claimed), total };
}

app.get('/api/scan/meals', requireRole(['owner', 'food_manager', 'scanner']), (_req, res) => {
  const meals = (
    db.prepare('SELECT * FROM meals ORDER BY active DESC, id ASC').all() as Record<string, unknown>[]
  ).map((m) => {
    const stats = getMealStats(m.id as number);
    return {
      id: m.id as number,
      name: m.name as string,
      dateJalali: m.date_jalali as string,
      startTime: m.start_time as string,
      endTime: m.end_time as string,
      active: Boolean(m.active),
      claimedCount: stats.claimed,
      totalActiveStudents: stats.total,
    };
  });
  res.json(meals);
});

app.get('/api/scan/list', requireRole(['owner', 'food_manager', 'scanner']), (_req, res) => {
  const students = db
    .prepare(
      'SELECT id, first_name, last_name, first_name_norm, last_name_norm, coupon_code, active FROM students'
    )
    .all() as {
    id: number;
    first_name: string;
    last_name: string;
    first_name_norm: string;
    last_name_norm: string;
    coupon_code: string;
    active: number;
  }[];

  const claims = db
    .prepare('SELECT student_id, meal_id, claimed_at FROM claims')
    .all() as { student_id: number; meal_id: number; claimed_at: string }[];

  const claimMap = new Map<number, Record<number, string>>();
  for (const c of claims) {
    if (!claimMap.has(c.student_id)) claimMap.set(c.student_id, {});
    claimMap.get(c.student_id)![c.meal_id] = c.claimed_at;
  }

  res.json({
    syncedAt: new Date().toISOString(),
    students: students.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      firstNameNorm: s.first_name_norm,
      lastNameNorm: s.last_name_norm,
      couponCode: s.coupon_code,
      active: Boolean(s.active),
      claimedAtByMeal: claimMap.get(s.id) || {},
    })),
  });
});

app.post(
  '/api/scan/claim',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager', 'scanner']),
  (req: AuthedRequest, res) => {
    const schema = z.object({
      couponCode: z.string().min(4).max(80),
      mealId: z.number().int().positive(),
      claimedAtIso: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ status: 'invalid', message: 'کد ژتون یا وعده نامعتبر است.' });
      return;
    }

    const ip = getClientIp(req);
    const meal = db
      .prepare('SELECT * FROM meals WHERE id = ?')
      .get(parsed.data.mealId) as { id: number; name: string } | undefined;

    if (!meal) {
      res.status(404).json({ status: 'invalid', message: 'وعده صبحانه انتخاب‌شده یافت نشد.' });
      return;
    }

    const student = db
      .prepare('SELECT id, first_name, last_name, active FROM students WHERE coupon_code = ?')
      .get(parsed.data.couponCode.trim()) as
      | { id: number; first_name: string; last_name: string; active: number }
      | undefined;

    if (!student || !student.active) {
      db.prepare(
        'INSERT INTO suspicious_attempts (student_id, meal_id, attempt_type, detail, ip) VALUES (?, ?, ?, ?, ?)'
      ).run(
        student?.id ?? null,
        meal.id,
        'invalid_code',
        `کد نامعتبر یا غیرفعال: ${parsed.data.couponCode.slice(0, 14)}`,
        ip
      );
      res.json({
        status: 'invalid',
        message: 'نامعتبر یا غیرفعال',
        stats: getMealStats(meal.id),
      });
      return;
    }

    const studentName = `${student.first_name} ${student.last_name}`;
    const existing = db
      .prepare('SELECT claimed_at FROM claims WHERE student_id = ? AND meal_id = ?')
      .get(student.id, meal.id) as { claimed_at: string } | undefined;

    if (existing) {
      db.prepare(
        'INSERT INTO suspicious_attempts (student_id, meal_id, attempt_type, detail, ip) VALUES (?, ?, ?, ?, ?)'
      ).run(student.id, meal.id, 'duplicate_claim', `تلاش دریافت مجدد برای ${studentName}`, ip);
      res.json({
        status: 'already_claimed',
        message: 'قبلاً دریافت کرده',
        studentName,
        claimedAt: existing.claimed_at,
        mealName: meal.name,
        stats: getMealStats(meal.id),
      });
      return;
    }

    const nowIso = parsed.data.claimedAtIso || new Date().toISOString();
    db.prepare(
      'INSERT INTO claims (student_id, meal_id, claimed_at, staff_user_id) VALUES (?, ?, ?, ?)'
    ).run(student.id, meal.id, nowIso, req.adminUser!.id);

    res.json({
      status: 'allowed',
      message: 'مجاز — صبحانه ثبت شد',
      studentName,
      claimedAt: nowIso,
      mealName: meal.name,
      stats: getMealStats(meal.id),
    });
  }
);

app.post(
  '/api/scan/sync',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager', 'scanner']),
  (req: AuthedRequest, res) => {
    const schema = z.object({
      items: z.array(
        z.object({
          localId: z.string(),
          couponCode: z.string(),
          mealId: z.number().int().positive(),
          scannedAtIso: z.string(),
        })
      ),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'فرمت صف همگام‌سازی نامعتبر است.' });
      return;
    }

    let synced = 0;
    let conflicts = 0;

    for (const item of parsed.data.items) {
      const student = db
        .prepare('SELECT id, active FROM students WHERE coupon_code = ?')
        .get(item.couponCode) as { id: number; active: number } | undefined;
      if (!student || !student.active) continue;

      const existing = db
        .prepare('SELECT id, claimed_at FROM claims WHERE student_id = ? AND meal_id = ?')
        .get(student.id, item.mealId) as { id: number; claimed_at: string } | undefined;

      const decision = resolveOfflineClaimConflict(
        existing?.claimed_at ?? null,
        item.scannedAtIso
      );

      if (!existing) {
        db.prepare(
          'INSERT INTO claims (student_id, meal_id, claimed_at, staff_user_id) VALUES (?, ?, ?, ?)'
        ).run(student.id, item.mealId, item.scannedAtIso, req.adminUser!.id);
        synced++;
      } else if (decision.accepted) {
        db.prepare('UPDATE claims SET claimed_at = ? WHERE id = ?').run(
          item.scannedAtIso,
          existing.id
        );
        synced++;
      } else {
        conflicts++;
      }
    }

    res.json({ ok: true, synced, conflicts });
  }
);

// ==========================================
// 5. ADMIN PANEL ENDPOINTS
// ==========================================

app.get(
  '/api/admin/settings',
  requireRole(['owner', 'editor']),
  (_req, res) => {
    res.json(getSettings());
  }
);

app.put(
  '/api/admin/settings',
  requireCsrfHeader,
  requireRole(['owner', 'editor']),
  (req: AuthedRequest, res) => {
    saveSettings(req.body || {});
    clearPublicCache();
    logAudit(req.adminUser!.username, 'UPDATE_SETTINGS', 'به‌روزرسانی تنظیمات عمومی و ظاهری', getClientIp(req));
    res.json(getSettings());
  }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.post(
  '/api/admin/upload',
  requireCsrfHeader,
  requireRole(['owner', 'editor']),
  upload.single('file'),
  (req: AuthedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'فایلی انتخاب نشده است.' });
      return;
    }
    const check = detectSafeFileType(file.buffer, file.originalname);
    if (!check.allowed) {
      res.status(400).json({
        error: 'نوع فایل مجاز نیست. فقط تصاویر PNG، JPG، WebP، SVG امن یا فایل PDF پذیرفته می‌شود.',
      });
      return;
    }
    if (check.ext !== '.pdf' && file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'حداکثر حجم مجاز برای تصاویر ۵ مگابایت است.' });
      return;
    }
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${check.ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    const url = `/uploads/${filename}`;
    logAudit(req.adminUser!.username, 'UPLOAD_FILE', `آپلود فایل (${check.ext})`, getClientIp(req));
    res.json({ url, mime: check.mime, size: file.size });
  }
);

// مدیریت دانشجویان (بدون ذخیره تاریخ تولد خام)
app.get(
  '/api/admin/students',
  requireRole(['owner', 'food_manager']),
  (req, res) => {
    const q = String(req.query.q || '').trim();
    const rows = db
      .prepare('SELECT id, first_name, last_name, coupon_code, note, active, is_demo, created_at FROM students ORDER BY id DESC')
      .all() as Record<string, unknown>[];

    const mapped = rows.map((r) => ({
      id: r.id as number,
      firstName: r.first_name as string,
      lastName: r.last_name as string,
      couponCode: r.coupon_code as string,
      note: r.note as string,
      active: Boolean(r.active),
      isDemo: Boolean(r.is_demo),
      createdAt: r.created_at as string,
    }));

    if (!q) {
      res.json(mapped);
      return;
    }
    const qNorm = normalizeNameCompact(q);
    res.json(
      mapped.filter(
        (s) =>
          normalizeNameCompact(s.firstName + s.lastName).includes(qNorm) ||
          s.couponCode.toLowerCase().includes(q.toLowerCase()) ||
          s.note.includes(q)
      )
    );
  }
);

app.post(
  '/api/admin/students',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager']),
  (req: AuthedRequest, res) => {
    const schema = z.object({
      firstName: z.string().min(2).max(60),
      lastName: z.string().min(2).max(60),
      birthJalali: z.string().min(8).max(12),
      note: z.string().max(120).optional().default(''),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'اطلاعات دانشجو ناقص است.' });
      return;
    }
    const dateCheck = parseAndValidateJalaliDate(parsed.data.birthJalali);
    if (!dateCheck.valid) {
      res.status(400).json({ error: 'فرمت تاریخ تولد شمسی نامعتبر است (مثال: ۱۳۸۷/۰۵/۲۰).' });
      return;
    }
    const hash = computeBirthHash(parsed.data.firstName, parsed.data.lastName, dateCheck.normalized);
    if (!hash) {
      res.status(400).json({ error: 'خطا در نرمال‌سازی اطلاعات.' });
      return;
    }
    try {
      const couponCode = generateCouponCode();
      const info = db
        .prepare(
          `INSERT INTO students (first_name, last_name, first_name_norm, last_name_norm, birth_hash, coupon_code, note, active, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`
        )
        .run(
          parsed.data.firstName.trim(),
          parsed.data.lastName.trim(),
          normalizeNameCompact(parsed.data.firstName),
          normalizeNameCompact(parsed.data.lastName),
          hash,
          couponCode,
          parsed.data.note.trim()
        );
      logAudit(req.adminUser!.username, 'ADD_STUDENT', `افزودن دانشجو #${info.lastInsertRowid}`, getClientIp(req));
      res.status(201).json({ id: info.lastInsertRowid, couponCode });
    } catch {
      res.status(409).json({ error: 'این دانشجو قبلاً در لیست ثبت شده است.' });
    }
  }
);

app.post(
  '/api/admin/students/import-csv',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager']),
  (req: AuthedRequest, res) => {
    const schema = z.object({ csvText: z.string().min(5) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'محتوای CSV خالی است.' });
      return;
    }
    const report = parseStudentsCsv(parsed.data.csvText);
    const ins = db.prepare(
      `INSERT OR IGNORE INTO students (first_name, last_name, first_name_norm, last_name_norm, birth_hash, coupon_code, note, active, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`
    );
    let inserted = 0;
    let skippedExisting = 0;

    const tx = db.transaction(() => {
      for (const row of report.rows) {
        if (!row.valid) continue;
        const hash = computeBirthHash(row.firstName, row.lastName, row.birthJalali);
        if (!hash) continue;
        const result = ins.run(
          row.firstName,
          row.lastName,
          normalizeNameCompact(row.firstName),
          normalizeNameCompact(row.lastName),
          hash,
          generateCouponCode(),
          row.note
        );
        if (result.changes > 0) inserted++;
        else skippedExisting++;
      }
    });
    tx();

    logAudit(
      req.adminUser!.username,
      'IMPORT_STUDENTS_CSV',
      `ورود گروهی: ${inserted} مورد جدید، ${skippedExisting} تکراری`,
      getClientIp(req)
    );
    res.json({
      inserted,
      skippedExisting,
      invalidRows: report.errorCount + report.duplicateCount,
    });
  }
);

app.patch(
  '/api/admin/students/:id',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager']),
  (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { active, note } = req.body as { active?: boolean; note?: string };
    if (typeof active === 'boolean') {
      db.prepare('UPDATE students SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
    }
    if (typeof note === 'string') {
      db.prepare('UPDATE students SET note = ? WHERE id = ?').run(note, id);
    }
    logAudit(req.adminUser!.username, 'UPDATE_STUDENT', `ویرایش وضعیت دانشجو #${id}`, getClientIp(req));
    res.json({ ok: true });
  }
);

app.delete(
  '/api/admin/students/:id',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager']),
  (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM students WHERE id = ?').run(id);
    logAudit(req.adminUser!.username, 'DELETE_STUDENT', `حذف دانشجو #${id}`, getClientIp(req));
    res.json({ ok: true });
  }
);

// مدیریت وعده‌های صبحانه
app.get('/api/admin/meals', requireRole(['owner', 'food_manager']), (_req, res) => {
  const meals = (db.prepare('SELECT * FROM meals ORDER BY id ASC').all() as Record<string, unknown>[]).map((m) => ({
    id: m.id as number,
    name: m.name as string,
    dateJalali: m.date_jalali as string,
    startTime: m.start_time as string,
    endTime: m.end_time as string,
    active: Boolean(m.active),
    ...getMealStats(m.id as number),
  }));
  res.json(meals);
});

app.post(
  '/api/admin/meals',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager']),
  (req: AuthedRequest, res) => {
    const schema = z.object({
      name: z.string().min(2).max(100),
      dateJalali: z.string().min(6).max(30),
      startTime: z.string().min(3).max(20),
      endTime: z.string().min(3).max(20),
      active: z.boolean().optional().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'اطلاعات وعده ناقص است.' });
      return;
    }
    const info = db
      .prepare('INSERT INTO meals (name, date_jalali, start_time, end_time, active) VALUES (?, ?, ?, ?, ?)')
      .run(
        parsed.data.name,
        parsed.data.dateJalali,
        parsed.data.startTime,
        parsed.data.endTime,
        parsed.data.active ? 1 : 0
      );
    logAudit(req.adminUser!.username, 'ADD_MEAL', parsed.data.name, getClientIp(req));
    res.status(201).json({ id: info.lastInsertRowid });
  }
);

app.patch(
  '/api/admin/meals/:id',
  requireCsrfHeader,
  requireRole(['owner', 'food_manager']),
  (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { active } = req.body as { active?: boolean };
    if (typeof active === 'boolean') {
      db.prepare('UPDATE meals SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
    }
    res.json({ ok: true });
  }
);

// گزارش‌های صبحانه و خروجی اکسل (CSV با UTF-8 BOM)
app.get('/api/admin/reports/breakfast', requireRole(['owner', 'food_manager']), (_req, res) => {
  const meals = (db.prepare('SELECT * FROM meals ORDER BY id ASC').all() as Record<string, unknown>[]).map((m) => {
    const stats = getMealStats(m.id as number);
    const unclaimed = db
      .prepare(
        `SELECT s.id, s.first_name, s.last_name, s.note
         FROM students s
         WHERE s.active = 1
           AND NOT EXISTS (SELECT 1 FROM claims c WHERE c.student_id = s.id AND c.meal_id = ?)
         ORDER BY s.last_name ASC`
      )
      .all(m.id) as { id: number; first_name: string; last_name: string; note: string }[];
    return {
      id: m.id as number,
      name: m.name as string,
      dateJalali: m.date_jalali as string,
      claimed: stats.claimed,
      remaining: stats.remaining,
      total: stats.total,
      unclaimed: unclaimed.map((u) => ({
        id: u.id,
        fullName: `${u.first_name} ${u.last_name}`,
        note: u.note,
      })),
    };
  });

  const suspicious = db
    .prepare('SELECT * FROM suspicious_attempts ORDER BY id DESC LIMIT 50')
    .all();

  res.json({ meals, suspicious });
});

app.get('/api/admin/reports/breakfast.csv', requireRole(['owner', 'food_manager']), (req, res) => {
  const mealId = Number(req.query.mealId || 1);
  const rows = db
    .prepare(
      `SELECT s.first_name, s.last_name, s.note, c.claimed_at
       FROM students s
       LEFT JOIN claims c ON c.student_id = s.id AND c.meal_id = ?
       WHERE s.active = 1
       ORDER BY c.claimed_at DESC, s.last_name ASC`
    )
    .all(mealId) as { first_name: string; last_name: string; note: string; claimed_at: string | null }[];

  const header = 'نام,نام‌خانوادگی,توضیحات,وضعیت دریافت,زمان ثبت\n';
  const body = rows
    .map(
      (r) =>
        `"${r.first_name}","${r.last_name}","${r.note}","${r.claimed_at ? 'دریافت کرده' : 'دریافت نکرده'}","${r.claimed_at || '-'}"`
    )
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="breakfast-report-meal-${mealId}.csv"`);
  res.send('\uFEFF' + header + body);
});

// مدیریت محتوا: FAQ، اطلاعیه‌ها، خوابگاه‌ها، کانون‌ها، برنامه‌های هیئت، سوالات
app.get('/api/admin/faqs', requireRole(['owner', 'editor']), (_req, res) => {
  res.json(
    (db.prepare('SELECT * FROM faqs ORDER BY id DESC').all() as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      category: r.category,
      question: r.question,
      answer: r.answer,
      helpfulYes: r.helpful_yes,
      helpfulNo: r.helpful_no,
      published: Boolean(r.published),
      isDemo: Boolean(r.is_demo),
    }))
  );
});

app.post('/api/admin/faqs', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  const { category, question, answer, published = true } = req.body;
  if (!category || !question || !answer) {
    res.status(400).json({ error: 'همه فیلدهای سوال متداول الزامی است.' });
    return;
  }
  const info = db
    .prepare('INSERT INTO faqs (category, question, answer, published, is_demo) VALUES (?, ?, ?, ?, 0)')
    .run(category, question, answer, published ? 1 : 0);
  clearPublicCache();
  logAudit(req.adminUser!.username, 'ADD_FAQ', question.slice(0, 60), getClientIp(req));
  res.status(201).json({ id: info.lastInsertRowid });
});

app.delete('/api/admin/faqs/:id', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM faqs WHERE id = ?').run(Number(req.params.id));
  clearPublicCache();
  res.json({ ok: true });
});

app.get('/api/admin/announcements', requireRole(['owner', 'editor']), (_req, res) => {
  res.json(
    (db.prepare('SELECT * FROM announcements ORDER BY id DESC').all() as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      body: r.body,
      category: r.category,
      dateJalali: r.date_jalali,
      eventTime: r.event_time,
      location: r.location,
      pinned: Boolean(r.pinned),
      published: Boolean(r.published),
      isDemo: Boolean(r.is_demo),
    }))
  );
});

app.post('/api/admin/announcements', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  const { title, summary, body, category = 'عمومی', dateJalali, eventTime = '', location = '', pinned = false, published = true } = req.body;
  if (!title || !summary) {
    res.status(400).json({ error: 'عنوان و خلاصه اطلاعیه الزامی است.' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO announcements (title, summary, body, category, date_jalali, event_date_iso, event_time, location, pinned, published, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      title,
      summary,
      body || summary,
      category,
      dateJalali || '۱۴۰۵/۰۷/۰۱',
      new Date().toISOString(),
      eventTime,
      location,
      pinned ? 1 : 0,
      published ? 1 : 0
    );
  clearPublicCache();
  logAudit(req.adminUser!.username, 'ADD_ANNOUNCEMENT', title.slice(0, 60), getClientIp(req));
  res.status(201).json({ id: info.lastInsertRowid });
});

app.delete('/api/admin/announcements/:id', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(Number(req.params.id));
  clearPublicCache();
  res.json({ ok: true });
});

app.get('/api/admin/questions', requireRole(['owner', 'editor']), (_req, res) => {
  res.json(
    (db.prepare('SELECT * FROM questions ORDER BY id DESC').all() as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      senderName: r.sender_name,
      category: r.category,
      question: r.question,
      answer: r.answer,
      status: r.status,
      createdAt: r.created_at,
    }))
  );
});

app.put('/api/admin/questions/:id', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { answer, publishToFaq } = req.body as { answer: string; publishToFaq?: boolean };
  const qRow = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as
    | { category: string; question: string }
    | undefined;
  if (!qRow) {
    res.status(404).json({ error: 'سوال یافت نشد.' });
    return;
  }
  const status = publishToFaq ? 'published_faq' : 'answered';
  db.prepare('UPDATE questions SET answer = ?, status = ? WHERE id = ?').run(answer || '', status, id);
  if (publishToFaq && answer?.trim()) {
    db.prepare(
      'INSERT INTO faqs (category, question, answer, published, is_demo) VALUES (?, ?, ?, 1, 0)'
    ).run(qRow.category, qRow.question, answer.trim());
    clearPublicCache();
  }
  logAudit(req.adminUser!.username, 'ANSWER_QUESTION', `پاسخ به سوال #${id}`, getClientIp(req));
  res.json({ ok: true });
});

app.get('/api/admin/dorms', requireRole(['owner', 'editor']), (_req, res) => {
  res.json((db.prepare('SELECT * FROM dorms ORDER BY id DESC').all() as Record<string, unknown>[]).map(mapDormRow));
});

app.post('/api/admin/dorms', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  const d = req.body;
  if (!d.name || !d.gender) {
    res.status(400).json({ error: 'نام و نوع خوابگاه الزامی است.' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO dorms (name, gender, address, distance_to_campus, neshan_url, balad_url, monthly_fee, capacity, room_type, curfew_hours, supervisor_phone, facilities_json, rules_json, required_docs_json, gallery_json, faq_json, published, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`
    )
    .run(
      d.name,
      d.gender,
      d.address || '[نیاز به تکمیل]',
      d.distanceToCampus || '[نیاز به تکمیل]',
      d.neshanUrl || 'https://neshan.org/maps',
      d.baladUrl || 'https://balad.ir',
      d.monthlyFee || '[نیاز به تکمیل]',
      d.capacity || '[نیاز به تکمیل]',
      d.roomType || '[نیاز به تکمیل]',
      d.curfewHours || '[نیاز به تکمیل]',
      d.supervisorPhone || '[نیاز به تکمیل]',
      JSON.stringify(d.facilities || []),
      JSON.stringify(d.rules || []),
      JSON.stringify(d.requiredDocs || []),
      JSON.stringify(d.gallery || []),
      JSON.stringify(d.faq || [])
    );
  clearPublicCache();
  logAudit(req.adminUser!.username, 'ADD_DORM', d.name, getClientIp(req));
  res.status(201).json({ id: info.lastInsertRowid });
});

app.delete('/api/admin/dorms/:id', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM dorms WHERE id = ?').run(Number(req.params.id));
  clearPublicCache();
  res.json({ ok: true });
});

app.post('/api/admin/cadres', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  const c = req.body;
  if (!c.name || !c.shortDesc) {
    res.status(400).json({ error: 'نام و توضیح کوتاه کانون الزامی است.' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO cadres (name, category, short_desc, full_desc, lead_name, meeting_schedule, join_link, contact_info, highlights_json, tags_json, image_url, pdf_page, published, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`
    )
    .run(
      c.name,
      c.category || 'فرهنگی',
      c.shortDesc,
      c.fullDesc || c.shortDesc,
      c.leadName || '[نیاز به تکمیل]',
      c.meetingSchedule || '[نیاز به تکمیل]',
      c.joinLink || '',
      c.contactInfo || '[نیاز به تکمیل]',
      JSON.stringify(c.highlights || []),
      JSON.stringify(c.tags || []),
      c.imageUrl || '',
      Number(c.pdfPage || 1)
    );
  clearPublicCache();
  logAudit(req.adminUser!.username, 'ADD_CADRE', c.name, getClientIp(req));
  res.status(201).json({ id: info.lastInsertRowid });
});

app.delete('/api/admin/cadres/:id', requireCsrfHeader, requireRole(['owner', 'editor']), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM cadres WHERE id = ?').run(Number(req.params.id));
  clearPublicCache();
  res.json({ ok: true });
});

app.get('/api/admin/overview', requireRole(['owner', 'editor', 'food_manager']), (_req, res) => {
  const auditLogs = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 40').all();
  const surveys = db.prepare('SELECT * FROM surveys ORDER BY id DESC LIMIT 30').all();
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 30').all();
  const demoCounts = {
    students: (db.prepare('SELECT COUNT(*) as c FROM students WHERE is_demo = 1').get() as { c: number }).c,
    faqs: (db.prepare('SELECT COUNT(*) as c FROM faqs WHERE is_demo = 1').get() as { c: number }).c,
    dorms: (db.prepare('SELECT COUNT(*) as c FROM dorms WHERE is_demo = 1').get() as { c: number }).c,
    cadres: (db.prepare('SELECT COUNT(*) as c FROM cadres WHERE is_demo = 1').get() as { c: number }).c,
    announcements: (db.prepare('SELECT COUNT(*) as c FROM announcements WHERE is_demo = 1').get() as { c: number }).c,
  };
  res.json({ auditLogs, surveys, messages, demoCounts });
});

// حذف یکجای تمام داده‌های نمونه (بخش ۱۲ سند مشخصات)
app.post('/api/admin/clear-demo', requireCsrfHeader, requireRole(['owner']), (req: AuthedRequest, res) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM students WHERE is_demo = 1').run();
    db.prepare('DELETE FROM faqs WHERE is_demo = 1').run();
    db.prepare('DELETE FROM announcements WHERE is_demo = 1').run();
    db.prepare('DELETE FROM dorms WHERE is_demo = 1').run();
    db.prepare('DELETE FROM cadres WHERE is_demo = 1').run();
    db.prepare('DELETE FROM heyat_programs WHERE is_demo = 1').run();
  });
  tx();
  clearPublicCache();
  logAudit(req.adminUser!.username, 'CLEAR_DEMO_DATA', 'حذف یکجای تمام داده‌های نمونه', getClientIp(req));
  res.json({ ok: true });
});

// توکن موقت ۵ دقیقه‌ای جهت دانلود مستقیم و بدون خطای فایل آفلاین HTML (حتی داخل iframe و مرورگر موبایل)
interface OfflineExportTokenEntry {
  html: string;
  filename: string;
  sizeBytes: number;
  expiresAt: number;
}
const offlineExportTokens = new Map<string, OfflineExportTokenEntry>();

function pruneOfflineExportTokens() {
  const now = Date.now();
  for (const [k, v] of offlineExportTokens.entries()) {
    if (v.expiresAt <= now) offlineExportTokens.delete(k);
  }
  while (offlineExportTokens.size > 40) {
    const oldest = offlineExportTokens.keys().next().value;
    if (!oldest) break;
    offlineExportTokens.delete(oldest);
  }
}

function generateOfflineExportBundle(exportedBy: string) {
  const snapshot = collectOfflineSnapshot(db, getSettings(), uploadsDir, exportedBy);
  const html = buildOfflinePortalHtml(snapshot);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `gonabad-portal-offline-${stamp}.html`;
  const sizeBytes = Buffer.byteLength(html, 'utf8');
  return { html, filename, sizeBytes };
}

app.post(
  '/api/admin/export-offline-token',
  requireCsrfHeader,
  requireRole(['owner', 'editor', 'food_manager']),
  (req: AuthedRequest, res) => {
    try {
      pruneOfflineExportTokens();
      const bundle = generateOfflineExportBundle(
        req.adminUser!.displayName || req.adminUser!.username
      );
      const token = crypto.randomBytes(24).toString('hex');
      offlineExportTokens.set(token, {
        ...bundle,
        expiresAt: Date.now() + 15 * 60 * 1000, // اعتبار ۱۵ دقیقه‌ای
      });

      logAudit(
        req.adminUser!.username,
        'EXPORT_OFFLINE_HTML',
        `تولید لینک مستقیم نسخه آفلاین HTML (${Math.round(bundle.sizeBytes / 1024)} KB)`,
        getClientIp(req)
      );

      res.json({
        token,
        filename: bundle.filename,
        sizeKb: Math.max(1, Math.round(bundle.sizeBytes / 1024)),
        downloadUrl: `/downloads/offline/${token}?dl=1`,
        previewUrl: `/downloads/offline/${token}?preview=1`,
      });
    } catch (err) {
      console.error('Offline HTML export token creation failed:', err);
      res.status(500).json({ error: 'خطا در تولید خروجی آفلاین HTML.' });
    }
  }
);

const serveOfflineExportToken = (req: express.Request, res: express.Response) => {
  pruneOfflineExportTokens();
  const token = String(req.params.token || '');
  const entry = offlineExportTokens.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    res
      .status(404)
      .type('text/html; charset=utf-8')
      .send(
        '<!doctype html><html lang="fa" dir="rtl"><body style="font-family:Tahoma,sans-serif;background:#071714;color:#f4f1e8;padding:32px;text-align:center"><h2>لینک دانلود منقضی شده است</h2><p>لطفاً دوباره از پنل ادمین روی «دانلود فایل HTML کاملاً آفلاین» بزنید.</p></body></html>'
      );
    return;
  }

  const isPreview = req.query.preview === '1';
  res.removeHeader('X-Download-Options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (isPreview) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${entry.filename}"`);
  } else {
    // application/octet-stream باعث می‌شود مرورگر موبایل و دسکتاپ همیشه فایل را ذخیره کند
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${entry.filename}"`);
  }
  res.send(Buffer.from(entry.html, 'utf8'));
};

app.get('/downloads/offline/:token', serveOfflineExportToken);
app.get('/api/public/offline-export/:token', serveOfflineExportToken);

// خروجی یکپارچه و کاملاً آفلاین HTML برای اشتراک‌گذاری و بازبینی تیم (بدون اطلاعات محرمانه دانشجویان)
app.get(
  '/api/admin/export-offline-html',
  requireRole(['owner', 'editor', 'food_manager']),
  (req: AuthedRequest, res) => {
    try {
      const bundle = generateOfflineExportBundle(
        req.adminUser!.displayName || req.adminUser!.username
      );

      logAudit(
        req.adminUser!.username,
        'EXPORT_OFFLINE_HTML',
        `تولید نسخه آفلاین HTML برای بازبینی تیم (${Math.round(bundle.sizeBytes / 1024)} KB)`,
        getClientIp(req)
      );

      res.removeHeader('X-Download-Options');
      res.setHeader(
        'Content-Type',
        req.query.dl === '1' ? 'application/octet-stream' : 'text/html; charset=utf-8'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${bundle.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.send(Buffer.from(bundle.html, 'utf8'));
    } catch (err) {
      console.error('Offline HTML export failed:', err);
      res.status(500).json({ error: 'خطا در تولید خروجی آفلاین HTML.' });
    }
  }
);

// ==========================================
// 6. FRONTEND SERVING (VITE DEV OR PROD DIST)
// ==========================================

async function start() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: hmrDisabled ? false : true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Gonabad Orientation Portal running on http://0.0.0.0:${PORT}`);
  });
}

start();
