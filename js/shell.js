// @ts-check
import { Footer } from '../components/Footer/Footer.js';
import { Navbar } from '../components/Navbar/Navbar.js';
import { ScrollTop } from '../components/ScrollTop/ScrollTop.js';
import { toast } from '../components/Toast/Toast.js';
import { h, qs } from './core/dom.js';
import { EVENTS, on } from './core/events.js';
import { setFlash, takeFlash } from './core/flash.js';
import { initI18n, setText } from './core/i18n.js';
import { pageUrl } from './core/paths.js';
import { initTheme } from './core/theme.js';
import { guard, loginUrl } from './guards.js';
import { currentUser, logout, refreshSession } from './services/auth.js';

/** @typedef {import('./guards.js').Access} Access */
/**
 * @typedef {'home' | 'catalog' | 'book' | 'login' | 'register' | 'admin' | 'design' |
 *   'notFound'} Page
 */

/** The navbar link each page lights up. */
const NAV_ITEM = /** @type {const} */ ({
  home: 'home',
  catalog: 'catalog',
  book: 'catalog',
  admin: 'admin',
});

/** Pages a visitor comes back to after logging in from the navbar. */
const RETURN_AFTER_LOGIN = new Set(['catalog', 'book']);

/**
 * Every page calls this first. It checks access, loads the translations and puts the skip link,
 * navbar, back-to-top button, footer and toast region around the page's <main id="main">.
 * @param {object} [options]
 * @param {Page} [options.page]
 * @param {Access} [options.access]
 * @returns {Promise<{ main: HTMLElement }>} Never settles when the visitor is being redirected.
 */
export async function mountShell({ page, access = 'public' } = {}) {
  initTheme();
  if (!guard(access)) return new Promise(() => {});
  await initI18n();

  let signingOut = false;

  async function signOut() {
    signingOut = true;
    await logout().catch(() => {});
    if (access === 'public') {
      signingOut = false;
      toast({ title: { key: 'auth.loggedOut' } });
      return;
    }
    setFlash({ title: { key: 'auth.loggedOut' } });
    window.location.assign(pageUrl('index.html'));
  }

  /** @type {HTMLElement} */
  const main = qs('#main');
  main.tabIndex = -1;

  const skipLink = h('a', { class: 'skip-link', href: '#main' });
  setText(skipLink, { key: 'common.skipToContent' });

  const navbar = Navbar({
    current: (page && NAV_ITEM[/** @type {keyof typeof NAV_ITEM} */ (page)]) || null,
    user: currentUser(),
    onLogout: signOut,
    loginHref: () => (page && RETURN_AFTER_LOGIN.has(page) ? loginUrl() : pageUrl('login.html')),
  });

  main.before(skipLink, navbar);
  main.after(ScrollTop({ target: main }), Footer());
  document.body.dataset.shell = 'ready';

  on(EVENTS.AUTH_CHANGE, ({ detail }) => {
    navbar.update(currentUser());
    // A guest page handles its own login; it only reacts to a login made in another tab.
    if (signingOut || (access === 'guest' && detail?.source !== 'remote')) return;
    guard(access);
  });

  const flash = takeFlash();
  if (flash) toast(flash);

  refreshSession();
  return { main };
}
