// @ts-check
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Checkbox.html', import.meta.url));

/**
 * @typedef {object} CheckProps
 * @property {Text} label
 * @property {boolean} [hideLabel] No visible text: the label becomes the input's aria-label.
 * @property {boolean} [checked]
 * @property {boolean} [indeterminate] Checkbox only.
 * @property {boolean} [disabled]
 * @property {string} [name]
 * @property {string} [value]
 * @property {(checked: boolean, event: Event) => void} [onChange]
 */

/**
 * @param {'checkbox' | 'radio'} type
 * @param {CheckProps} props
 */
function build(type, { label, hideLabel = false, checked = false, indeterminate = false, disabled = false, name, value, onChange }) {
  const row = create();
  const { input, label: text } = refs(row);

  input.type = type;
  input.checked = checked;
  input.indeterminate = indeterminate;
  input.disabled = disabled;
  if (name) input.name = name;
  if (value != null) input.value = value;

  if (hideLabel) {
    setAttrText(input, 'aria-label', label);
    text.remove();
    row.classList.add('check--bare');
  } else {
    setText(text, label);
  }
  if (onChange) input.addEventListener('change', (/** @type {Event} */ event) => onChange(input.checked, event));
  return row;
}

/** @param {CheckProps} props @returns {HTMLLabelElement} */
export const Checkbox = (props) => build('checkbox', props);

/** @param {CheckProps} props Only for mutually exclusive options. @returns {HTMLLabelElement} */
export const Radio = (props) => build('radio', props);

/** @param {Element} row @returns {HTMLInputElement} */
export const checkInput = (row) => refs(row).input;
