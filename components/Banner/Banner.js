// @ts-check
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Banner.html', import.meta.url));

const ICONS = /** @type {const} */ ({ danger: 'circle-alert', success: 'check', info: 'info' });

/**
 * An inline message for a form or a section.
 * @param {object} props
 * @param {Text} props.message
 * @param {'danger' | 'success' | 'info'} [props.tone]
 * @param {Element} [props.action] e.g. a "Try again" link button.
 * @returns {HTMLElement}
 */
export function Banner({ message, tone = 'info', action }) {
  const banner = create();
  const parts = refs(banner);
  if (tone !== 'info') banner.classList.add(`banner--${tone}`);
  // Errors interrupt; everything else waits its turn.
  banner.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
  parts.icon.append(Icon(ICONS[tone]));
  setText(parts.message, message);
  if (action) {
    parts.action.replaceWith(action);
  }
  return banner;
}
