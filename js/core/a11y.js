// @ts-check

/** Shared accessibility helpers for the hand-built WAI-ARIA APG patterns. */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Visible, focusable elements inside `root`, in tab order.
 * @param {ParentNode} root
 * @returns {HTMLElement[]}
 */
export function getFocusable(root) {
  return /** @type {HTMLElement[]} */ ([...root.querySelectorAll(FOCUSABLE)]).filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]'),
  );
}

/**
 * Keep Tab and Shift+Tab inside `container` (popovers and other non-<dialog> overlays;
 * native <dialog>.showModal() already traps focus).
 * @param {HTMLElement} container
 * @returns {() => void} Releases the trap.
 */
export function trapFocus(container) {
  /** @param {KeyboardEvent} event */
  const onKeydown = (event) => {
    if (event.key !== 'Tab') return;
    const items = getFocusable(container);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !container.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKeydown);
  return () => container.removeEventListener('keydown', onKeydown);
}

/**
 * Remember what has focus now; call the returned function to give focus back
 * (e.g. to the button that opened a popover).
 * @returns {() => void}
 */
export function rememberFocus() {
  const previous = document.activeElement;
  return () => {
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  };
}

/**
 * Run `handler` when Escape is pressed inside `target`.
 * @param {HTMLElement | Document} target
 * @param {(event: KeyboardEvent) => void} handler
 * @returns {() => void} Removes the listener.
 */
export function onEscape(target, handler) {
  const listener = /** @type {EventListener} */ (
    (/** @type {KeyboardEvent} */ event) => {
      if (event.key === 'Escape') handler(event);
    }
  );
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}

/**
 * Roving tabindex: one item in a group is tabbable, arrow keys move between items.
 * Used by menus, chip rows and other composite widgets.
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.selector Matches the items inside `container`.
 * @param {'horizontal' | 'vertical' | 'both'} [options.orientation]
 * @param {boolean} [options.loop] Wrap around at the ends. Defaults to true.
 * @returns {{ refresh: () => void, focusItem: (index: number) => void, destroy: () => void }}
 */
export function rovingTabindex(container, { selector, orientation = 'horizontal', loop = true }) {
  /** @returns {HTMLElement[]} */
  const items = () =>
    /** @type {HTMLElement[]} */ ([...container.querySelectorAll(selector)]).filter(
      (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true',
    );

  /** @param {HTMLElement} [active] */
  const refresh = (active) => {
    const list = items();
    const current = active ?? list.find((item) => item.tabIndex === 0) ?? list[0];
    for (const item of list) item.tabIndex = item === current ? 0 : -1;
  };

  /** @param {number} index */
  const focusItem = (index) => {
    const list = items();
    if (list.length === 0) return;
    const bounded = loop
      ? (index + list.length) % list.length
      : Math.max(0, Math.min(list.length - 1, index));
    refresh(list[bounded]);
    list[bounded].focus();
  };

  const previousKeys = orientation === 'vertical' ? ['ArrowUp'] : ['ArrowLeft'];
  const nextKeys = orientation === 'vertical' ? ['ArrowDown'] : ['ArrowRight'];
  if (orientation === 'both') {
    previousKeys.push('ArrowUp');
    nextKeys.push('ArrowDown');
  }

  /** @param {KeyboardEvent} event */
  const onKeydown = (event) => {
    const list = items();
    const index = list.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (index === -1) return;

    let target = null;
    if (previousKeys.includes(event.key)) target = index - 1;
    else if (nextKeys.includes(event.key)) target = index + 1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = list.length - 1;
    if (target === null) return;

    event.preventDefault();
    focusItem(target);
  };

  /** @param {FocusEvent} event */
  const onFocusin = (event) => {
    const item = /** @type {HTMLElement} */ (event.target).closest(selector);
    if (item instanceof HTMLElement && container.contains(item)) refresh(item);
  };

  container.addEventListener('keydown', onKeydown);
  container.addEventListener('focusin', onFocusin);
  refresh();

  return {
    refresh: () => refresh(),
    focusItem,
    destroy() {
      container.removeEventListener('keydown', onKeydown);
      container.removeEventListener('focusin', onFocusin);
    },
  };
}

/** @type {Partial<Record<'polite' | 'assertive', HTMLElement>>} */
const liveRegions = {};

/**
 * Announce a message to screen readers through a visually hidden live region.
 * @param {string} message Already translated.
 * @param {'polite' | 'assertive'} [politeness]
 */
export function announce(message, politeness = 'polite') {
  let region = liveRegions[politeness];
  if (!region || !region.isConnected) {
    region = document.createElement('div');
    region.className = 'sr-only';
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
    liveRegions[politeness] = region;
  }
  // Clear first so repeating the same message is announced again.
  const target = region;
  target.textContent = '';
  window.setTimeout(() => {
    target.textContent = message;
  }, 50);
}

let uidCounter = 0;

/**
 * A unique id for wiring aria-controls, aria-describedby and label[for].
 * @param {string} [prefix]
 * @returns {string}
 */
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}
