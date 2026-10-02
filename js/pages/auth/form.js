// @ts-check
import { Banner } from '../../../components/Banner/Banner.js';
import { Button, setLoading } from '../../../components/Button/Button.js';
import { inputOf, setFieldError } from '../../../components/TextField/TextField.js';
import { qs, render } from '../../core/dom.js';
import { setFlash } from '../../core/flash.js';
import { ApiError } from '../../core/http.js';
import { buildUrl, readParams, safeReturnTo } from '../../core/url-state.js';
import { validate } from '../../core/validate.js';
import { homeFor } from '../../guards.js';

/** @typedef {import('../../core/i18n.js').Text} Text */
/** @typedef {import('../../types.js').User} User */

const { returnTo } = readParams({ returnTo: { type: 'string' } });

/**
 * The Login and Register forms differ only in their fields: this fills the page's form,
 * validates it, shows errors where they belong and moves on once the user is signed in.
 * @param {object} options
 * @param {Record<string, HTMLElement>} options.fields TextFields by name, in display order.
 * @param {import('../../core/validate.js').Schema} options.schema
 * @param {Text} options.submitLabel
 * @param {(values: Record<string, string>) => Promise<User>} options.submit
 * @param {Record<string, string>} [options.fieldErrors] API error code → the field to show it under.
 * @param {string} options.welcomeKey Shown on the next page; takes {name}.
 * @param {string} options.switchPage The other form, linked below this one.
 */
export function mountAuthForm({
  fields,
  schema,
  submitLabel,
  submit,
  fieldErrors = {},
  welcomeKey,
  switchPage,
}) {
  const form = qs('#auth-form');
  const errorBox = qs('#auth-error');
  const button = Button({ label: submitLabel, type: 'submit' });

  render(qs('#auth-fields'), Object.values(fields));
  render(qs('#auth-submit'), button);
  // The other form keeps the destination, so registering instead of logging in ends up there too.
  qs('#auth-switch').href = buildUrl(switchPage, { returnTo });

  /** @param {Text | null} message */
  const showFormError = (message) => {
    errorBox.hidden = !message;
    render(errorBox, message && Banner({ tone: 'danger', message }));
  };

  /** @param {Record<string, import('../../core/validate.js').ValidationError>} errors */
  const showFieldErrors = (errors) => {
    for (const [name, field] of Object.entries(fields)) setFieldError(field, errors[name] ?? null);
    const first = Object.keys(fields).find((name) => errors[name]);
    if (first) inputOf(fields[first]).focus();
  };

  form.addEventListener('submit', async (/** @type {SubmitEvent} */ event) => {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(fields).map(([name, field]) => [name, inputOf(field).value]),
    );
    const { valid, errors } = validate(schema, values);
    showFormError(null);
    showFieldErrors(errors);
    if (!valid) return;

    setLoading(button, true);
    try {
      const user = await submit(values);
      setFlash({ title: { key: welcomeKey, params: { name: user.fullName } }, tone: 'success' });
      window.location.replace(safeReturnTo(returnTo, homeFor(user)));
    } catch (error) {
      setLoading(button, false);
      if (!(error instanceof ApiError)) {
        showFormError({ key: 'errors.unknown' });
        return;
      }
      const message = { key: error.messageKey, params: error.params };
      const field = fieldErrors[error.code];
      if (field) showFieldErrors({ [field]: message });
      else showFormError(message);
    }
  });

  inputOf(Object.values(fields)[0]).focus();
}
