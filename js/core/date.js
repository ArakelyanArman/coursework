// @ts-check

/**
 * Calendar dates as "YYYY-MM-DD" strings, never timestamps. Arithmetic runs in UTC so
 * time zones and daylight saving cannot shift a date. Weeks start on Monday.
 * @typedef {string} IsoDate
 */

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/**
 * @param {number} year
 * @param {number} month 1–12; out-of-range parts roll over.
 * @param {number} day
 */
function utcDate(year, month, day) {
  // setUTCFullYear, unlike Date.UTC, does not remap years 0–99 to 1900–1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/** @param {Date} date @returns {IsoDate} */
function fromUtc(date) {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @param {IsoDate} iso @returns {{ year: number, month: number, day: number }} month is 1–12. */
export function parseIso(iso) {
  const match = ISO_PATTERN.exec(iso);
  if (!match) throw new RangeError(`Not an ISO date: "${iso}"`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** @param {IsoDate} iso @returns {Date} Midnight UTC, for Intl with timeZone 'UTC'. */
export function toUtcDate(iso) {
  const { year, month, day } = parseIso(iso);
  return utcDate(year, month, day);
}

/**
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} day
 * @returns {IsoDate}
 */
export function toIso(year, month, day) {
  return fromUtc(utcDate(year, month, day));
}

/** @param {unknown} value @returns {value is IsoDate} False for "2026-02-30". */
export function isValidIso(value) {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value)) return false;
  const { year, month, day } = parseIso(value);
  return toIso(year, month, day) === value;
}

/** @param {Date} [now] @returns {IsoDate} Today in the user's own time zone. */
export function todayIso(now = new Date()) {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * @param {IsoDate} iso
 * @param {number} days
 * @returns {IsoDate}
 */
export function addDays(iso, days) {
  const { year, month, day } = parseIso(iso);
  return toIso(year, month, day + days);
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function daysInMonth(year, month) {
  return utcDate(year, month + 1, 0).getUTCDate();
}

/**
 * Clamps the day: Jan 31 + 1 month → Feb 28/29.
 * @param {IsoDate} iso
 * @param {number} months
 * @returns {IsoDate}
 */
export function addMonths(iso, months) {
  const { year, month, day } = parseIso(iso);
  const first = utcDate(year, month + months, 1);
  const targetYear = first.getUTCFullYear();
  const targetMonth = first.getUTCMonth() + 1;
  return toIso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/**
 * @param {IsoDate} from
 * @param {IsoDate} to
 * @returns {number} Whole days; negative when `to` is earlier.
 */
export function diffDays(from, to) {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / MS_PER_DAY);
}

/**
 * @param {IsoDate} a
 * @param {IsoDate} b
 * @returns {-1 | 0 | 1}
 */
export function compare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * @param {IsoDate} a
 * @param {IsoDate} b
 */
export const isBefore = (a, b) => compare(a, b) < 0;

/**
 * @param {IsoDate} a
 * @param {IsoDate} b
 */
export const isAfter = (a, b) => compare(a, b) > 0;

/**
 * Both ends included.
 * @param {IsoDate} iso
 * @param {IsoDate} from
 * @param {IsoDate} to
 */
export const isBetween = (iso, from, to) => compare(iso, from) >= 0 && compare(iso, to) <= 0;

/** @param {IsoDate} iso @returns {number} 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso) {
  return (toUtcDate(iso).getUTCDay() + 6) % 7;
}

/** @param {IsoDate} iso @returns {IsoDate} */
export function startOfWeek(iso) {
  return addDays(iso, -weekdayIndex(iso));
}

/** @param {IsoDate} iso @returns {IsoDate} */
export function endOfWeek(iso) {
  return addDays(iso, 6 - weekdayIndex(iso));
}

/** @param {IsoDate} iso @returns {IsoDate} */
export function startOfMonth(iso) {
  const { year, month } = parseIso(iso);
  return toIso(year, month, 1);
}

/** @param {IsoDate} iso @returns {IsoDate} */
export function endOfMonth(iso) {
  const { year, month } = parseIso(iso);
  return toIso(year, month, daysInMonth(year, month));
}

/**
 * Both ends included.
 * @param {IsoDate} from
 * @param {IsoDate} to
 * @returns {IsoDate[]}
 */
export function eachDay(from, to) {
  /** @type {IsoDate[]} */
  const days = [];
  for (let day = from; compare(day, to) <= 0; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Weeks for a month view, Monday first, padded with days from the neighbouring months.
 * @param {number} year
 * @param {number} month 1–12
 * @returns {{ iso: IsoDate, inMonth: boolean }[][]}
 */
export function monthGrid(year, month) {
  const first = toIso(year, month, 1);
  const last = endOfMonth(first);
  const days = eachDay(startOfWeek(first), endOfWeek(last)).map((iso) => ({
    iso,
    inMonth: isBetween(iso, first, last),
  }));

  /** @type {{ iso: IsoDate, inMonth: boolean }[][]} */
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
