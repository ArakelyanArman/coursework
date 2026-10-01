// @ts-check
import { EVENTS, emit, on } from './events.js';
import { getShared, setShared } from './storage.js';

/** @typedef {'light' | 'dark'} Theme */

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * @param {unknown} value
 * @returns {value is Theme}
 */
const isTheme = (value) => value === 'light' || value === 'dark';

/** @returns {Theme} */
const systemTheme = () => (darkQuery.matches ? 'dark' : 'light');

/** @param {Theme} theme */
function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * The user's saved choice, or null when they are following the system preference.
 * @returns {Theme | null}
 */
export function getStoredTheme() {
  const stored = getShared('theme');
  return isTheme(stored) ? stored : null;
}

/**
 * The theme currently in effect.
 * @returns {Theme}
 */
export function getTheme() {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : (getStoredTheme() ?? systemTheme());
}

/**
 * Apply and persist a theme, then broadcast `theme:change`.
 * @param {Theme} theme
 */
export function setTheme(theme) {
  apply(theme);
  setShared('theme', theme);
}

/**
 * Switch between light and dark.
 * @returns {Theme} The new theme.
 */
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Keep the theme in sync with the system preference (until the user chooses)
 * and with other tabs. theme-init.js has already set the initial value.
 */
export function initTheme() {
  apply(getTheme());

  darkQuery.addEventListener('change', () => {
    if (getStoredTheme()) return;
    apply(systemTheme());
    emit(EVENTS.THEME_CHANGE, { value: systemTheme(), source: 'system' });
  });

  on(EVENTS.THEME_CHANGE, ({ detail }) => {
    if (detail?.source !== 'remote') return;
    apply(isTheme(detail.value) ? detail.value : systemTheme());
  });
}
