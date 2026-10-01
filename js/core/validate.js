// @ts-check
import { isValidIso } from './date.js';

/**
 * Rules return i18n keys, never sentences: the UI shows t(error.key, error.params).
 * @typedef {{ key: string, params?: Record<string, unknown> }} ValidationError
 * @typedef {(value: unknown, values: Record<string, unknown>) => ValidationError | null} Rule
 * @typedef {Record<string, Rule[]>} Schema
 * @typedef {{ valid: boolean, errors: Record<string, ValidationError>, firstInvalid: string | null }} ValidationResult
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @param {unknown} value */
function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Every rule except `required` passes on empty values, so optional fields stay optional.
 * @param {(value: any, values: Record<string, unknown>) => ValidationError | null} check
 * @returns {Rule}
 */
const whenFilled = (check) => (value, values) => (isEmpty(value) ? null : check(value, values));

export const rules = {
  /** @param {string} [key] @returns {Rule} */
  required:
    (key = 'validation.required') =>
    (value) =>
      isEmpty(value) ? { key } : null,

  /** @param {string} [key] @returns {Rule} */
  email: (key = 'validation.email') =>
    whenFilled((value) => (EMAIL_PATTERN.test(String(value).trim()) ? null : { key })),

  /**
   * @param {number} count
   * @param {string} [key]
   * @returns {Rule}
   */
  minLength: (count, key = 'validation.minLength') =>
    whenFilled((value) => (String(value).length >= count ? null : { key, params: { count } })),

  /**
   * @param {number} count
   * @param {string} [key]
   * @returns {Rule}
   */
  maxLength: (count, key = 'validation.maxLength') =>
    whenFilled((value) => (String(value).length <= count ? null : { key, params: { count } })),

  /** @param {{ min?: number, max?: number, integer?: boolean }} [limits] @returns {Rule} */
  number: ({ min, max, integer = false } = {}) =>
    whenFilled((value) => {
      const number = typeof value === 'number' ? value : Number(String(value).trim());
      if (!Number.isFinite(number)) return { key: 'validation.number' };
      if (integer && !Number.isInteger(number)) return { key: 'validation.integer' };
      if (min != null && number < min) return { key: 'validation.min', params: { min } };
      if (max != null && number > max) return { key: 'validation.max', params: { max } };
      return null;
    }),

  /** @param {string} [key] @returns {Rule} */
  isoDate: (key = 'validation.date') => whenFilled((value) => (isValidIso(value) ? null : { key })),

  /**
   * @param {readonly unknown[]} options
   * @param {string} [key]
   * @returns {Rule}
   */
  oneOf: (options, key = 'validation.oneOf') =>
    whenFilled((value) => (options.includes(value) ? null : { key })),

  /**
   * @param {(value: any, values: Record<string, unknown>) => boolean} isValid
   * @param {string} key
   * @param {Record<string, unknown>} [params]
   * @returns {Rule}
   */
  custom: (isValid, key, params) =>
    whenFilled((value, values) => (isValid(value, values) ? null : { key, params })),
};

/**
 * @param {unknown} value
 * @param {Rule[]} fieldRules
 * @param {Record<string, unknown>} [values] All form values, for cross-field rules.
 * @returns {ValidationError | null} The first failure.
 */
export function validateField(value, fieldRules, values = {}) {
  for (const rule of fieldRules) {
    const error = rule(value, values);
    if (error) return error;
  }
  return null;
}

/**
 * @param {Schema} schema
 * @param {Record<string, unknown>} values
 * @returns {ValidationResult}
 */
export function validate(schema, values) {
  /** @type {Record<string, ValidationError>} */
  const errors = {};
  for (const [field, fieldRules] of Object.entries(schema)) {
    const error = validateField(values[field], fieldRules, values);
    if (error) errors[field] = error;
  }
  const invalid = Object.keys(errors);
  return { valid: invalid.length === 0, errors, firstInvalid: invalid[0] ?? null };
}
