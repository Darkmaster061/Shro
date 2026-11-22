import {
  OFFICIAL_REGISTRATION_DAYS,
  type RegistrationDaySchedule,
} from '../data/orientation';
import { toPersianDigits } from './persian';

export interface FreshmanProfile {
  fullName: string;
  major: string;
}

export const FRESHMAN_PROFILE_STORAGE_KEY = 'gonabad_freshman_profile_1405';

export interface MajorOption {
  major: string;
  dayId: string;
  dayTitle: string;
  dateJalali: string;
  timeRange: string;
}

/**
 * فهرست کامل رشته‌های رسمی پذیرش ۱۴۰۵ مجتمع آموزش عالی گناباد همراه با روز مراجعه
 */
export const ALL_OFFICIAL_MAJORS: MajorOption[] = OFFICIAL_REGISTRATION_DAYS.flatMap((day) =>
  day.majors.map((major) => ({
    major,
    dayId: day.id,
    dayTitle: day.dayTitle,
    dateJalali: day.dateJalali,
    timeRange: day.timeRange,
  }))
);

/**
 * یافتن برنامه دقیق روز ثبت‌نام حضوری بر اساس نام رشته تحصیلی
 */
export function findRegistrationDayForMajor(major: string): RegistrationDaySchedule | null {
  const clean = (major || '').trim();
  if (!clean) return null;
  return (
    OFFICIAL_REGISTRATION_DAYS.find((d) =>
      d.majors.some((m) => m.trim() === clean)
    ) || null
  );
}

/**
 * تولید شماره یادگاری یکتا و قطعی برای کارت گذرنامه ورودی ۱۴۰۵ (کاملاً محلی در مرورگر)
 */
export function buildPassportSerial(fullName: string, major: string): string {
  const seed = `${(fullName || 'نوورودی').trim()}|${(major || 'گناباد').trim()}|1405`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const num = ((hash >>> 0) % 9000) + 1000;
  return `UOG-1405-${num}`;
}

export function formatPassportSerialPersian(fullName: string, major: string): string {
  return toPersianDigits(buildPassportSerial(fullName, major));
}

export function loadSavedFreshmanProfile(): FreshmanProfile | null {
  try {
    const raw = localStorage.getItem(FRESHMAN_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FreshmanProfile>;
    if (typeof parsed.major !== 'string' || !parsed.major.trim()) return null;
    return {
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName.trim().slice(0, 60) : '',
      major: parsed.major.trim().slice(0, 80),
    };
  } catch {
    return null;
  }
}

export function saveFreshmanProfile(profile: FreshmanProfile | null): void {
  try {
    if (!profile || !profile.major.trim()) {
      localStorage.removeItem(FRESHMAN_PROFILE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      FRESHMAN_PROFILE_STORAGE_KEY,
      JSON.stringify({
        fullName: profile.fullName.trim().slice(0, 60),
        major: profile.major.trim().slice(0, 80),
      })
    );
  } catch {
    // ignore storage errors
  }
}
