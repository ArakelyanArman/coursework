// @ts-check
import { pageUrl } from './paths.js';

/**
 * @typedef {{ type: 'string' | 'number' | 'array', default?: string | number | string[] }} ParamSpec
 * @typedef {Record<string, ParamSpec>} ParamSchema
 * @typedef {Record<string, any>} ParamValues
 */

/** @param {ParamSpec} spec */
function defaultFor(spec) {
  if (spec.default !== undefined) return spec.default;
  if (spec.type === 'array') return [];
  if (spec.type === 'number') return null;
  return '';
}

/**
 * Missing or invalid params get their default.
 * @param {ParamSchema} schema
 * @param {string} [search]
 * @returns {ParamValues}
 */
export function readParams(schema, search = window.location.search) {
  const params = new URLSearchParams(search);
  /** @type {ParamValues} */
  const values = {};

  for (const [name, spec] of Object.entries(schema)) {
    const raw = params.get(name);
    if (raw == null || raw === '') {
      values[name] = defaultFor(spec);
    } else if (spec.type === 'array') {
      values[name] = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (spec.type === 'number') {
      const number = Number(raw);
      values[name] = Number.isFinite(number) ? number : defaultFor(spec);
    } else {
      values[name] = raw;
    }
  }
  return values;
}

/**
 * Empty values and defaults are left out; arrays become comma-separated lists.
 * @param {ParamValues} values
 * @param {ParamSchema} [schema]
 * @returns {string} Without the leading "?".
 */
export function serializeParams(values, schema = {}) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(name, value.join(','));
      continue;
    }
    const spec = schema[name];
    if (spec && spec.default !== undefined && value === spec.default) continue;
    params.set(name, String(value));
  }
  return params.toString().replaceAll('%2C', ',');
}

/**
 * @param {ParamValues} values
 * @param {ParamSchema} [schema]
 * @param {{ replace?: boolean }} [options] `replace` rewrites the current history entry instead of adding one.
 */
export function writeParams(values, schema = {}, { replace = false } = {}) {
  const query = serializeParams(values, schema);
  const url = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
  if (url === window.location.pathname + window.location.search + window.location.hash) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

/** @param {() => void} handler Runs on Back and Forward. @returns {() => void} Removes the listener. */
export function onParamsChange(handler) {
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}

/**
 * @param {string} path Relative to the app root.
 * @param {ParamValues} [values]
 * @param {ParamSchema} [schema]
 * @returns {string} Root-relative URL.
 */
export function buildUrl(path, values = {}, schema = {}) {
  const query = serializeParams(values, schema);
  return pageUrl(path) + (query ? `?${query}` : '');
}

/**
 * Only same-origin relative values pass, so a crafted login link cannot redirect off-site.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function safeReturnTo(value, fallback) {
  if (typeof value !== 'string' || value === '') return fallback;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const isProtocolRelative = /^[/\\]{2}/.test(value);
  // eslint-disable-next-line no-control-regex
  const hasUnsafeChars = /[\\\u0000-\u001f]/.test(value);
  if (hasScheme || isProtocolRelative || hasUnsafeChars) return fallback;
  try {
    const url = new URL(value, window.location.href);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
