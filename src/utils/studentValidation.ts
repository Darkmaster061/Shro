import { toEnglishDigits } from './persian';

export const FRESHMAN_COHORT_PREFIX = '405';

export const COHORT_GROUP_OPTIONS = [
  'نوورود ۱۴۰۵',
  'انجمن علمی',
  'کانون / بسیج',
  'خادم هیئت',
  'سایر',
] as const;

export type CohortGroupOption = (typeof COHORT_GROUP_OPTIONS)[number];

/**
 * پاکسازی و تبدیل ارقام فارسی/عربی شماره دانشجویی به ارقام لاتین بدون فاصله یا خط تیره
 */
export function normalizeStudentNumber(raw: string): string {
  return toEnglishDigits(String(raw || '')).replace(/[\s\-_‌]+/g, '').trim();
}

/**
 * تشخیص ورودی ۱۴۰۵ بودن شماره دانشجویی (شروع با ۴۰۵)
 */
export function isFreshman405Number(raw: string): boolean {
  const clean = normalizeStudentNumber(raw);
  return /^\d{8,12}$/.test(clean) && clean.startsWith(FRESHMAN_COHORT_PREFIX);
}

/**
 * اعتبارسنجی شماره دانشجویی با پشتیبانی از محدودیت سخت‌گیرانه ۴۰۵ برای پنل اپراتور میز استقبال
 */
export function validateStudentNumber(
  raw: string,
  options: { require405?: boolean } = {}
): { valid: boolean; normalized: string; is405: boolean; error?: string } {
  const normalized = normalizeStudentNumber(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      is405: false,
      error: 'شماره دانشجویی را وارد کنید.',
    };
  }
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      is405: false,
      error: 'شماره دانشجویی فقط باید شامل اعداد باشد.',
    };
  }
  if (normalized.length < 8 || normalized.length > 12) {
    return {
      valid: false,
      normalized,
      is405: false,
      error: 'شماره دانشجویی معتبر باید بین ۸ تا ۱۲ رقم باشد (مثلاً ۴۰۵۱۲۳۲۱۷۳).',
    };
  }
  const is405 = normalized.startsWith(FRESHMAN_COHORT_PREFIX);
  if (options.require405 && !is405) {
    return {
      valid: false,
      normalized,
      is405: false,
      error:
        'اپراتور میز استقبال فقط مجاز به ثبت شماره دانشجویی ورودی ۱۴۰۵ (شروع با ۴۰۵) است. برای سایر ورودی‌ها (انجمن و کانون) فقط مدیریت کل مجوز ثبت دارد.',
    };
  }
  return { valid: true, normalized, is405 };
}

/**
 * اعتبارسنجی رسمی کد ملی ۱۰ رقمی ایران (بررسی طول، عدم تکرار یکنواخت و رقم کنترل Mod-11)
 */
export function validateIranianNationalId(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = toEnglishDigits(String(raw || '')).replace(/[\s\-_]+/g, '').trim();
  if (!/^\d{10}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'کد ملی باید دقیقاً ۱۰ رقم باشد.',
    };
  }
  // رد کردن کدهای تکراری مثل 0000000000 یا 1111111111
  if (/^(\d)\1{9}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'کد ملی واردشده معتبر نیست.',
    };
  }
  const check = Number(normalized[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(normalized[i]) * (10 - i);
  }
  const remainder = sum % 11;
  const expected = remainder < 2 ? remainder : 11 - remainder;
  if (check !== expected) {
    return {
      valid: false,
      normalized,
      error: 'رقم کنترل کد ملی صحیح نیست؛ لطفاً کد ملی ۱۰ رقمی خود را با دقت بررسی کنید.',
    };
  }
  return { valid: true, normalized };
}

/**
 * اعتبارسنجی و نرمال‌سازی شماره همراه ایران (پشتیبانی از +98، 0098، 98 و ارقام فارسی)
 */
export function validateIranianMobile(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  let digits = toEnglishDigits(String(raw || '')).replace(/[\s\-()_+]+/g, '').trim();
  if (digits.startsWith('0098')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('98') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('9') && digits.length === 10) {
    digits = '0' + digits;
  }

  if (!/^09\d{9}$/.test(digits)) {
    return {
      valid: false,
      normalized: digits,
      error: 'شماره تماس معتبر ایران وارد کنید (۱۱ رقم با شروع ۰۹، مثلاً ۰۹۱۵۱۲۳۴۵۶۷).',
    };
  }
  return { valid: true, normalized: digits };
}

/**
 * ماسک کردن کد ملی یا موبایل برای نمایش‌های غیرمدیریتی در صورت نیاز
 */
export function maskSensitiveCode(raw: string): string {
  const clean = toEnglishDigits(String(raw || '')).trim();
  if (clean.length < 6) return '***';
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}
