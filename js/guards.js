// @ts-check
import { setFlash } from './core/flash.js';
import { pageUrl } from './core/paths.js';
import { buildUrl } from './core/url-state.js';
import { currentUser } from './services/auth.js';

/** @typedef {import('./types.js').User} User */
/**
 * Who may open a page: anyone, guests only (login, register), signed-in users, or admins.
 * @typedef {'public' | 'guest' | 'user' | 'admin'} Access
 */

/** @returns {string} The login page, set to come back to the current URL afterwards. */
export function loginUrl() {
  const { pathname, search, hash } = window.location;
  return buildUrl('login.html', { returnTo: pathname + search + hash });
}

/** @param {User} user @returns {string} Where a login without a returnTo lands. */
export function homeFor(user) {
  return pageUrl(user.role === 'admin' ? 'admin/books.html' : 'catalog.html');
}

/**
 * Check the stored session against a page's access level and leave the page when it does not fit.
 * This is for user experience only: the backend checks the session and role on every request.
 * @param {Access} access
 * @returns {boolean} False when the visitor is being redirected; render nothing then.
 */
export function guard(access) {
  const user = currentUser();
  let target = null;

  if (access === 'guest') {
    if (user) target = pageUrl('index.html');
  } else if (access !== 'public') {
    if (!user) {
      target = loginUrl();
    } else if (access === 'admin' && user.role !== 'admin') {
      setFlash({ title: { key: 'errors.forbidden' }, tone: 'error' });
      target = pageUrl('index.html');
    }
  }

  if (target) window.location.replace(target);
  return target === null;
}

/**
 * For actions that need an account, such as booking.
 * @returns {boolean} False when the visitor was sent to the login page.
 */
export function requireLogin() {
  if (currentUser()) return true;
  window.location.assign(loginUrl());
  return false;
}
