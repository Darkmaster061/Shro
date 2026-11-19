import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { buildBirthHashInput } from '../src/utils/coupon';
import { toPersianDigits } from '../src/utils/persian';

const COUPON_PEPPER =
  process.env.COUPON_PEPPER || 'dev-only-gonabad-coupon-pepper-change-in-prod';
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev-only-gonabad-session-secret-change-in-prod';

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
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * محدودکننده نرخ (Rate Limiter) درون‌حافظه‌ای برای جلوگیری از حدس لیست و حملات Brute-force
 */
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
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
  // SVG (پاک‌سازی اسکریپت‌های احتمالی)
  if (originalName.toLowerCase().endsWith('.svg')) {
    const text = buffer.toString('utf8').trim();
    const hasSvg = text.startsWith('<svg') || text.startsWith('<?xml');
    const dangerous = /<script|on\w+\s*=|javascript:/i.test(text);
    if (hasSvg && !dangerous) {
      return { allowed: true, ext: '.svg', mime: 'image/svg+xml' };
    }
  }
  return { allowed: false, ext: '', mime: '' };
}

/**
 * محافظت پایه CSRF روی درخواست‌های تغییر وضعیت پنل ادمین
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
