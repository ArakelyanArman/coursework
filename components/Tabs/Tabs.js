// @ts-check
import { h } from '../../js/core/dom.js';
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./Tabs.html', import.meta.url));

/**
 * Each tab is its own page, so this is a nav of links, not an ARIA tablist.
 * @param {object} props
 * @param {Text} props.label Accessible name of the nav.
 * @param {{ label: Text, href: string, current?: boolean }[]} props.items
 * @returns {HTMLElement}
 */
export function Tabs({ label, items }) {
  const tabs = create();
  setAttrText(tabs, 'aria-label', label);
  refs(tabs).track.append(
    ...items.map((item) => {
      const link = h('a', { class: 'tabs__tab', href: item.href, 'aria-current': item.current ? 'page' : null });
      setText(link, item.label);
      return link;
    }),
  );
  return tabs;
}
