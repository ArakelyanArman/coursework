// @ts-check

/**
 * Calendar-date helpers. Booking dates are calendar dates stored as ISO strings
 * ("2026-10-15"), never timestamps. All arithmetic runs in UTC, so time zones
 * and daylight-saving changes cannot shift a date. Weeks start on Monday.
 *
 * @typedef {string} IsoDate A calendar date as "YYYY-MM-DD".
 */

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/**
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} day
 * @returns {Date} Midnight UTC. Out-of-range parts roll over, like Date does.
 */
function utcDate(year, month, day) {
  // setUTCFullYear, unlike Date.UTC, does not remap years 0–99 to 1900–1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/**
 * @param {Date} date
 * @returns {IsoDate}
 */
function fromUtc(date) {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Split an ISO date into numbers.
 * @param {IsoDate} iso
 * @returns {{ year: number, month: number, day: number }} `month` is 1–12.
 */
export function parseIso(iso) {
  const match = ISO_PATTERN.exec(iso);
  if (!match) throw new RangeError(`Not an ISO date: "${iso}"`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * The same calendar date as a Date at midnight UTC (for Intl with timeZone 'UTC').
 * @param {IsoDate} iso
 * @returns {Date}
 */
export function toUtcDate(iso) {
  const { year, month, day } = parseIso(iso);
  return utcDate(year, month, day);
}

/**
 * Build an ISO date. Out-of-range parts roll over (month 13 → January next year).
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} day
 * @returns {IsoDate}
 */
export function toIso(year, month, day) {
  return fromUtc(utcDate(year, month, day));
}

/**
 * True for a real calendar date in "YYYY-MM-DD" form ("2026-02-30" is false).
 * @param {unknown} value
 * @returns {value is IsoDate}
 */
export function isValidIso(value) {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value)) return false;
  const { year, month, day } = parseIso(value);
  return toIso(year, month, day) === value;
}

/**
 * Today in the user's own time zone.
 * @param {Date} [now]
 * @returns {IsoDate}
 */
export function todayIso(now = new Date()) {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * @param {IsoDate} iso
 * @param {number} days May be negative.
 * @returns {IsoDate}
 */
export function addDays(iso, days) {
  const { year, month, day } = parseIso(iso);
  return toIso(year, month, day + days);
}

/**
 * @param {number} year
 * @param {number} month 1–12
 * @returns {number}
 */
export function daysInMonth(year, month) {
  return utcDate(year, month + 1, 0).getUTCDate();
}

/**
 * Move by whole months, clamping the day (Jan 31 + 1 month → Feb 28/29).
 * @param {IsoDate} iso
 * @param {number} months May be negative.
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
 * Whole days from `from` to `to` (negative when `to` is earlier).
 * @param {IsoDate} from
 * @param {IsoDate} to
 * @returns {number}
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
 * True when `iso` is within `from`…`to`, both ends included.
 * @param {IsoDate} iso
 * @param {IsoDate} from
 * @param {IsoDate} to
 */
export const isBetween = (iso, from, to) => compare(iso, from) >= 0 && compare(iso, to) <= 0;

/**
 * Day of the week with Monday first.
 * @param {IsoDate} iso
 * @returns {number} 0 = Monday … 6 = Sunday.
 */
export function weekdayIndex(iso) {
  return (toUtcDate(iso).getUTCDay() + 6) % 7;
}

/**
 * @param {IsoDate} iso
 * @returns {IsoDate} The Monday of that week.
 */
export function startOfWeek(iso) {
  return addDays(iso, -weekdayIndex(iso));
}

/**
 * @param {IsoDate} iso
 * @returns {IsoDate} The Sunday of that week.
 */
export function endOfWeek(iso) {
  return addDays(iso, 6 - weekdayIndex(iso));
}

/**
 * @param {IsoDate} iso
 * @returns {IsoDate}
 */
export function startOfMonth(iso) {
  const { year, month } = parseIso(iso);
  return toIso(year, month, 1);
}

/**
 * @param {IsoDate} iso
 * @returns {IsoDate}
 */
export function endOfMonth(iso) {
  const { year, month } = parseIso(iso);
  return toIso(year, month, daysInMonth(year, month));
}

/**
 * Every date from `from` to `to`, both ends included.
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
 * Weeks for a month view, Monday first. Days from the neighbouring months fill
 * the first and last week and are flagged with `inMonth: false`.
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
