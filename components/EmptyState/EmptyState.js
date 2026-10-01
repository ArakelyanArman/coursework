// @ts-check
import { ApiError } from '../../js/core/http.js';
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Button } from '../Button/Button.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./EmptyState.html', import.meta.url));

/**
 * @param {object} props
 * @param {import('../Icon/Icon.js').IconName} [props.icon]
 * @param {Text} props.title
 * @param {Text} [props.text]
 * @param {Element} [props.action]
 * @returns {HTMLElement}
 */
export function EmptyState({ icon = 'inbox', title, text, action }) {
  const state = create();
  const parts = refs(state);
  parts.icon.append(Icon(icon, 22));
  setText(parts.title, title);
  if (text) {
    setText(parts.text, text);
    parts.text.hidden = false;
  }
  if (action) {
    parts.action.append(action);
    parts.action.hidden = false;
  }
  return state;
}

/**
 * The error state of an async view, with a retry.
 * @param {object} props
 * @param {unknown} props.error An ApiError shows its own translated message.
 * @param {() => void} [props.onRetry]
 * @returns {HTMLElement}
 */
export function ErrorState({ error, onRetry }) {
  const key = error instanceof ApiError ? error.messageKey : 'errors.unknown';
  const params = error instanceof ApiError ? error.params : undefined;
  const state = EmptyState({
    icon: 'circle-alert',
    title: { key: 'states.errorTitle' },
    text: { key, params },
    action: onRetry
      ? Button({ label: { key: 'common.retry' }, variant: 'secondary', size: 'sm', onClick: onRetry })
      : undefined,
  });
  state.classList.add('empty-state--error');
  state.setAttribute('role', 'alert');
  return state;
}
