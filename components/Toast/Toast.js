// @ts-check
import { h } from '../../js/core/dom.js';
import { applyTranslations, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { IconButton } from '../Button/Button.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Toast.html', import.meta.url));

const DURATION_MS = 5000;
const ICONS = /** @type {const} */ ({ success: 'check', error: 'circle-alert', info: 'info' });

// The live region exists from the start, so screen readers announce what is added to it.
const region = h('div', {
  class: 'toast-region',
  popover: 'manual',
  role: 'region',
  'aria-live': 'polite',
  'data-i18n-attr': 'aria-label:toast.region',
});
document.body.append(region);

/** Re-opening moves the region to the top of the top layer, above a dialog opened since. */
function raise() {
  if (typeof region.showPopover !== 'function') return;
  if (region.matches(':popover-open')) region.hidePopover();
  region.showPopover();
}

/**
 * @param {object} props
 * @param {Text} props.title
 * @param {Text} [props.message]
 * @param {'success' | 'error' | 'info'} [props.tone]
 * @param {number} [props.duration] Milliseconds before it leaves by itself.
 * @returns {() => void} Dismisses the toast.
 */
export function toast({ title, message, tone = 'info', duration = DURATION_MS }) {
  const element = create();
  const parts = refs(element);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  const dismiss = () => {
    clearTimeout(timer);
    element.remove();
    if (region.childElementCount === 0 && region.matches(':popover-open')) region.hidePopover();
  };
  const start = () => {
    clearTimeout(timer);
    timer = setTimeout(dismiss, duration);
  };
  const pause = () => clearTimeout(timer);

  element.classList.add(`toast--${tone}`);
  if (tone === 'error') element.setAttribute('role', 'alert');
  parts.icon.append(Icon(ICONS[tone]));
  setText(parts.title, title);
  if (message) {
    setText(parts.message, message);
    parts.message.hidden = false;
  }
  parts.dismiss.replaceWith(
    IconButton({ icon: 'x', label: { key: 'toast.dismiss' }, size: 'sm', onClick: dismiss }),
  );

  // Reading or reaching for a toast keeps it on screen.
  element.addEventListener('mouseenter', pause);
  element.addEventListener('mouseleave', start);
  element.addEventListener('focusin', pause);
  element.addEventListener('focusout', start);

  applyTranslations(region);
  region.append(element);
  raise();
  start();
  return dismiss;
}
