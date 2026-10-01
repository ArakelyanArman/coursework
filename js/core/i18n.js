// @ts-check
import { config } from '../config.js';
import { EVENTS, on } from './events.js';
import { getJson } from './http.js';
import { assetUrl } from './paths.js';
import { getShared, setShared } from './storage.js';

/** @typedef {'en' | 'hy'} Lang */
/** @typedef {Record<string, unknown>} Params */

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/** @type {Record<string, any>} */
let translations = {};
/** @type {Lang} */
let currentLang = config.defaultLanguage;

const warned = new Set();
/** @type {Map<string, boolean>} */
const intlSupport = new Map();
/** @type {Map<string, Intl.NumberFormat>} */
const numberFormatters = new Map();

/** @param {unknown} value @returns {value is Lang} */
const isLang = (value) => config.languages.includes(/** @type {Lang} */ (value));

/**
 * A plural entry looks like { one: '{count} book', other: '{count} books' }.
 * @param {unknown} value
 * @returns {value is Record<string, string>}
 */
function isPlural(value) {
  if (value == null || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => PLURAL_CATEGORIES.has(key));
}

/**
 * @param {Lang} lang
 * @param {string} key Dotted path, e.g. 'nav.home'.
 */
function lookup(lang, key) {
  /** @type {any} */
  let node = translations[lang];
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

/** @returns {Lang} */
function detectLanguage() {
  const stored = getShared('language');
  if (isLang(stored)) return stored;
  return (navigator.language ?? '').toLowerCase().startsWith('hy') ? 'hy' : config.defaultLanguage;
}

/** @returns {Lang} */
export function getLanguage() {
  return currentLang;
}

/** @returns {string} 'en-US' or 'hy-AM'. */
export function getLocale() {
  return config.locales[currentLang];
}

/**
 * Translate a key. {name} placeholders come from `params`; plural entries are chosen by
 * `params.count`. A key missing in the current language falls back to English, then to the key.
 * @param {string} key
 * @param {Params} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  let entry = lookup(currentLang, key);
  let lang = currentLang;

  if (entry === undefined && currentLang !== 'en') {
    entry = lookup('en', key);
    lang = 'en';
  }
  if (entry === undefined || lang !== currentLang) {
    if (config.isDev && !warned.has(`${currentLang}:${key}`)) {
      warned.add(`${currentLang}:${key}`);
      console.warn(`[i18n] Missing "${key}" for "${currentLang}"`);
    }
    if (entry === undefined) return key;
  }

  if (isPlural(entry)) {
    const count = Number(params.count ?? 0);
    const category = new Intl.PluralRules(config.locales[lang]).select(count);
    entry = entry[category] ?? entry.other ?? Object.values(entry)[0];
  }
  if (typeof entry !== 'string') return key;

  return entry.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    if (value == null) return match;
    if (name === 'count' && typeof value === 'number') return localizeNumber(value);
    return String(value);
  });
}

/**
 * Chromium ships no Intl date/number data for Armenian ('hy-AM' silently resolves to 'en-US').
 * When this is false, numbers here and dates in format.js use the patterns in translations.json.
 * @returns {boolean}
 */
export function hasIntlLocale() {
  const locale = getLocale();
  let supported = intlSupport.get(locale);
  if (supported === undefined) {
    supported =
      Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0 &&
      Intl.NumberFormat.supportedLocalesOf([locale]).length > 0;
    intlSupport.set(locale, supported);
  }
  return supported;
}

/**
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function localizeNumber(value, options = {}) {
  const native = hasIntlLocale();
  const locale = native ? getLocale() : 'en-US';
  const cacheKey = locale + JSON.stringify(options);
  let formatter = numberFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(cacheKey, formatter);
  }
  if (native) return formatter.format(value);

  return formatter
    .formatToParts(value)
    .map((part) => {
      if (part.type === 'group') return t('number.group');
      if (part.type === 'decimal') return t('number.decimal');
      return part.value;
    })
    .join('');
}

/**
 * Fill `data-i18n="key"` text and `data-i18n-attr="placeholder:key;aria-label:key"` attributes.
 * @param {ParentNode} [root]
 */
export function applyTranslations(root = document) {
  /** @type {Element[]} */
  const textTargets = [...root.querySelectorAll('[data-i18n]')];
  /** @type {Element[]} */
  const attrTargets = [...root.querySelectorAll('[data-i18n-attr]')];
  if (root instanceof Element) {
    if (root.hasAttribute('data-i18n')) textTargets.push(root);
    if (root.hasAttribute('data-i18n-attr')) attrTargets.push(root);
  }

  for (const element of textTargets) {
    element.textContent = t(element.getAttribute('data-i18n') ?? '');
  }

  for (const element of attrTargets) {
    const pairs = (element.getAttribute('data-i18n-attr') ?? '').split(';');
    for (const pair of pairs) {
      const separator = pair.indexOf(':');
      if (separator === -1) continue;
      const attr = pair.slice(0, separator).trim();
      const key = pair.slice(separator + 1).trim();
      if (attr && key) element.setAttribute(attr, t(key));
    }
  }
}

/** @param {Lang} lang */
function activate(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  applyTranslations(document);
}

/**
 * Switch language in place and broadcast `lang:change`.
 * @param {Lang} lang
 */
export function setLanguage(lang) {
  if (!isLang(lang) || lang === currentLang) return;
  activate(lang);
  setShared('language', lang);
}

/**
 * Call once, before first render.
 * @returns {Promise<Lang>}
 */
export async function initI18n() {
  currentLang = detectLanguage();
  document.documentElement.lang = currentLang;
  translations = await getJson(assetUrl('i18n/translations.json'));
  applyTranslations(document);

  on(EVENTS.LANG_CHANGE, ({ detail }) => {
    if (detail?.source === 'remote' && isLang(detail.value) && detail.value !== currentLang) {
      activate(detail.value);
    }
  });

  return currentLang;
}

/**
 * @param {unknown} node
 * @param {string} prefix
 * @param {Set<string>} keys
 */
function collectKeys(node, prefix, keys) {
  if (typeof node === 'string' || isPlural(node)) {
    keys.add(prefix);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [name, child] of Object.entries(node)) {
      collectKeys(child, prefix ? `${prefix}.${name}` : name, keys);
    }
  }
}

/**
 * Dev check: keys present in one language but not the other.
 * @returns {{ total: number, missingInHy: string[], missingInEn: string[] }}
 */
export function diffKeys() {
  /** @type {Set<string>} */
  const en = new Set();
  /** @type {Set<string>} */
  const hy = new Set();
  collectKeys(translations.en, '', en);
  collectKeys(translations.hy, '', hy);
  return {
    total: en.size,
    missingInHy: [...en].filter((key) => !hy.has(key)).sort(),
    missingInEn: [...hy].filter((key) => !en.has(key)).sort(),
  };
}
