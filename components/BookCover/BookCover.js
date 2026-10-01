// @ts-check
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { coverUrl } from '../../js/services/books.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/types.js').Book} Book */

const create = await loadTemplate(new URL('./BookCover.html', import.meta.url));

// Intrinsic size hints, so the browser reserves the 2:3 box before the image arrives.
const WIDTH = 200;
const HEIGHT = 300;

/** @param {string} id A stable hue per book, so its fallback cover always looks the same. */
function hueOf(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

/**
 * @param {object} props
 * @param {Book} props.book
 * @param {'S' | 'M' | 'L'} [props.size] Which Open Library image to request.
 * @param {boolean} [props.thumb] The small table thumbnail.
 * @param {boolean} [props.eager] Load at once (above the fold) instead of lazily.
 * @returns {HTMLElement}
 */
export function BookCover({ book, size = 'M', thumb = false, eager = false }) {
  const cover = create();
  const { img, fallback, title, author, icon } = refs(cover);
  const alt = { key: 'book.coverAlt', params: { title: book.title } };

  cover.style.setProperty('--cover-hue', String(hueOf(book.id)));
  if (thumb) cover.classList.add('book-cover--thumb');

  const showFallback = () => {
    img.remove();
    title.textContent = book.title;
    if (book.authors.length > 0) author.textContent = book.authors[0];
    else setText(author, { key: 'book.unknownAuthor' });
    icon.replaceChildren(Icon('book-open'));
    fallback.hidden = false;
    cover.setAttribute('role', 'img');
    setAttrText(cover, 'aria-label', alt);
  };

  const url = coverUrl(book, size);
  if (!url) {
    showFallback();
    return cover;
  }

  img.width = WIDTH;
  img.height = HEIGHT;
  img.loading = eager ? 'eager' : 'lazy';
  setAttrText(img, 'alt', alt);
  img.addEventListener('load', () => cover.classList.add('book-cover--loaded'), { once: true });
  img.addEventListener('error', showFallback, { once: true });
  img.src = url;
  return cover;
}
