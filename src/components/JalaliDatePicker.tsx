import React from 'react';
import { JALALI_MONTHS, getJalaliMonthLength } from '../utils/jalali';
import { toPersianDigits } from '../utils/persian';

interface JalaliDatePickerProps {
  value: string; // YYYY/MM/DD in English digits e.g. "1387/05/20"
  onChange: (val: string) => void;
  idPrefix?: string;
}

const YEARS = Array.from({ length: 28 }, (_, i) => 1392 - i); // 1392 down to 1365

/**
 * انتخاب‌گر تاریخ تولد شمسی (سال، ماه، روز) با محاسبه دقیق روزهای اسفند کبیسه
 */
export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  idPrefix = 'jalali',
}) => {
  const parts = (value || '1387/05/20').split('/');
  const year = Number(parts[0]) || 1387;
  const month = Number(parts[1]) || 1;
  const maxDay = getJalaliMonthLength(year, month);
  const day = Math.min(Number(parts[2]) || 1, maxDay);

  const emit = (y: number, m: number, d: number) => {
    const safeDay = Math.min(d, getJalaliMonthLength(y, m));
    onChange(
      `${y}/${String(m).padStart(2, '0')}/${String(safeDay).padStart(2, '0')}`
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div>
        <label htmlFor={`${idPrefix}-day`} className="block text-xs text-ink-muted mb-1">
          روز
        </label>
        <select
          id={`${idPrefix}-day`}
          value={day}
          onChange={(e) => emit(year, month, Number(e.target.value))}
          className="w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink tabular-nums"
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {toPersianDigits(d)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-month`} className="block text-xs text-ink-muted mb-1">
          ماه
        </label>
        <select
          id={`${idPrefix}-month`}
          value={month}
          onChange={(e) => emit(year, Number(e.target.value), day)}
          className="w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          {JALALI_MONTHS.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-year`} className="block text-xs text-ink-muted mb-1">
          سال تولد
        </label>
        <select
          id={`${idPrefix}-year`}
          value={year}
          onChange={(e) => emit(Number(e.target.value), month, day)}
          className="w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink tabular-nums"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {toPersianDigits(y)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
