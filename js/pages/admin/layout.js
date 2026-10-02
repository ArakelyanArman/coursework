// @ts-check
import { Tabs } from '../../../components/Tabs/Tabs.js';
import { qs, render } from '../../core/dom.js';
import { pageUrl } from '../../core/paths.js';
import { mountShell } from '../../shell.js';

const SECTIONS = /** @type {const} */ ([
  { id: 'books', labelKey: 'admin.tabs.books', path: 'admin/books.html' },
  { id: 'reports', labelKey: 'admin.tabs.reports', path: 'admin/reports.html' },
  { id: 'users', labelKey: 'admin.tabs.users', path: 'admin/users.html' },
]);

/**
 * Every admin page starts here. The access check runs first: nothing of the page is built
 * for a visitor who is not an admin.
 * @param {typeof SECTIONS[number]['id']} current
 */
export async function mountAdmin(current) {
  await mountShell({ page: 'admin', access: 'admin' });
  const tabs = Tabs({
    label: { key: 'admin.tabsLabel' },
    items: SECTIONS.map(({ id, labelKey, path }) => ({
      label: { key: labelKey },
      href: pageUrl(path),
      current: id === current,
    })),
  });
  render(qs('#admin-tabs'), tabs);
  // On a phone the tab bar scrolls sideways: start with the current tab in view.
  tabs.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
