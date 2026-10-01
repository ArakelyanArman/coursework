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

/**
 * @param {Element | Document} root
 * @param {string} type
 * @param {string} selector
 * @param {(event: Event, target: Element) => void} handler
 * @returns {() => void} Removes the listener.
 */
export function delegate(root, type, selector, handler) {
  /** @param {Event} event */
  const listener = (event) => {
    if (!(event.target instanceof Element)) return;
    const match = event.target.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

/**
 * @template {unknown[]} A
 * @param {(...args: A) => void} fn
 * @param {number} ms
 * @returns {((...args: A) => void) & { cancel: () => void }}
 */
export function debounce(fn, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @param {A} args */
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
