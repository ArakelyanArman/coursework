// @ts-check
import { h } from '../../js/core/dom.js';
import { applyTranslations, localizeNumber, setAttrText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Icon } from '../Icon/Icon.js';

const create = await loadTemplate(new URL('./Pagination.html', import.meta.url));

/**
 * Pages to show: first, last, the current page and its neighbours; 0 marks a gap.
 * @param {number} page
 * @param {number} pageCount
 * @returns {number[]}
 */
function pageList(page, pageCount) {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  // A gap of one page is shown as that page: an ellipsis would take the same room.
  if (wanted.has(3)) wanted.add(2);
  if (wanted.has(pageCount - 2)) wanted.add(pageCount - 1);

  /** @type {number[]} */
  const pages = [];
  for (const number of [...wanted].sort((a, b) => a - b)) {
    if (pages.length > 0 && number - pages[pages.length - 1] > 1) pages.push(0);
    pages.push(number);
  }
  return pages;
}

/**
 * Real links, so middle-click and "open in new tab" work.
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.pageCount
 * @param {(page: number) => string} props.hrefFor
 * @param {(page: number) => void} [props.onNavigate] Handles plain clicks in place; modified clicks follow the link.
 * @returns {HTMLElement | null} Null when there is only one page.
 */
export function Pagination({ page, pageCount, hrefFor, onNavigate }) {
  if (pageCount <= 1) return null;
  const nav = create();
  applyTranslations(nav);

  /**
   * @param {number} target
   * @param {Node | string} content
   * @param {string} [labelKey]
   */
  const link = (target, content, labelKey) => {
    const outOfRange = target < 1 || target > pageCount;
    const element = h(
      'a',
      {
        class: 'pagination__link',
        href: outOfRange ? null : hrefFor(target),
        'aria-current': target === page ? 'page' : null,
        'aria-disabled': outOfRange ? 'true' : null,
        role: outOfRange ? 'link' : null,
      },
      content,
    );
    setAttrText(element, 'aria-label', { key: labelKey ?? 'pagination.page', params: { page: target } });
    return h('li', element);
  };

  refs(nav).list.append(
    link(page - 1, Icon('chevron-left'), 'pagination.previous'),
    ...pageList(page, pageCount).map((number) =>
      number === 0
        ? h('li', { class: 'pagination__gap', 'aria-hidden': true }, '…')
        : link(number, localizeNumber(number)),
    ),
    link(page + 1, Icon('chevron-right'), 'pagination.next'),
  );

  if (onNavigate) {
    nav.addEventListener('click', (/** @type {MouseEvent} */ event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      onNavigate(Number(new URL(/** @type {HTMLAnchorElement} */ (anchor).href).searchParams.get('page') ?? 1));
    });
  }
  return nav;
}
