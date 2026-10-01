// @ts-check
import { session } from './storage.js';

/** @typedef {import('./i18n.js').Text} Text */
/** @typedef {{ title: Text, tone?: 'success' | 'error' | 'info' }} Flash */

const KEY = 'flash';

/**
 * Leave a message for the next page to show, e.g. before a redirect.
 * @param {Flash} message
 */
export function setFlash(message) {
  session.set(KEY, message);
}

/** @returns {Flash | null} The pending message; it is handed out once. */
export function takeFlash() {
  const message = session.get(KEY);
  if (message) session.remove(KEY);
  return message;
}
