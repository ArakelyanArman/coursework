// @ts-check
import { h } from '../../js/core/dom.js';
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Chip.html', import.meta.url));

/**
 * A toggle chip.
 * @param {object} props
 * @param {Text} props.label
 * @param {boolean} [props.pressed]
 * @param {(event: MouseEvent) => void} [props.onClick]
 * @returns {HTMLButtonElement}
 */
export function Chip({ label, pressed = false, onClick }) {
  const chip = create();
  const parts = refs(chip);
  setText(parts.label, label);
  parts.icon.append(Icon('check', 14));
  setPressed(chip, pressed);
  if (onClick) chip.addEventListener('click', onClick);
  return chip;
}

/**
 * @param {Element} chip
 * @param {boolean} pressed
 */
export function setPressed(chip, pressed) {
  chip.setAttribute('aria-pressed', String(pressed));
  refs(chip).icon.hidden = !pressed;
}

/**
 * A chip for an active filter: pressing it removes the filter.
 * @param {object} props
 * @param {Text} props.label
 * @param {(event: MouseEvent) => void} props.onRemove
 * @returns {HTMLButtonElement}
 */
export function RemovableChip({ label, onRemove }) {
  const chip = create();
  const parts = refs(chip);
  // Read out before the label: "Remove filter: Romance".
  const prefix = h('span', { class: 'sr-only' });
  setText(prefix, { key: 'filters.remove' });
  parts.icon.replaceWith(prefix);
  setText(parts.label, label);
  parts.remove.append(Icon('x', 14));
  parts.remove.hidden = false;
  chip.addEventListener('click', onRemove);
  return chip;
}

/**
 * @param {object} props
 * @param {Text} props.label Accessible name of the group.
 * @param {Element[]} props.chips
 * @param {boolean} [props.wrap] Wrap onto more lines instead of scrolling sideways.
 * @returns {HTMLElement}
 */
export function ChipRow({ label, chips, wrap = false }) {
  const row = h('div', { class: ['chip-row', wrap && 'chip-row--wrap'], role: 'group' }, chips);
  setAttrText(row, 'aria-label', label);
  return row;
}
