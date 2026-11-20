import type { OnsiteRegistrationStep } from '../data/orientation';

/**
 * تعیین شماره گام فعال بر اساس زمان فعلی ویدیوی راهنمای ثبت‌نام
 *
 * - پیش از رسیدن ویدیو به زمان شروع گام ۱ (ثانیه ۶)، گام ۰ (بسیج دانشجویی) فعال می‌ماند.
 * - به محض ورود ویدیو به بازه هر گام (مثلاً ثانیه ۳۳ تا ۴۱ برای گام ۵)، همان گام برگردانده می‌شود.
 * - با تلرانس ۰.۱۵ ثانیه تا پس از کلیک روی هر گام و پرش دقیق ویدیو، همان گام فوراً طلایی شود.
 */
export function resolveActiveOnsiteStep(
  currentTimeSec: number,
  steps: ReadonlyArray<Pick<OnsiteRegistrationStep, 'stepNumber' | 'videoSec'>>
): number {
  if (!Number.isFinite(currentTimeSec) || currentTimeSec < 0) {
    return 0;
  }

  const timedSteps = steps
    .filter((s): s is { stepNumber: number; videoSec: number } => typeof s.videoSec === 'number')
    .sort((a, b) => a.videoSec - b.videoSec);

  if (timedSteps.length === 0) return 0;

  const SEEK_TOLERANCE_SEC = 0.15;
  let active = 0;

  for (const step of timedSteps) {
    if (currentTimeSec + SEEK_TOLERANCE_SEC >= step.videoSec) {
      active = step.stepNumber;
    } else {
      break;
    }
  }

  return active;
}
