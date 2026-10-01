// @ts-check
import { Navbar } from '../../../components/Navbar/Navbar.js';
import { toast } from '../../../components/Toast/Toast.js';
import { qs, render } from '../../core/dom.js';
import { box, caption } from './panel.js';

/** @typedef {import('../../types.js').User} User */

/** @type {User} */
const MEMBER = {
  id: 'u_002',
  fullName: 'Anna Petrosyan',
  email: 'member@library.am',
  role: 'member',
  createdAt: '2026-01-25T11:30:00Z',
};

/** @type {User} */
const ADMIN = {
  id: 'u_001',
  fullName: 'Gagik Hovhannisyan',
  email: 'admin@library.am',
  role: 'admin',
  createdAt: '2026-01-12T10:30:00Z',
};

/**
 * @param {string} labelKey
 * @param {User | null} user
 * @param {boolean} [narrow] Show the layout used below md, whatever the window width.
 */
function specimen(labelKey, user, narrow = false) {
  const navbar = Navbar({
    current: user?.role === 'admin' ? 'admin' : 'catalog',
    user,
    onLogout: () => toast({ title: { key: 'auth.loggedOut' } }),
  });
  if (narrow) navbar.classList.add('navbar--compact');
  return box(
    'stack gap-2',
    caption({ key: labelKey }, 't-label muted'),
    box(narrow ? 'design-specimen design-specimen--narrow' : 'design-specimen', navbar),
  );
}

export function renderShell() {
  render(
    qs('#shell-demo'),
    specimen('design.shell.guest', null),
    specimen('design.shell.member', MEMBER),
    specimen('design.shell.admin', ADMIN),
    specimen('design.shell.narrow', ADMIN, true),
  );
}
