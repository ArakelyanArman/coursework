// @ts-check
import { uid } from '../../js/core/a11y.js';
import { h } from '../../js/core/dom.js';
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { IconButton, setIcon, setLabel } from '../Button/Button.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */
/** @typedef {import('../../js/core/validate.js').ValidationError} ValidationError */

const create = await loadTemplate(new URL('./TextField.html', import.meta.url));

/**
 * @typedef {object} TextFieldProps
 * @property {Text} label
 * @property {boolean} [hideLabel] Keep the label for screen readers only.
 * @property {string} [name]
 * @property {string} [type]
 * @property {string} [value]
 * @property {Text} [placeholder]
 * @property {Text} [helper]
 * @property {string} [autocomplete]
 * @property {string} [inputMode]
 * @property {boolean} [required]
 * @property {boolean} [disabled]
 * @property {boolean} [multiline] A textarea instead of a one-line input.
 * @property {import('../Icon/Icon.js').IconName} [icon] Leading icon.
 * @property {Element} [trailing] A control placed inside the field's end, e.g. an IconButton.
 * @property {(event: Event) => void} [onInput]
 * @property {(event: Event) => void} [onChange]
 */

/** @param {TextFieldProps} props @returns {HTMLElement} */
export function TextField({
  label,
  hideLabel = false,
  name,
  type = 'text',
  value = '',
  placeholder,
  helper,
  autocomplete,
  inputMode,
  required = false,
  disabled = false,
  multiline = false,
  icon,
  trailing,
  onInput,
  onChange,
}) {
  const field = create();
  if (multiline) {
    const textarea = h('textarea', { class: 'field__input field__input--multiline', rows: 4 });
    textarea.dataset.ref = 'input';
    refs(field).input.replaceWith(textarea);
  }
  const parts = refs(field);
  const { input } = parts;
  const id = uid('field');

  input.id = id;
  if (!multiline) input.type = type;
  input.value = value;
  input.required = required;
  input.disabled = disabled;
  if (name) input.name = name;
  if (autocomplete) input.autocomplete = autocomplete;
  if (inputMode) input.inputMode = inputMode;
  if (placeholder) setAttrText(input, 'placeholder', placeholder);

  parts.label.htmlFor = id;
  setText(parts.label, label);
  if (hideLabel) parts.label.classList.add('sr-only');

  parts.helper.id = `${id}-helper`;
  parts.error.id = `${id}-error`;
  parts.errorIcon.append(Icon('circle-alert', 14));
  if (helper) {
    setText(parts.helper, helper);
    parts.helper.hidden = false;
    input.setAttribute('aria-describedby', parts.helper.id);
  }

  if (icon) {
    parts.lead.append(Icon(icon));
    parts.lead.hidden = false;
    field.classList.add('field--lead');
  }
  if (trailing) {
    parts.trail.append(trailing);
    parts.trail.hidden = false;
    field.classList.add('field--trail');
  }

  if (onInput) input.addEventListener('input', onInput);
  if (onChange) input.addEventListener('change', onChange);
  return field;
}

/** @param {Element} field @returns {HTMLInputElement} The input (a textarea when multiline). */
export const inputOf = (field) => refs(field).input;

/**
 * Show or clear the field's error, wiring aria-invalid and aria-describedby.
 * @param {Element} field
 * @param {ValidationError | null} error
 */
export function setFieldError(field, error) {
  const { input, error: message, errorText, helper } = refs(field);
  message.hidden = !error;
  setText(errorText, error ? { key: error.key, params: error.params } : null);

  if (error) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');

  const described = [helper.hidden ? null : helper.id, error ? message.id : null].filter(Boolean);
  if (described.length > 0) input.setAttribute('aria-describedby', described.join(' '));
  else input.removeAttribute('aria-describedby');
}

/** @param {Omit<TextFieldProps, 'type' | 'trailing'>} props @returns {HTMLElement} */
export function PasswordField(props) {
  const toggle = IconButton({
    icon: 'eye',
    label: { key: 'field.showPassword' },
    size: 'md',
    pressed: false,
    onClick: () => {
      const input = inputOf(field);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      setIcon(toggle, show ? 'eye-off' : 'eye');
      setLabel(toggle, { key: show ? 'field.hidePassword' : 'field.showPassword' });
    },
  });
  const field = TextField({ ...props, type: 'password', trailing: toggle });
  return field;
}
