const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * تبدیل ارقام انگلیسی و عربی به ارقام فارسی برای نمایش استاندارد
 */
export function toPersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
    .replace(/[٠-٩]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660]);
}

/**
 * تبدیل ارقام فارسی و عربی به ارقام انگلیسی برای پردازش و تاریخ
 */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * نرمال‌سازی متن فارسی: یکسان‌سازی ی/ي، ک/ك، حذف اعراب و نیم‌فاصله و فاصله‌های اضافه
 */
export function normalizePersian(input: string): string {
  return toEnglishDigits(input || '')
    .replace(/[يیىئ]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // حذف اعراب و کشیدگی
    .replace(/[\u200C\u200B\u200D]/g, ' ') // تبدیل نیم‌فاصله به فاصله
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * نرمال‌سازی فشرده برای مقایسه نام و نام‌خانوادگی در سیستم ژتون (بدون فاصله)
 */
export function normalizeNameCompact(input: string): string {
  return normalizePersian(input).replace(/\s+/g, '');
}

/**
 * محاسبه فاصله لونشتاین با محدودیت سقف برای سرعت بالا روی موبایل
 */
export function levenshteinDistance(a: string, b: string, maxDist = 3): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;

  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);
  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[lenB];
}

/**
 * امتیازدهی جستجوی فازی فارسی با تحمل غلط املایی و نیم‌فاصله
 */
export function fuzzyScorePersian(query: string, target: string): number {
  const normQuery = normalizePersian(query);
  const normTarget = normalizePersian(target);
  if (!normQuery) return 1;
  if (!normTarget) return 0;

  if (normTarget.includes(normQuery)) {
    return 100 - Math.min(20, normTarget.indexOf(normQuery));
  }

  const compactQuery = normQuery.replace(/\s+/g, '');
  const compactTarget = normTarget.replace(/\s+/g, '');
  if (compactQuery.length >= 3 && compactTarget.includes(compactQuery)) {
    return 88;
  }

  const qTokens = normQuery.split(' ').filter((t) => t.length >= 2);
  const tTokens = normTarget.split(' ').filter(Boolean);
  if (qTokens.length === 0) return 0;

  let matchedScore = 0;
  for (const qt of qTokens) {
    let bestTokenScore = 0;
    for (const tt of tTokens) {
      if (tt === qt) {
        bestTokenScore = Math.max(bestTokenScore, 1);
        break;
      }
      if (tt.includes(qt) || (qt.length >= 4 && qt.includes(tt) && tt.length >= 3)) {
        bestTokenScore = Math.max(bestTokenScore, 0.85);
        continue;
      }
      const allowedErr = qt.length >= 5 ? 2 : 1;
      const dist = levenshteinDistance(qt, tt, allowedErr);
      if (dist <= allowedErr) {
        bestTokenScore = Math.max(bestTokenScore, 1 - dist / Math.max(qt.length, tt.length));
      }
    }
    matchedScore += bestTokenScore;
  }

  const ratio = matchedScore / qTokens.length;
  return ratio >= 0.45 ? Math.round(ratio * 80) : 0;
}

export function searchFaqs<T extends { question: string; answer: string; category: string }>(
  items: T[],
  query: string,
  category?: string
): T[] {
  const filtered = category && category !== 'همه'
    ? items.filter((item) => item.category === category)
    : items;

  const trimmed = query.trim();
  if (!trimmed) return filtered;

  return filtered
    .map((item) => {
      const qScore = fuzzyScorePersian(trimmed, item.question) * 1.4;
      const aScore = fuzzyScorePersian(trimmed, item.answer) * 0.9;
      const cScore = fuzzyScorePersian(trimmed, item.category) * 0.6;
      return { item, score: Math.max(qScore, aScore, cScore) };
    })
    .filter((entry) => entry.score >= 32)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
