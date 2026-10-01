// @ts-check
import { EVENTS, emit, on } from './events.js';
import { getShared, setShared } from './storage.js';

/** @typedef {'light' | 'dark'} Theme */

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** @param {unknown} value @returns {value is Theme} */
const isTheme = (value) => value === 'light' || value === 'dark';

/** @returns {Theme} */
const systemTheme = () => (darkQuery.matches ? 'dark' : 'light');

/** @param {Theme} theme */
function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

/** @returns {Theme | null} null while the user follows the system preference. */
export function getStoredTheme() {
  const stored = getShared('theme');
  return isTheme(stored) ? stored : null;
}

/** @returns {Theme} */
export function getTheme() {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : (getStoredTheme() ?? systemTheme());
}

/** @param {Theme} theme */
export function setTheme(theme) {
  apply(theme);
  setShared('theme', theme);
}

/** @returns {Theme} The new theme. */
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Follow the system preference (until the user chooses) and other tabs. */
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
