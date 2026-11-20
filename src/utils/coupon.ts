import type { CsvPreviewRow } from '../types/portal';
import { normalizeNameCompact } from './persian';
import { parseAndValidateJalaliDate } from './jalali';

/**
 * ساخت رشته استاندارد برای محاسبه HMAC-SHA256 تاریخ تولد و هویت
 * ترتیب ثابت: نام_نرمال|نام_خانوادگی_نرمال|YYYY/MM/DD
 */
export function buildBirthHashInput(
  firstName: string,
  lastName: string,
  birthJalali: string
): string | null {
  const fNorm = normalizeNameCompact(firstName);
  const lNorm = normalizeNameCompact(lastName);
  const dateCheck = parseAndValidateJalaliDate(birthJalali);
  if (!fNorm || !lNorm || !dateCheck.valid) return null;
  return `${fNorm}|${lNorm}|${dateCheck.normalized}`;
}

/**
 * پارس کردن فایل CSV لیست نوورودی‌ها با پیش‌نمایش خطاها و تشخیص ردیف‌های تکراری
 * ستون‌ها: نام, نام‌خانوادگی, تاریخ تولد شمسی, یادداشت (اختیاری)
 */
export function parseStudentsCsv(csvText: string): {
  rows: CsvPreviewRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
} {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return { rows: [], validCount: 0, errorCount: 0, duplicateCount: 0 };
  }

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: CsvPreviewRow[] = [];
  const seenKeys = new Set<string>();

  lines.forEach((line, index) => {
    const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
    const cols = line
      .split(delimiter)
      .map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim());

    // رد کردن سطر عنوان ستون‌ها در صورت وجود
    if (
      index === 0 &&
      (cols[0]?.includes('نام') || cols[0]?.toLowerCase() === 'first_name')
    ) {
      return;
    }

    const firstName = cols[0] || '';
    const lastName = cols[1] || '';
    const birthRaw = cols[2] || '';
    const note = cols[3] || '';

    const dateCheck = parseAndValidateJalaliDate(birthRaw);
    let error: string | undefined;

    if (!firstName || !lastName) {
      error = 'نام و نام‌خانوادگی الزامی است';
    } else if (!dateCheck.valid) {
      error = 'فرمت تاریخ تولد شمسی نامعتبر است (نمونه: ۱۳۸۷/۰۵/۲۰)';
    }

    const key = dateCheck.valid
      ? `${normalizeNameCompact(firstName)}|${normalizeNameCompact(lastName)}|${dateCheck.normalized}`
      : '';

    const duplicate = Boolean(key && seenKeys.has(key));
    if (key) seenKeys.add(key);

    if (duplicate && !error) {
      error = 'ردیف تکراری در فایل ورودی';
    }

    rows.push({
      rowNumber: index + 1,
      firstName,
      lastName,
      birthJalali: dateCheck.valid ? dateCheck.normalized : birthRaw,
      note,
      valid: !error && !duplicate,
      error,
      duplicate,
    });
  });

  const validCount = rows.filter((r) => r.valid).length;
  const duplicateCount = rows.filter((r) => r.duplicate).length;
  const errorCount = rows.filter((r) => !r.valid && !r.duplicate).length;

  return { rows, validCount, errorCount, duplicateCount };
}

/**
 * سیاست حل تضاد همگام‌سازی آفلاین اسکنر (در کل روزهای ثبت‌نام، نه فقط یک روز):
 * اولین ثبت معتبر است و هر ثبت بعدی در همان روز یا روزهای دیگر رد می‌شود.
 */
export function resolveOfflineClaimConflict(
  existingClaimIso: string | null,
  incomingClaimIso: string
): { accepted: boolean; winnerIso: string } {
  if (!existingClaimIso) {
    return { accepted: true, winnerIso: incomingClaimIso };
  }
  const existingTs = new Date(existingClaimIso).getTime();
  const incomingTs = new Date(incomingClaimIso).getTime();
  if (!Number.isNaN(incomingTs) && !Number.isNaN(existingTs) && incomingTs < existingTs) {
    return { accepted: true, winnerIso: incomingClaimIso };
  }
  return { accepted: false, winnerIso: existingClaimIso };
}

/**
 * یافتن اولین دریافت ثبت‌شده برای دانشجو در بین تمام وعده‌ها و روزهای ثبت‌نام
 */
export function findStudentExistingClaim(
  claimedAtByMeal: Record<number, string> | undefined
): { mealId: number; claimedAtIso: string } | null {
  if (!claimedAtByMeal) return null;
  const entries = Object.entries(claimedAtByMeal)
    .map(([mealIdStr, claimedAtIso]) => ({
      mealId: Number(mealIdStr),
      claimedAtIso,
      ts: new Date(claimedAtIso).getTime(),
    }))
    .filter((e) => Number.isFinite(e.mealId) && Boolean(e.claimedAtIso));

  if (entries.length === 0) return null;
  entries.sort((a, b) => {
    const aTs = Number.isNaN(a.ts) ? Number.MAX_SAFE_INTEGER : a.ts;
    const bTs = Number.isNaN(b.ts) ? Number.MAX_SAFE_INTEGER : b.ts;
    return aTs - bTs;
  });
  return { mealId: entries[0].mealId, claimedAtIso: entries[0].claimedAtIso };
}

/**
 * بررسی مجاز بودن دریافت صبحانه با قانون قطعی:
 * هر دانشجو در کل روزهای ثبت‌نام فقط یک نوبت (در روز ثبت‌نام خود) مجاز به دریافت صبحانه است.
 */
export function checkSingleBreakfastEligibility(
  claimedAtByMeal: Record<number, string> | undefined,
  targetMealId: number
): {
  allowed: boolean;
  reason: 'eligible' | 'already_claimed_same_meal' | 'already_claimed_other_day';
  existingMealId?: number;
  existingClaimedAtIso?: string;
} {
  const existing = findStudentExistingClaim(claimedAtByMeal);
  if (!existing) {
    return { allowed: true, reason: 'eligible' };
  }
  if (existing.mealId === targetMealId) {
    return {
      allowed: false,
      reason: 'already_claimed_same_meal',
      existingMealId: existing.mealId,
      existingClaimedAtIso: existing.claimedAtIso,
    };
  }
  return {
    allowed: false,
    reason: 'already_claimed_other_day',
    existingMealId: existing.mealId,
    existingClaimedAtIso: existing.claimedAtIso,
  };
}
