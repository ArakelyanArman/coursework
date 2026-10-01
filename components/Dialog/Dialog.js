// @ts-check
import { uid } from '../../js/core/a11y.js';
import { h } from '../../js/core/dom.js';
import { ApiError } from '../../js/core/http.js';
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Banner } from '../Banner/Banner.js';
import { Button, IconButton, setLoading } from '../Button/Button.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Dialog.html', import.meta.url));

/**
 * A native <dialog>: showModal() gives the focus trap, Esc and the backdrop.
 * @param {object} props
 * @param {Text} props.title
 * @param {Text} [props.description]
 * @param {Element | Element[]} [props.body]
 * @param {Element[]} [props.actions]
 * @param {import('../Icon/Icon.js').IconName} [props.icon] A warning icon beside the title.
 * @param {boolean} [props.closable] Show the × button. Defaults to true.
 * @param {boolean} [props.drawer] Slide in from the side instead of centring.
 * @returns {HTMLDialogElement}
 */
export function Dialog({ title, description, body, actions = [], icon, closable = true, drawer = false }) {
  const dialog = create();
  const parts = refs(dialog);
  const id = uid('dialog');

  parts.title.id = `${id}-title`;
  dialog.setAttribute('aria-labelledby', parts.title.id);
  setText(parts.title, title);
  if (drawer) dialog.classList.add('dialog--drawer');

  if (description) {
    parts.description.id = `${id}-description`;
    dialog.setAttribute('aria-describedby', parts.description.id);
    setText(parts.description, description);
    parts.description.hidden = false;
  }
  if (icon) {
    parts.icon.append(Icon(icon));
    parts.icon.hidden = false;
  }
  if (body) {
    parts.body.append(...[body].flat());
    parts.body.hidden = false;
  }
  if (closable) {
    parts.close.append(
      IconButton({ icon: 'x', label: { key: 'common.close' }, onClick: () => dialog.close() }),
    );
  }
  parts.actions.append(...actions);

  dialog.addEventListener('click', (/** @type {MouseEvent} */ event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

/**
 * Show a dialog. Focus returns to whatever had it when the dialog closes.
 * @param {HTMLDialogElement} dialog
 * @param {{ focus?: HTMLElement | null }} [options] Element to focus first; defaults to the first control.
 * @returns {Promise<string>} Resolves with the dialog's returnValue once it has closed.
 */
export function openDialog(dialog, { focus } = {}) {
  const opener = document.activeElement;
  document.body.append(dialog);
  dialog.showModal();
  focus?.focus();

  return new Promise((resolve) => {
    dialog.addEventListener(
      'close',
      () => {
        dialog.remove();
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        resolve(dialog.returnValue);
      },
      { once: true },
    );
  });
}

/**
 * Ask before a destructive action. Focus starts on Cancel so Enter never deletes by accident.
 * @param {object} props
 * @param {Text} props.title
 * @param {Text} props.message Say exactly what will be deleted.
 * @param {Text} [props.confirmLabel]
 * @returns {Promise<boolean>} True when the user confirmed.
 */
export async function confirmDialog({ title, message, confirmLabel = { key: 'common.delete' } }) {
  const cancel = Button({ label: { key: 'common.cancel' }, variant: 'secondary', onClick: () => dialog.close() });
  const confirm = Button({ label: confirmLabel, variant: 'danger', onClick: () => dialog.close('confirm') });
  const dialog = Dialog({
    title,
    description: message,
    icon: 'trash-2',
    closable: false,
    actions: [cancel, confirm],
  });
  return (await openDialog(dialog, { focus: cancel })) === 'confirm';
}

/**
 * A dialog around a form. `onSubmit` may throw an ApiError: its message is shown above the
 * fields and the dialog stays open.
 * @template T
 * @param {object} props
 * @param {Text} props.title
 * @param {Element[]} props.fields
 * @param {Text} [props.submitLabel]
 * @param {(form: HTMLFormElement) => Promise<T | false>} props.onSubmit Return false to keep the dialog open (validation failed).
 * @returns {Promise<T | null>} The submit result, or null when the user cancelled.
 */
export async function formDialog({ title, fields, submitLabel = { key: 'common.save' }, onSubmit }) {
  /** @type {T | null} */
  let result = null;
  const error = h('div', { hidden: true });
  const cancel = Button({ label: { key: 'common.cancel' }, variant: 'secondary', onClick: () => dialog.close() });
  const submit = Button({ label: submitLabel, type: 'submit' });
  const form = h(
    'form',
    { class: 'dialog__form', novalidate: true },
    error,
    fields,
    h('div', { class: 'dialog__actions' }, cancel, submit),
  );
  const dialog = Dialog({ title, body: form });

  form.addEventListener('submit', async (/** @type {SubmitEvent} */ event) => {
    event.preventDefault();
    error.hidden = true;
    setLoading(submit, true);
    try {
      const value = await onSubmit(form);
      if (value !== false) {
        result = value;
        dialog.close('submit');
      }
    } catch (failure) {
      const key = failure instanceof ApiError ? failure.messageKey : 'errors.unknown';
      const params = failure instanceof ApiError ? failure.params : undefined;
      error.replaceChildren(Banner({ tone: 'danger', message: { key, params } }));
      error.hidden = false;
    } finally {
      setLoading(submit, false);
    }
  });

  await openDialog(dialog, { focus: form.querySelector('input, select, textarea') });
  return result;
}
