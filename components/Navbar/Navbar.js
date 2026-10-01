// @ts-check
import { h, render } from '../../js/core/dom.js';
import { applyTranslations, setAttrText, setText } from '../../js/core/i18n.js';
import { pageUrl } from '../../js/core/paths.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Avatar } from '../Avatar/Avatar.js';
import { Button, IconButton } from '../Button/Button.js';
import { Dialog, openDialog } from '../Dialog/Dialog.js';
import { Icon } from '../Icon/Icon.js';
import { LanguageSwitch } from '../LanguageSwitch/LanguageSwitch.js';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle.js';
import { UserMenu } from '../UserMenu/UserMenu.js';

/** @typedef {import('../../js/types.js').User} User */
/** @typedef {'home' | 'catalog' | 'admin'} NavItem */

const create = await loadTemplate(new URL('./Navbar.html', import.meta.url));
const desktop = window.matchMedia('(min-width: 768px)');

const LINKS = /** @type {const} */ ([
  { id: 'home', key: 'nav.home', path: 'index.html' },
  { id: 'catalog', key: 'nav.catalog', path: 'catalog.html' },
]);

/**
 * @param {object} [props]
 * @param {NavItem | null} [props.current] The section the page belongs to.
 * @param {User | null} [props.user] Null for a guest.
 * @param {() => void} [props.onLogout]
 * @param {() => string} [props.loginHref] Read on click, so it can carry the current URL.
 * @returns {HTMLElement & { update: (user: User | null) => void }}
 */
export function Navbar({
  current = null,
  user = null,
  onLogout = () => {},
  loginHref = () => pageUrl('login.html'),
} = {}) {
  const navbar = create();
  const parts = refs(navbar);
  const language = LanguageSwitch();
  const theme = ThemeToggle();
  /** @type {HTMLDialogElement | null} */
  let drawer = null;

  /** @param {string} className */
  const links = (className) =>
    LINKS.map(({ id, key, path }) => {
      const link = h('a', {
        class: className,
        href: pageUrl(path),
        'aria-current': id === current ? 'page' : null,
      });
      setText(link, { key });
      return link;
    });

  /** @param {boolean} [block] */
  const adminButton = (block = false) => {
    const button = Button({
      label: { key: 'nav.admin' },
      variant: 'secondary',
      icon: 'shield',
      href: pageUrl('admin/books.html'),
      block,
    });
    if (current === 'admin') button.setAttribute('aria-current', 'page');
    return button;
  };

  /** @param {boolean} [block] */
  const loginButton = (block = false) => {
    const button = /** @type {HTMLAnchorElement} */ (
      Button({ label: { key: 'nav.login' }, href: loginHref(), block })
    );
    button.addEventListener('click', () => {
      button.href = loginHref();
    });
    return button;
  };

  function drawerAccount() {
    if (!user) return loginButton(true);
    return [
      h(
        'div',
        { class: 'navbar-drawer__user' },
        Avatar({ name: user.fullName }),
        h(
          'div',
          { class: 'navbar-drawer__identity' },
          h('span', { class: 't-label' }, user.fullName),
          h('span', { class: 't-caption muted' }, user.email),
        ),
      ),
      user.role === 'admin' && adminButton(true),
      Button({
        label: { key: 'nav.logout' },
        variant: 'secondary',
        icon: 'log-out',
        block: true,
        onClick: () => {
          drawer?.close();
          onLogout();
        },
      }),
    ];
  }

  function buildDrawer() {
    const nav = h('nav', { class: 'navbar-drawer__links' }, links('navbar-drawer__link'));
    setAttrText(nav, 'aria-label', { key: 'nav.primary' });
    const dialog = Dialog({
      title: { key: 'nav.menu' },
      drawer: 'end',
      body: [
        nav,
        h('div', { class: 'navbar-drawer__account' }, drawerAccount()),
        h('div', { class: 'navbar-drawer__settings' }, LanguageSwitch(), ThemeToggle()),
      ],
    });
    dialog.classList.add('navbar-drawer');
    return dialog;
  }

  /** @param {User | null} next */
  function update(next) {
    user = next;
    drawer?.close();
    drawer = null;
    render(
      parts.actions,
      user?.role === 'admin' && adminButton(),
      user ? UserMenu({ user, onLogout }) : loginButton(),
      language,
      theme,
    );
  }

  const toggle = IconButton({
    icon: 'menu',
    label: { key: 'nav.openMenu' },
    onClick: () => {
      drawer ??= buildDrawer();
      openDialog(drawer);
    },
  });
  toggle.setAttribute('aria-haspopup', 'dialog');

  parts.brand.href = pageUrl('index.html');
  parts.mark.append(Icon('book-open', 18));
  parts.links.append(...links('navbar__link'));
  parts.toggle.append(toggle);
  applyTranslations(navbar);
  update(user);

  // The drawer belongs to the narrow layout only.
  desktop.addEventListener('change', (event) => {
    if (event.matches) drawer?.close();
  });

  return Object.assign(navbar, { update });
}
