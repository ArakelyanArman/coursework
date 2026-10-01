// @ts-check
import { h } from '../../js/core/dom.js';
import { applyTranslations, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { AvailabilityBadge } from '../Badge/Badge.js';
import { bookUrl, setAuthors } from '../BookCard/BookCard.js';
import { BookCover } from '../BookCover/BookCover.js';
import { Icon } from '../Icon/Icon.js';
import { Skeleton } from '../Skeleton/Skeleton.js';

/** @typedef {import('../../js/types.js').Book} Book */

const create = await loadTemplate(new URL('./BookListItem.html', import.meta.url));

const MAX_SUBJECTS = 4;

/**
 * Search results carry no description, so the first publish year and subjects stand in for it.
 * @param {Book} book
 * @returns {(Node | string)[]}
 */
function summary(book) {
  if (book.description) return [book.description];
  /** @type {(Node | string)[]} */
  const parts = [];
  if (book.firstPublishYear != null) {
    const year = h('span');
    setText(year, { key: 'book.firstPublished', params: { year: book.firstPublishYear } });
    parts.push(year);
  }
  const subjects = book.subjects.slice(0, MAX_SUBJECTS).join(', ');
  if (subjects) parts.push(parts.length > 0 ? ` · ${subjects}` : subjects);
  return parts;
}

/**
 * The horizontal card used in the Catalog list.
 * @param {{ book: Book }} props
 * @returns {HTMLElement}
 */
export function BookListItem({ book }) {
  const item = create();
  const parts = refs(item);
  applyTranslations(item);

  parts.cover.append(BookCover({ book }));
  parts.link.href = bookUrl(book);
  parts.link.textContent = book.title;
  setAuthors(parts.author, book);
  const badge = AvailabilityBadge(book);
  if (badge) parts.badges.append(badge);

  const text = summary(book);
  if (text.length > 0) parts.text.append(...text);
  else parts.text.remove();

  parts.more.append(Icon('arrow-right', 16));
  return item;
}

/** @returns {HTMLElement} */
export function BookListItemSkeleton() {
  return h(
    'div',
    { class: 'book-item', 'aria-hidden': true },
    h('div', { class: 'book-item__cover' }, Skeleton({ variant: 'cover' })),
    h(
      'div',
      { class: 'book-item__body' },
      Skeleton({ variant: 'title', width: '60%' }),
      Skeleton({ width: '35%' }),
      Skeleton({ width: '95%' }),
      Skeleton({ width: '88%' }),
      Skeleton({ width: '70%' }),
    ),
  );
}
