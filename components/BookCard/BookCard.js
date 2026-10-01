// @ts-check
import { h } from '../../js/core/dom.js';
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { buildUrl } from '../../js/core/url-state.js';
import { Badge } from '../Badge/Badge.js';
import { BookCover } from '../BookCover/BookCover.js';
import { Skeleton } from '../Skeleton/Skeleton.js';

/** @typedef {import('../../js/types.js').Book} Book */

const create = await loadTemplate(new URL('./BookCard.html', import.meta.url));

/** @param {Book} book */
export const bookUrl = (book) => buildUrl('book.html', { id: book.id });

/**
 * @param {Element} element
 * @param {Book} book
 */
export function setAuthors(element, book) {
  setText(element, book.authors.length > 0 ? book.authors.join(', ') : { key: 'book.unknownAuthor' });
}

/**
 * The vertical card used in the Home rails. The whole card is one link.
 * @param {object} props
 * @param {Book} props.book
 * @param {import('../../js/core/i18n.js').Text} [props.badge] e.g. "Trending".
 * @returns {HTMLAnchorElement}
 */
export function BookCard({ book, badge }) {
  const card = create();
  const parts = refs(card);
  card.href = bookUrl(book);
  parts.cover.append(BookCover({ book }));
  parts.title.textContent = book.title;
  setAuthors(parts.author, book);
  if (badge) {
    parts.badge.append(Badge({ label: badge, tone: 'accent' }));
    parts.badge.hidden = false;
  }
  return card;
}

/** @returns {HTMLElement} */
export function BookCardSkeleton() {
  return h(
    'div',
    { class: 'book-card', 'aria-hidden': true },
    h('span', { class: 'book-card__cover' }, Skeleton({ variant: 'cover' })),
    Skeleton({ width: '85%' }),
    Skeleton({ width: '55%' }),
  );
}
