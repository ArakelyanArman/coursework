// @ts-check

// Derived from this module's own URL, so links stay correct from /admin/ and under a sub-path.
export const appRoot = new URL('../../', import.meta.url);

/** @param {string} path */
const relative = (path) => path.replace(/^\/+/, '');

/** @param {string} path Relative to the app root. @returns {string} Absolute URL. */
export function assetUrl(path) {
  return new URL(relative(path), appRoot).href;
}

/** @param {string} path Relative to the app root; may carry a query and hash. @returns {string} Root-relative URL. */
export function pageUrl(path) {
  const url = new URL(relative(path), appRoot);
  return url.pathname + url.search + url.hash;
}
