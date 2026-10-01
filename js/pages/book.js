// @ts-check
import { AvailabilityBadge, Badge } from '../../components/Badge/Badge.js';
import { setAuthors } from '../../components/BookCard/BookCard.js';
import { BookCover } from '../../components/BookCover/BookCover.js';
import { Breadcrumb } from '../../components/Breadcrumb/Breadcrumb.js';
import { Button } from '../../components/Button/Button.js';
import { EmptyState, ErrorState } from '../../components/EmptyState/EmptyState.js';
import { Skeleton } from '../../components/Skeleton/Skeleton.js';
import { uid } from '../core/a11y.js';
import { h, qs, render } from '../core/dom.js';
import { ApiError } from '../core/http.js';
import { setAttrText, setText } from '../core/i18n.js';
import { pageUrl } from '../core/paths.js';
import { refs } from '../core/template.js';
import { readParams, writeParams } from '../core/url-state.js';
import { categoryById, getBook } from '../services/books.js';
import { mountShell } from '../shell.js';
import { BookingBox } from './book/booking.js';

/** @typedef {import('../types.js').Book} Book */

const SCHEMA = /** @type {import('../core/url-state.js').ParamSchema} */ ({
  id: { type: 'string' },
  from: { type: 'string' },
  to: { type: 'string' },
});

// Longer descriptions start folded to about this many characters.
const FOLD_AFTER = 600;
const FOLDED_LENGTH = 420;
const META_DESCRIPTION_LENGTH = 155;
const MAX_SUBJECTS = 6;

await mountShell({ page: 'book' });

const root = qs('#book-root');
const params = readParams(SCHEMA);

/** @param {string} text @param {number} length @returns {string} Cut at a word, with an ellipsis. */
function shorten(text, length) {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), length / 2)).trimEnd()}…`;
}

/** @param {Book} book */
function setPageMeta(book) {
  setText(qs('#page-title'), { key: 'book.pageTitleFor', params: { title: book.title } });
  const summary = book.description ?? [book.title, ...book.authors].join(' · ');
  setAttrText(
    qs('#page-description'),
    'content',
    shorten(summary.replace(/\s+/g, ' '), META_DESCRIPTION_LENGTH),
  );
}

/** @param {Book} book @returns {HTMLElement} */
function Description(book) {
  const box = h('div', { class: 'book-description t-body-lg' });

  if (!book.description) {
    const note = h('p', { class: 'muted' });
    setText(note, { key: 'book.noDescription' });
    box.append(note);
    if (book.subjects.length > 0) {
      const subjects = h('p', { class: 't-body-sm muted' });
      setText(subjects, {
        key: 'book.subjects',
        params: { list: book.subjects.slice(0, MAX_SUBJECTS).join(', ') },
      });
      box.append(subjects);
    }
    return box;
  }

  const full = book.description;
  const text = h('div', { class: 'book-description__text', id: uid('description') });
  const paragraphs = (/** @type {string} */ value) =>
    value.split(/\n{2,}/).map((paragraph) => h('p', paragraph.trim()));
  box.append(text);

  if (full.length <= FOLD_AFTER) {
    render(text, paragraphs(full));
    return box;
  }

  let open = false;
  const toggle = Button({ label: { key: 'book.readMore' }, variant: 'link' });
  toggle.classList.add('book-description__toggle');
  toggle.setAttribute('aria-controls', text.id);
  const sync = () => {
    render(text, paragraphs(open ? full : shorten(full, FOLDED_LENGTH)));
    toggle.setAttribute('aria-expanded', String(open));
    setText(refs(toggle).label, { key: open ? 'book.readLess' : 'book.readMore' });
  };
  toggle.addEventListener('click', () => {
    open = !open;
    sync();
  });
  sync();
  box.append(toggle);
  return box;
}

/** @param {Book} book @returns {Element[]} Category, first publish year and availability. */
function metaBadges(book) {
  const badges = [];
  const category = categoryById(book.category);
  if (category) badges.push(Badge({ label: { key: category.labelKey } }));
  if (book.firstPublishYear != null) {
    badges.push(
      Badge({ label: { key: 'book.firstPublished', params: { year: book.firstPublishYear } } }),
    );
  }
  const availability = AvailabilityBadge(book, { detailed: true });
  if (availability) badges.push(availability);
  return badges;
}

/** @param {Book} book */
function showBook(book) {
  setPageMeta(book);

  const title = h('h1', { class: 't-h1' }, book.title);
  const authors = h('p', { class: 't-body-lg muted' });
  setAuthors(authors, book);
  const meta = h('div', { class: 'book-panel__meta' }, metaBadges(book));

  const booking = BookingBox({
    book,
    from: params.from,
    to: params.to,
    // Kept in the address, so the dates survive the trip to the login page and back.
    onRangeChange: ({ from, to }) => writeParams({ id: book.id, from, to }, SCHEMA, { replace: true }),
    // A new booking can change today's availability.
    onBooked: async () => render(meta, metaBadges(await getBook(book.id))),
  });

  render(
    root,
    Breadcrumb({
      items: [{ label: { key: 'nav.catalog' }, href: pageUrl('catalog.html') }, { label: book.title }],
    }),
    h(
      'article',
      { class: 'book-panel' },
      h('div', { class: 'book-panel__cover' }, BookCover({ book, size: 'L', eager: true })),
      h(
        'div',
        { class: 'book-panel__info' },
        h('div', { class: 'book-panel__heading' }, title, authors),
        meta,
        Description(book),
        booking,
      ),
    ),
  );
}

function showSkeleton() {
  render(
    root,
    Skeleton({ width: '12rem' }),
    h(
      'div',
      { class: 'book-panel', 'aria-hidden': true },
      h('div', { class: 'book-panel__cover' }, Skeleton({ variant: 'cover' })),
      h(
        'div',
        { class: 'book-skeleton' },
        Skeleton({ variant: 'block', width: '70%', height: 'var(--text-h1-line)' }),
        Skeleton({ width: '40%' }),
        Skeleton({ width: '55%' }),
        Skeleton(),
        Skeleton(),
        Skeleton({ width: '85%' }),
        Skeleton({ variant: 'block', height: 'calc(var(--space-20) * 2)' }),
      ),
    ),
  );
}

function showNotFound() {
  render(
    root,
    EmptyState({
      icon: 'book-open',
      title: { key: 'book.notFound.title' },
      text: { key: 'book.notFound.text' },
      action: Button({ label: { key: 'book.notFound.action' }, href: pageUrl('catalog.html') }),
    }),
  );
}

async function load() {
  if (!params.id) {
    showNotFound();
    return;
  }
  showSkeleton();
  try {
    showBook(await getBook(params.id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) showNotFound();
    else render(root, ErrorState({ error, onRetry: load }));
  }
}

load();
