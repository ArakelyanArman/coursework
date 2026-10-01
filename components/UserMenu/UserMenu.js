// @ts-check
import { rovingTabindex, uid } from '../../js/core/a11y.js';
import { applyTranslations, setAttrText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Avatar } from '../Avatar/Avatar.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/types.js').User} User */

const create = await loadTemplate(new URL('./UserMenu.html', import.meta.url));

/**
 * A menu button: Enter, Space or the arrow keys open it, arrows move between the items,
 * Esc closes it and returns focus to the button.
 * @param {object} props
 * @param {User} props.user
 * @param {() => void} props.onLogout
 * @returns {HTMLElement}
 */
export function UserMenu({ user, onLogout }) {
  const root = create();
  const parts = refs(root);
  const { button, menu } = parts;
  const id = uid('user-menu');

  parts.avatar.replaceWith(Avatar({ name: user.fullName }));
  parts.name.textContent = user.fullName;
  parts.chevron.append(Icon('chevron-down', 16));
  parts.fullName.textContent = user.fullName;
  parts.email.textContent = user.email;
  parts.logoutIcon.append(Icon('log-out', 18));

  menu.id = id;
  parts.header.id = `${id}-header`;
  menu.setAttribute('aria-labelledby', parts.header.id);
  button.setAttribute('aria-controls', id);
  setAttrText(button, 'aria-label', { key: 'nav.account', params: { name: user.fullName } });
  applyTranslations(root);

  const items = rovingTabindex(menu, { selector: '[role="menuitem"]', orientation: 'vertical' });

  /** @param {PointerEvent} event */
  const onOutside = (event) => {
    if (event.target instanceof Node && !root.contains(event.target)) close(false);
  };

  /** @param {number} index Item to focus: 0 is the first, -1 the last. */
  function open(index = 0) {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    items.focusItem(index);
    document.addEventListener('pointerdown', onOutside);
  }

  /** @param {boolean} [returnFocus] */
  function close(returnFocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside);
    if (returnFocus) button.focus();
  }

  button.addEventListener('click', () => (menu.hidden ? open() : close()));

  button.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open(event.key === 'ArrowDown' ? 0 : -1);
  });

  menu.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      // Focus goes back to the button first, so Tab continues from there.
      close();
    }
  });

  root.addEventListener('focusout', (/** @type {FocusEvent} */ event) => {
    if (event.relatedTarget instanceof Node && !root.contains(event.relatedTarget)) close(false);
  });

  parts.logout.addEventListener('click', () => {
    close();
    onLogout();
  });

  return root;
}
