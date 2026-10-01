// @ts-check
import { uid } from '../../js/core/a11y.js';
import { h, render } from '../../js/core/dom.js';
import { applyTranslations, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Banner } from '../Banner/Banner.js';
import { BookCard, BookCardSkeleton } from '../BookCard/BookCard.js';
import { IconButton, setDisabled } from '../Button/Button.js';
import { ErrorState } from '../EmptyState/EmptyState.js';
import { Icon } from '../Icon/Icon.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */
/** @typedef {import('../../js/types.js').Book} Book */

/**
 * @typedef {HTMLElement & {
 *   showLoading: () => void,
 *   showBooks: (books: Book[], options?: { badge?: Text }) => void,
 *   showError: (error: unknown, onRetry: () => void) => void,
 * }} BookRailElement
 */

const create = await loadTemplate(new URL('./BookRail.html', import.meta.url));

const SKELETON_CARDS = 6;

/**
 * A titled, sideways-scrolling row of book cards with its own loading, empty and error states.
 * @param {object} props
 * @param {Text} props.title
 * @param {string} props.moreHref Where "Explore all" leads.
 * @returns {BookRailElement}
 */
export function BookRail({ title, moreHref }) {
  const rail = create();
  const parts = refs(rail);
  const id = uid('rail');
  /** @type {HTMLElement | null} */
  let track = null;

  const step = (/** @type {1 | -1} */ direction) => {
    track?.scrollBy({ left: direction * track.clientWidth * 0.8 });
  };
  const previous = IconButton({
    icon: 'chevron-left',
    label: { key: 'home.previous' },
    variant: 'secondary',
    onClick: () => step(-1),
  });
  const next = IconButton({
    icon: 'chevron-right',
    label: { key: 'home.next' },
    variant: 'secondary',
    onClick: () => step(1),
  });

  // The arrows switch off at either end, and both do when everything already fits.
  const syncNav = () => {
    if (!track) return;
    const end = track.scrollWidth - track.clientWidth;
    setDisabled(previous, track.scrollLeft <= 1);
    setDisabled(next, track.scrollLeft >= end - 1);
  };
  const resize = new ResizeObserver(syncNav);

  /** @param {Element[]} items */
  function showTrack(items) {
    resize.disconnect();
    track = h(
      'ul',
      { class: 'rail__track', role: 'list' },
      items.map((item) => h('li', { class: 'rail__item' }, item)),
    );
    track.addEventListener('scroll', syncNav, { passive: true });
    resize.observe(track);
    render(parts.body, track);
    parts.nav.hidden = false;
    syncNav();
  }

  /** @param {Element} message */
  function showMessage(message) {
    resize.disconnect();
    track = null;
    parts.nav.hidden = true;
    render(parts.body, message);
  }

  parts.title.id = `${id}-title`;
  setText(parts.title, title);
  rail.setAttribute('aria-labelledby', parts.title.id);

  // Read out as "Explore all Classics", so the three links on the page differ.
  parts.more.id = `${id}-more`;
  parts.more.href = moreHref;
  parts.more.setAttribute('aria-labelledby', `${parts.more.id} ${parts.title.id}`);
  parts.moreIcon.append(Icon('arrow-right', 16));
  parts.nav.append(previous, next);
  applyTranslations(rail);

  rail.showLoading = () => {
    rail.setAttribute('aria-busy', 'true');
    showTrack(Array.from({ length: SKELETON_CARDS }, BookCardSkeleton));
  };

  rail.showBooks = (/** @type {Book[]} */ books, { badge } = {}) => {
    rail.removeAttribute('aria-busy');
    if (books.length === 0) showMessage(Banner({ message: { key: 'home.empty' } }));
    else showTrack(books.map((book) => BookCard({ book, badge })));
  };

  rail.showError = (/** @type {unknown} */ error, /** @type {() => void} */ onRetry) => {
    rail.removeAttribute('aria-busy');
    showMessage(ErrorState({ error, onRetry }));
  };

  rail.showLoading();
  return rail;
}
