// @ts-check
import { isValidIso, parseIso, toIso, toUtcDate, weekdayIndex } from './date.js';
import { getLanguage, getLocale, hasIntlLocale, localizeNumber, t } from './i18n.js';

/** @typedef {import('./date.js').IsoDate} IsoDate */
/** @typedef {'medium' | 'short' | 'long' | 'monthYear'} DateStyle */

/** @type {Record<DateStyle, Intl.DateTimeFormatOptions>} */
const DATE_STYLES = {
  medium: { month: 'short', day: 'numeric', year: 'numeric' }, // Mar 15, 2026
  short: { month: 'short', day: 'numeric' }, // Mar 15
  long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, // for aria-labels
  monthYear: { month: 'long', year: 'numeric' }, // calendar heading
};

/** A Monday, used to generate weekday names in Monday-first order. */
const KNOWN_MONDAY = '2024-01-01';

/** Translation arrays used when the browser has no Intl data for the language. */
const WEEKDAY_KEYS = { long: 'date.weekdaysLong', short: 'date.weekdaysShort', narrow: 'date.weekdaysNarrow' };
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
    // Calendar dates are held as UTC midnights, so they are formatted in UTC too.
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Format a date from the patterns in translations.json. Only used when the
 * browser has no Intl data for the current language (see hasIntlLocale).
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
 * Format a calendar date for the current language.
 * @param {IsoDate} iso
 * @param {DateStyle} [style]
 * @returns {string} e.g. "Mar 15, 2026" in English.
 */
export function formatDate(iso, style = 'medium') {
  if (!hasIntlLocale()) return patternDate(iso, style);
  return dateFormatter(getLocale(), DATE_STYLES[style]).format(toUtcDate(iso));
}

/**
 * Format a date range for the current language, e.g. "Mar 15 – 22, 2026".
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
 * Format a number for the current language.
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  return localizeNumber(value, options);
}

/**
 * Weekday names for the current language, Monday first.
 * @param {'long' | 'short' | 'narrow'} [width]
 * @returns {string[]} Seven names.
 */
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

/**
 * Month names for the current language, January first.
 * @param {'long' | 'short'} [width]
 * @returns {string[]} Twelve names.
 */
export function monthNames(width = 'long') {
  if (!hasIntlLocale()) {
    return Array.from({ length: 12 }, (_, index) => t(`${MONTH_KEYS[width]}.${index}`));
  }
  const formatter = dateFormatter(getLocale(), { month: width });
  return Array.from({ length: 12 }, (_, index) =>
    formatter.format(toUtcDate(toIso(2024, index + 1, 1))),
  );
}

/** English short month names, lower-cased: the "MMM" of the typed date format. */
const EN_MONTHS = Array.from({ length: 12 }, (_, index) =>
  dateFormatter('en-US', { month: 'short' })
    .format(toUtcDate(toIso(2024, index + 1, 1)))
    .toLowerCase(),
);

/**
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} day
 * @returns {IsoDate | null} Null unless it is a real calendar date.
 */
function checked(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (/** @type {number} */ part, /** @type {number} */ width) =>
    String(part).padStart(width, '0');
  const iso = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  return isValidIso(iso) ? iso : null;
}

/**
 * Parse a date typed by the user.
 * English accepts "MMM d, yyyy" (Mar 15, 2026); Armenian accepts "DD.MM.YYYY"
 * (15.03.2026). Both accept ISO "YYYY-MM-DD".
 * @param {string} text
 * @param {'en' | 'hy'} [lang]
 * @returns {IsoDate | null} Null when the text is not a valid date.
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
 * Format a date the way it should be typed, so the text parses back with
 * {@link parseTypedDate}: "Mar 15, 2026" in English, "15.03.2026" in Armenian.
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
