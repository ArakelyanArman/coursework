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

/** @param {Element} element @returns {Params} From data-i18n-params. */
function paramsOf(element) {
  const raw = element.getAttribute('data-i18n-params');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** @param {Element} element */
function translateElement(element) {
  const params = paramsOf(element);
  const key = element.getAttribute('data-i18n');
  if (key) element.textContent = t(key, params);

  for (const pair of (element.getAttribute('data-i18n-attr') ?? '').split(';')) {
    const separator = pair.indexOf(':');
    if (separator === -1) continue;
    const attr = pair.slice(0, separator).trim();
    const attrKey = pair.slice(separator + 1).trim();
    if (attr && attrKey) element.setAttribute(attr, t(attrKey, params));
  }
}

/**
 * Fill `data-i18n="key"` text and `data-i18n-attr="placeholder:key;aria-label:key"` attributes.
 * Placeholders come from `data-i18n-params` (JSON).
 * @param {ParentNode} [root]
 */
export function applyTranslations(root = document) {
  if (root instanceof Element) translateElement(root);
  for (const element of root.querySelectorAll('[data-i18n], [data-i18n-attr]')) {
    translateElement(element);
  }
}

/**
 * Text a component can show: a final string (a book title, a name) or a translation key.
 * @typedef {string | { key: string, params?: Params }} Text
 */

/** @param {Element} element @param {Params} [params] */
function storeParams(element, params) {
  if (params && Object.keys(params).length > 0) {
    element.setAttribute('data-i18n-params', JSON.stringify(params));
  }
}

/**
 * Set an element's text. A translation key stays bound, so it follows language switches.
 * @param {Element} element
 * @param {Text | null | undefined} text
 */
export function setText(element, text) {
  if (text == null || typeof text === 'string') {
    element.removeAttribute('data-i18n');
    element.textContent = text ?? '';
    return;
  }
  element.setAttribute('data-i18n', text.key);
  storeParams(element, text.params);
  element.textContent = t(text.key, text.params);
}

/**
 * Set an attribute from text; a translation key stays bound.
 * @param {Element} element
 * @param {string} attr
 * @param {Text | null | undefined} text
 */
export function setAttrText(element, attr, text) {
  const bound = (element.getAttribute('data-i18n-attr') ?? '')
    .split(';')
    .filter((pair) => pair && !pair.startsWith(`${attr}:`));

  if (text == null) {
    element.removeAttribute(attr);
  } else if (typeof text === 'string') {
    element.setAttribute(attr, text);
  } else {
    bound.push(`${attr}:${text.key}`);
    storeParams(element, text.params);
    element.setAttribute(attr, t(text.key, text.params));
  }

  if (bound.length > 0) element.setAttribute('data-i18n-attr', bound.join(';'));
  else element.removeAttribute('data-i18n-attr');
}

/** @param {Text} text @returns {string} */
export const textOf = (text) => (typeof text === 'string' ? text : t(text.key, text.params));

/**
 * Re-run `handler` on language switches for as long as `element` stays on the page.
 * For text made by Intl formatting, which data-i18n cannot rebind.
 * @param {Element} element
 * @param {() => void} handler
 */
export function whileConnected(element, handler) {
  let seen = false;
  const off = on(EVENTS.LANG_CHANGE, () => {
    if (element.isConnected) {
      seen = true;
      handler();
    } else if (seen) {
      off();
    }
  });
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
