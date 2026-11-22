export const firstDay = '0001-01-01';
export const lastDay = '9999-12-31';

export type DayRange = { min: string; max: string };

function utcDate(year: number, month: number, day = 1) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function dateFromDay(day: string) {
  return utcDate(Number(day.slice(0, 4)), Number(day.slice(5, 7)), Number(day.slice(8, 10)));
}

function toDay(date: Date) {
  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999
    ? date.toISOString().slice(0, 10)
    : undefined;
}

export function isDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toDay(dateFromDay(value)) === value;
}

export function inRange(day: string, range: DayRange) {
  return day >= range.min && day <= range.max;
}

export function clampDay(day: string, { min, max }: DayRange) {
  return day < min ? min : day > max ? max : day;
}

export function todayLocal() {
  const today = new Date();
  return toDay(utcDate(today.getFullYear(), today.getMonth() + 1, today.getDate())) ?? firstDay;
}

export function shiftDay(day: string, amount: number, range: DayRange) {
  const date = dateFromDay(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return clampDay(toDay(date) ?? (amount < 0 ? firstDay : lastDay), range);
}

export function changeMonth(day: string, year: number, month: number) {
  const end = utcDate(year, month + 1, 0);
  return toDay(utcDate(end.getUTCFullYear(), end.getUTCMonth() + 1, Math.min(Number(day.slice(8)), end.getUTCDate())));
}

export function monthOverlaps(year: number, month: number, { min, max }: DayRange) {
  const start = toDay(utcDate(year, month));
  const end = toDay(utcDate(year, month + 1, 0));
  return !!start && !!end && start <= max && end >= min;
}

export function monthRows(year: number, month: number) {
  const first = utcDate(year, month);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, column) =>
      toDay(utcDate(year, month, 1 - mondayOffset + week * 7 + column))));
}

export function dayLabel(day: string, format: Intl.DateTimeFormat) {
  return format.format(dateFromDay(day));
}
