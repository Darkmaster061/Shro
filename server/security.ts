import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { buildBirthHashInput } from '../src/utils/coupon';
import { toPersianDigits } from '../src/utils/persian';

const PLACEHOLDER_SECRETS = new Set([
  '',
  'change-this-to-a-long-random-64-char-secret-in-production',
  'change-this-to-another-long-random-secret-in-production',
  'dev-only-gonabad-coupon-pepper-change-in-prod',
  'dev-only-gonabad-session-secret-change-in-prod',
]);

const envCouponPepper = (process.env.COUPON_PEPPER || '').trim();
const envSessionSecret = (process.env.SESSION_SECRET || '').trim();

const COUPON_PEPPER = envCouponPepper || 'dev-only-gonabad-coupon-pepper-change-in-prod';
// در صورت تنظیم نبودن SESSION_SECRET در سرور، کلید تصادفی درون‌حافظه‌ای تولید می‌شود (بدون مقدار ثابت قابل حدس)
const SESSION_SECRET =
  envSessionSecret && !PLACEHOLDER_SECRETS.has(envSessionSecret)
    ? envSessionSecret
    : crypto.randomBytes(32).toString('hex');

export function getSecretHealth() {
  const weakCouponPepper = PLACEHOLDER_SECRETS.has(envCouponPepper) || envCouponPepper.length < 24;
  const weakSessionSecret = PLACEHOLDER_SECRETS.has(envSessionSecret) || envSessionSecret.length < 24;
  return { weakCouponPepper, weakSessionSecret };
}

/**
 * تولید هش غیرقابل بازگشت HMAC-SHA256 برای تاریخ تولد و هویت دانشجو
 * تاریخ تولد خام هرگز در پایگاه داده ذخیره نمی‌شود.
 */
export function computeBirthHash(
  firstName: string,
  lastName: string,
  birthJalali: string
): string | null {
  const canonical = buildBirthHashInput(firstName, lastName, birthJalali);
  if (!canonical) return null;
  return crypto
    .createHmac('sha256', COUPON_PEPPER)
    .update(canonical)
    .digest('hex');
}

/**
 * تولید کد ژتون ۱۲۸ بیتی تصادفی و غیرقابل حدس
 */
export function generateCouponCode(): string {
  return `GNB-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * کپچای خودمیزبان بدون وابستگی خارجی (معمای ریاضی کوتاه با توکن امضاشده HMAC)
 */
export function createSelfHostedCaptcha(): { token: string; question: string } {
  const a = crypto.randomInt(2, 12);
  const b = crypto.randomInt(1, 10);
  const answer = a + b;
  const expiresAt = Date.now() + 10 * 60 * 1000; // ۱۰ دقیقه
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${answer}.${expiresAt}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(`${expiresAt}.${nonce}.${sig}`).toString('base64url');
  return {
    token,
    question: `حاصل ${toPersianDigits(a)} + ${toPersianDigits(b)} چند می‌شود؟`,
  };
}

export function verifySelfHostedCaptcha(token: string, userAnswer: string): boolean {
  try {
    const decoded = Buffer.from(token || '', 'base64url').toString('utf8');
    const [expStr, nonce, sig] = decoded.split('.');
    const expiresAt = Number(expStr);
    if (!expiresAt || Date.now() > expiresAt || !nonce || !sig) return false;
    const normalizedAns = Number(
      String(userAnswer || '')
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .trim()
    );
    if (Number.isNaN(normalizedAns)) return false;
    const payload = `${normalizedAns}.${expiresAt}.${nonce}`;
    const expected = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * محدودکننده نرخ (Rate Limiter) درون‌حافظه‌ای با پاک‌سازی خودکار جهت جلوگیری از رشد بی‌رویه حافظه
 */
const rateBuckets = new Map<string, number[]>();
const MAX_RATE_BUCKETS = 2500;

function pruneRateBuckets(now: number, maxAgeMs: number) {
  for (const [k, list] of rateBuckets.entries()) {
    const kept = list.filter((ts) => now - ts < maxAgeMs);
    if (kept.length === 0) rateBuckets.delete(k);
    else rateBuckets.set(k, kept);
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (rateBuckets.size > MAX_RATE_BUCKETS) {
    pruneRateBuckets(now, Math.max(windowMs, 60 * 60 * 1000));
  }
  const existing = rateBuckets.get(key) || [];
  const valid = existing.filter((ts) => now - ts < windowMs);
  if (valid.length >= maxAttempts) {
    const oldest = valid[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateBuckets.set(key, valid);
    return { allowed: false, retryAfterSec };
  }
  valid.push(now);
  rateBuckets.set(key, valid);
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * اعتبارسنجی و پاک‌سازی URLهای قابل تنظیم توسط ادمین (جلوگیری از لینک‌های javascript: و data:)
 */
export function sanitizeSafeUrl(raw: unknown, allowRelative = true): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // مسدود کردن کاراکترهای کنترلی
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return '';

  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * خنثی‌سازی تزریق فرمول در خروجی CSV (جلوگیری از اجرای فرمول‌های ناخواسته در Excel)
 */
export function escapeCsvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * بررسی magic bytes واقعی فایل‌های آپلودی (جلوگیری از آپلود فایل‌های مخرب با پسوند جعلی)
 */
export function detectSafeFileType(
  buffer: Buffer,
  originalName: string
): { allowed: boolean; ext: string; mime: string } {
  if (buffer.length < 4) return { allowed: false, ext: '', mime: '' };

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { allowed: true, ext: '.png', mime: 'image/png' };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { allowed: true, ext: '.jpg', mime: 'image/jpeg' };
  }
  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { allowed: true, ext: '.webp', mime: 'image/webp' };
  }
  // PDF: %PDF-
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { allowed: true, ext: '.pdf', mime: 'application/pdf' };
  }
  // SVG سخت‌گیرانه (مسدودسازی اسکریپت، رویدادها، foreignObject، لینک‌های خطرناک و کدگذاری‌های فریبنده)
  if (originalName.toLowerCase().endsWith('.svg')) {
    const text = buffer.toString('utf8').trim();
    const hasSvg = text.startsWith('<svg') || text.startsWith('<?xml');
    const dangerous =
      /<script|<foreignObject|<iframe|<object|<embed|<set\b|<animate|\bon[a-z]+\s*=|javascript:|vbscript:|data\s*:\s*text\/html|xlink:href\s*=\s*["']?\s*(?!#)|&#/i.test(
        text
      );
    if (hasSvg && !dangerous) {
      return { allowed: true, ext: '.svg', mime: 'image/svg+xml' };
    }
  }
  return { allowed: false, ext: '', mime: '' };
}

/**
 * محافظت پایه CSRF روی درخواست‌های تغییر وضعیت پنل ادمین و اسکنر
 */
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const hdr = req.headers['x-requested-with'];
    if (hdr !== 'PortalClient') {
      res.status(403).json({ error: 'درخواست نامعتبر است (محافظت CSRF).' });
      return;
    }
  }
  next();
}
