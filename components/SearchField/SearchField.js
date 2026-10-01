// @ts-check
import { loadTemplate, refs } from '../../js/core/template.js';
import { Button } from '../Button/Button.js';
import { TextField, inputOf } from '../TextField/TextField.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./SearchField.html', import.meta.url));

/**
 * @param {object} props
 * @param {Text} props.label Accessible name of the input.
 * @param {Text} [props.placeholder]
 * @param {string} [props.value]
 * @param {'md' | 'lg'} [props.size]
 * @param {(query: string) => void} props.onSubmit
 * @returns {HTMLFormElement}
 */
export function SearchField({ label, placeholder, value = '', size = 'md', onSubmit }) {
  const form = create();
  const parts = refs(form);
  const field = TextField({ label, hideLabel: true, type: 'search', name: 'q', value, placeholder, icon: 'search' });

  if (size === 'lg') form.classList.add('search-field--lg');
  parts.field.append(field);
  parts.button.replaceWith(Button({ label: { key: 'common.search' }, type: 'submit', size }));
  form.addEventListener('submit', (/** @type {SubmitEvent} */ event) => {
    event.preventDefault();
    onSubmit(inputOf(field).value.trim());
  });
  return form;
}
