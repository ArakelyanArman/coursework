// @ts-check
import { isValidIso, parseIso, toIso, toUtcDate, weekdayIndex } from './date.js';
import { getLanguage, getLocale, hasIntlLocale, localizeNumber, t } from './i18n.js';

/** @typedef {import('./date.js').IsoDate} IsoDate */
/** @typedef {'medium' | 'short' | 'long' | 'monthYear'} DateStyle */

/** @type {Record<DateStyle, Intl.DateTimeFormatOptions>} */
const DATE_STYLES = {
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  short: { month: 'short', day: 'numeric' },
  long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
};

const KNOWN_MONDAY = '2024-01-01';

const WEEKDAY_KEYS = {
  long: 'date.weekdaysLong',
  short: 'date.weekdaysShort',
  narrow: 'date.weekdaysNarrow',
};
const MONTH_KEYS = { long: 'date.monthsLong', short: 'date.monthsShort' };

/** @type {Map<string, Intl.DateTimeFormat>} */
const dateFormatters = new Map();

/**
 * @param {string} locale
 * @param {Intl.DateTimeFormatOptions} options
 */
function dateFormatter(locale, options) {
  const key = locale + JSON.stringify(options);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Used only when the browser has no Intl data for the current language.
 * @param {IsoDate} iso
 * @param {DateStyle} style
 */
function patternDate(iso, style) {
  const { year, month, day } = parseIso(iso);
  return t(`date.patterns.${style}`, {
    day,
    year,
    month: t(`date.monthsInDate.${month - 1}`),
    monthName: t(`date.monthsLong.${month - 1}`),
    monthShort: t(`date.monthsShort.${month - 1}`),
    weekday: t(`date.weekdaysLong.${weekdayIndex(iso)}`),
  });
}

/**
 * @param {IsoDate} iso
 * @param {DateStyle} [style]
 * @returns {string}
 */
export function formatDate(iso, style = 'medium') {
  if (!hasIntlLocale()) return patternDate(iso, style);
  return dateFormatter(getLocale(), DATE_STYLES[style]).format(toUtcDate(iso));
}

/**
 * @param {IsoDate} from
 * @param {IsoDate} to
 * @param {DateStyle} [style]
 * @returns {string}
 */
export function formatDateRange(from, to, style = 'medium') {
  if (!hasIntlLocale()) {
    const sameYear = parseIso(from).year === parseIso(to).year;
    const start = patternDate(from, style === 'medium' && sameYear ? 'short' : style);
    return t('date.patterns.range', { from: start, to: patternDate(to, style) });
  }
  return dateFormatter(getLocale(), DATE_STYLES[style]).formatRange(toUtcDate(from), toUtcDate(to));
}

/**
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  return localizeNumber(value, options);
}

/** @param {'long' | 'short' | 'narrow'} [width] @returns {string[]} Monday first. */
export function weekdayNames(width = 'short') {
  if (!hasIntlLocale()) {
    return Array.from({ length: 7 }, (_, index) => t(`${WEEKDAY_KEYS[width]}.${index}`));
  }
  const formatter = dateFormatter(getLocale(), { weekday: width });
  const { year, month, day } = parseIso(KNOWN_MONDAY);
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(toUtcDate(toIso(year, month, day + index))),
  );
}

/** @param {'long' | 'short'} [width] @returns {string[]} January first. */
export function monthNames(width = 'long') {
  if (!hasIntlLocale()) {
    return Array.from({ length: 12 }, (_, index) => t(`${MONTH_KEYS[width]}.${index}`));
  }
  const formatter = dateFormatter(getLocale(), { month: width });
  return Array.from({ length: 12 }, (_, index) =>
    formatter.format(toUtcDate(toIso(2024, index + 1, 1))),
  );
}

const EN_MONTHS = Array.from({ length: 12 }, (_, index) =>
  dateFormatter('en-US', { month: 'short' })
    .format(toUtcDate(toIso(2024, index + 1, 1)))
    .toLowerCase(),
);

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {IsoDate | null}
 */
function checked(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (/** @type {number} */ part, /** @type {number} */ width) =>
    String(part).padStart(width, '0');
  const iso = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  return isValidIso(iso) ? iso : null;
}

/**
 * English accepts "Mar 15, 2026", Armenian "15.03.2026"; both accept "2026-03-15".
 * @param {string} text
 * @param {'en' | 'hy'} [lang]
 * @returns {IsoDate | null}
 */
export function parseTypedDate(text, lang = getLanguage()) {
  const value = text.trim();
  if (isValidIso(value)) return value;

  if (lang === 'hy') {
    const match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(value);
    return match ? checked(Number(match[3]), Number(match[2]), Number(match[1])) : null;
  }

  const match = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(value);
  if (!match) return null;
  const month = EN_MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) + 1;
  return month > 0 ? checked(Number(match[3]), month, Number(match[2])) : null;
}

/**
 * The inverse of parseTypedDate.
 * @param {IsoDate} iso
 * @param {'en' | 'hy'} [lang]
 * @returns {string}
 */
export function formatTypedDate(iso, lang = getLanguage()) {
  if (lang === 'hy') {
    const { year, month, day } = parseIso(iso);
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }
  return dateFormatter('en-US', DATE_STYLES.medium).format(toUtcDate(iso));
}
