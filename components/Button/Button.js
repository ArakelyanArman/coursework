// @ts-check
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Icon } from '../Icon/Icon.js';
import '../Tooltip/Tooltip.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */
/** @typedef {import('../Icon/Icon.js').IconName} IconName */
/** @typedef {'primary' | 'secondary' | 'ghost' | 'danger' | 'link'} Variant */
/** @typedef {'sm' | 'md' | 'lg'} Size */

const create = await loadTemplate(new URL('./Button.html', import.meta.url));

/** @param {Element} button */
const isBlocked = (button) =>
  button.getAttribute('aria-disabled') === 'true' || button.getAttribute('aria-busy') === 'true';

/**
 * @param {object} options
 * @param {Variant} options.variant
 * @param {Size} options.size
 * @param {'button' | 'submit'} [options.type]
 * @param {string} [options.href]
 * @param {boolean} [options.disabled]
 * @param {(event: MouseEvent) => void} [options.onClick]
 */
function base({ variant, size, type = 'button', href, disabled = false, onClick }) {
  let button = create();
  if (href) {
    const link = document.createElement('a');
    link.className = button.className;
    link.href = href;
    link.append(...button.childNodes);
    button = link;
  } else {
    button.type = type;
  }
  button.classList.add(`btn--${variant}`, `btn--${size}`);

  // A disabled or busy button stays focusable (so its tooltip can explain why) but does nothing.
  button.addEventListener('click', (/** @type {MouseEvent} */ event) => {
    if (isBlocked(button)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  if (onClick) button.addEventListener('click', onClick);
  if (disabled) setDisabled(button, true);
  return button;
}

/**
 * @param {object} props
 * @param {Text} props.label
 * @param {Variant} [props.variant]
 * @param {Size} [props.size]
 * @param {IconName} [props.icon]
 * @param {IconName} [props.trailingIcon]
 * @param {'button' | 'submit'} [props.type]
 * @param {string} [props.href] Renders a link that looks like a button.
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.block]
 * @param {(event: MouseEvent) => void} [props.onClick]
 * @returns {HTMLButtonElement | HTMLAnchorElement}
 */
export function Button({ label, variant = 'primary', size = 'md', icon, trailingIcon, block = false, ...rest }) {
  const button = base({ variant, size, ...rest });
  const parts = refs(button);
  const iconSize = size === 'sm' ? 16 : 20;

  setText(parts.label, label);
  if (icon) {
    parts.lead.append(Icon(icon, iconSize));
    parts.lead.hidden = false;
  }
  if (trailingIcon) {
    parts.trail.append(Icon(trailingIcon, iconSize));
    parts.trail.hidden = false;
  }
  if (block) button.classList.add('btn--block');
  return button;
}

/**
 * @param {object} props
 * @param {IconName} props.icon
 * @param {Text} props.label Becomes the accessible name and the tooltip.
 * @param {Variant} [props.variant]
 * @param {'sm' | 'md'} [props.size]
 * @param {boolean} [props.danger] Turns red on hover.
 * @param {boolean} [props.pressed] Makes it a toggle button.
 * @param {'button' | 'submit'} [props.type]
 * @param {string} [props.href]
 * @param {boolean} [props.disabled]
 * @param {(event: MouseEvent) => void} [props.onClick]
 * @returns {HTMLButtonElement | HTMLAnchorElement}
 */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', danger = false, pressed, ...rest }) {
  const button = base({ variant, size, ...rest });
  const parts = refs(button);

  button.classList.add('icon-btn');
  if (danger) button.classList.add('icon-btn--danger');
  parts.label.remove();
  parts.lead.hidden = false;
  setIcon(button, icon);
  setLabel(button, label);
  if (pressed != null) button.setAttribute('aria-pressed', String(pressed));
  return button;
}

/**
 * @param {Element} button An IconButton.
 * @param {IconName} icon
 */
export function setIcon(button, icon) {
  const size = button.classList.contains('btn--sm') ? 18 : 20;
  refs(button).lead.replaceChildren(Icon(icon, size));
}

/**
 * @param {Element} button An IconButton.
 * @param {Text} label
 */
export function setLabel(button, label) {
  setAttrText(button, 'aria-label', label);
  setAttrText(button, 'data-tooltip', label);
}

/**
 * @param {Element} button
 * @param {boolean} disabled
 * @param {Text} [reason] Shown as the tooltip and read out as the description.
 */
export function setDisabled(button, disabled, reason) {
  if (disabled) button.setAttribute('aria-disabled', 'true');
  else button.removeAttribute('aria-disabled');

  if (disabled && reason) {
    setAttrText(button, 'aria-description', reason);
    setAttrText(button, 'data-tooltip', reason);
  } else {
    setAttrText(button, 'aria-description', null);
  }
}

/**
 * The spinner takes the leading icon's place; the label stays.
 * @param {Element} button
 * @param {boolean} loading
 */
export function setLoading(button, loading) {
  const parts = refs(button);
  if (loading) button.setAttribute('aria-busy', 'true');
  else button.removeAttribute('aria-busy');
  parts.spinner.hidden = !loading;
  parts.lead.hidden = loading || parts.lead.childElementCount === 0;
}
