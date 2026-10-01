// @ts-check
import { pageUrl } from './paths.js';

/**
 * URL is state: search, filters, sort and page live in query params.
 *
 * @example
 * const schema = {
 *   q: { type: 'string' },
 *   genres: { type: 'array' },
 *   page: { type: 'number', default: 1 },
 * };
 * const state = readParams(schema);          // { q: '', genres: [], page: 1 }
 * writeParams({ ...state, page: 2 }, schema); // pushes ?page=2
 *
 * @typedef {{ type: 'string' | 'number' | 'array', default?: string | number | string[] }} ParamSpec
 * @typedef {Record<string, ParamSpec>} ParamSchema
 * @typedef {Record<string, any>} ParamValues
 */

/**
 * @param {ParamSpec} spec
 * @returns {string | number | string[] | null}
 */
function defaultFor(spec) {
  if (spec.default !== undefined) return spec.default;
  if (spec.type === 'array') return [];
  if (spec.type === 'number') return null;
  return '';
}

/**
 * Read typed values from a query string. Missing or invalid params get their default.
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
 * Serialize values to a query string, leaving out empty values and defaults so
 * URLs stay short. Arrays become comma-separated lists.
 * @param {ParamValues} values
 * @param {ParamSchema} [schema]
 * @returns {string} Without the leading "?"; empty when there is nothing to write.
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
 * Write values to the current URL without reloading.
 * @param {ParamValues} values
 * @param {ParamSchema} [schema]
 * @param {{ replace?: boolean }} [options] `replace` rewrites the current history entry
 *   (use while typing); the default adds an entry so Back restores the previous view.
 */
export function writeParams(values, schema = {}, { replace = false } = {}) {
  const query = serializeParams(values, schema);
  const url = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
  if (url === window.location.pathname + window.location.search + window.location.hash) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

/**
 * Run `handler` when the user goes Back or Forward.
 * @param {() => void} handler
 * @returns {() => void} Removes the listener.
 */
export function onParamsChange(handler) {
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}

/**
 * Build a link to an app page with query params.
 * @example buildUrl('catalog.html', { category: 'classics', page: 2 })
 * @param {string} path Path relative to the app root.
 * @param {ParamValues} [values]
 * @param {ParamSchema} [schema]
 * @returns {string} Root-relative URL.
 */
export function buildUrl(path, values = {}, schema = {}) {
  const query = serializeParams(values, schema);
  return pageUrl(path) + (query ? `?${query}` : '');
}

/**
 * Accept only same-origin, relative `returnTo` values. Anything else (absolute
 * URLs, "//host", "javascript:") returns `fallback`, so a crafted login link
 * cannot send the user to another site.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string} A root-relative URL.
 */
export function safeReturnTo(value, fallback) {
  if (typeof value !== 'string' || value === '') return fallback;
  // Reject schemes, protocol-relative URLs, backslashes and control characters up front.
  // eslint-disable-next-line no-control-regex
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || /^[/\\]{2}/.test(value) || /[\\\u0000-\u001f]/.test(value)) {
    return fallback;
  }
  try {
    const url = new URL(value, window.location.href);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
