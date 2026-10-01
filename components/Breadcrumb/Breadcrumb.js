// @ts-check
import { h } from '../../js/core/dom.js';
import { applyTranslations, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Breadcrumb.html', import.meta.url));

/**
 * @param {{ items: { label: Text, href?: string }[] }} props The last item is the current page.
 * @returns {HTMLElement}
 */
export function Breadcrumb({ items }) {
  const nav = create();
  applyTranslations(nav);

  for (const { label, href } of items) {
    const entry = href
      ? h('a', { class: 'breadcrumb__link', href })
      : h('span', { class: 'breadcrumb__current', 'aria-current': 'page' });
    setText(entry, label);
    refs(nav).list.append(h('li', { class: 'breadcrumb__item' }, entry));
  }
  return nav;
}
