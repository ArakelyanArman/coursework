// @ts-check

/**
 * The app root, derived from this module's own URL (js/core/paths.js → ../../).
 * Keeps links and assets correct from /admin/*.html and when the app is hosted
 * under a sub-path.
 */
export const appRoot = new URL('../../', import.meta.url);

/** @param {string} path */
const relative = (path) => path.replace(/^\/+/, '');

/**
 * Absolute URL of a static file, e.g. assetUrl('assets/icons/sprite.svg').
 * @param {string} path Path relative to the app root.
 * @returns {string}
 */
export function assetUrl(path) {
  return new URL(relative(path), appRoot).href;
}

/**
 * Root-relative link to an app page, e.g. pageUrl('book.html?id=OL45883W').
 * @param {string} path Path relative to the app root; may include a query string and hash.
 * @returns {string}
 */
export function pageUrl(path) {
  const url = new URL(relative(path), appRoot);
  return url.pathname + url.search + url.hash;
}
