// @ts-check

/** Shared-state events, dispatched on `document`. */
export const EVENTS = Object.freeze({
  AUTH_CHANGE: 'auth:change',
  THEME_CHANGE: 'theme:change',
  LANG_CHANGE: 'lang:change',
});

/**
 * @param {string} name
 * @param {unknown} [detail]
 */
export function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * @param {string} name
 * @param {(event: CustomEvent) => void} handler
 * @param {EventTarget} [target]
 * @returns {() => void} Removes the listener.
 */
export function on(name, handler, target = document) {
  const listener = /** @type {EventListener} */ (handler);
  target.addEventListener(name, listener);
  return () => target.removeEventListener(name, listener);
}
