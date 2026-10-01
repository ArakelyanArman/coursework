// @ts-check
import { uid } from '../../js/core/a11y.js';
import { h } from '../../js/core/dom.js';
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Select.html', import.meta.url));

/**
 * A native <select>, restyled.
 * @param {object} props
 * @param {Text} props.label
 * @param {boolean} [props.hideLabel]
 * @param {{ value: string, label: Text }[]} props.options
 * @param {string} [props.value]
 * @param {string} [props.name]
 * @param {'sm' | 'md'} [props.size]
 * @param {(value: string) => void} [props.onChange]
 * @returns {HTMLElement}
 */
export function Select({ label, hideLabel = false, options, value, name, size = 'md', onChange }) {
  const field = create();
  const parts = refs(field);
  const id = uid('select');

  parts.input.id = id;
  if (name) parts.input.name = name;
  parts.label.htmlFor = id;
  setText(parts.label, label);
  if (hideLabel) parts.label.classList.add('sr-only');
  if (size === 'sm') field.classList.add('select--sm');
  parts.chevron.append(Icon('chevron-down', 16));

  for (const option of options) {
    const element = h('option', { value: option.value });
    setText(element, option.label);
    parts.input.append(element);
  }
  if (value != null) parts.input.value = value;
  if (onChange) parts.input.addEventListener('change', () => onChange(parts.input.value));
  return field;
}
