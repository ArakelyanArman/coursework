// @ts-check
import { BookRail } from '../../components/BookRail/BookRail.js';
import { SearchField } from '../../components/SearchField/SearchField.js';
import { qs, render } from '../core/dom.js';
import { isAbort } from '../core/http.js';
import { buildUrl } from '../core/url-state.js';
import { getCategoryBooks, getTrending, listInventory } from '../services/books.js';
import { mountShell } from '../shell.js';

/** @typedef {import('../types.js').Book} Book */
/** @typedef {import('../../components/BookRail/BookRail.js').BookRailElement} BookRailElement */

const RAIL_SIZE = 12;
// A rail of the library's own picks is shown only when it has enough covers to look full.
const MIN_COVERS = 4;

await mountShell({ page: 'home' });

render(
  qs('#home-search'),
  SearchField({
    label: { key: 'catalog.searchLabel' },
    placeholder: { key: 'catalog.searchPlaceholder' },
    size: 'lg',
    onSubmit: (query) => window.location.assign(buildUrl('catalog.html', { q: query })),
  }),
);

/**
 * Each rail loads by itself, so one that fails does not take the others with it.
 * @param {BookRailElement} rail
 * @param {() => Promise<Book[]>} load
 * @param {{ badge?: import('../core/i18n.js').Text, optional?: boolean }} [options]
 */
async function fill(rail, load, { badge, optional = false } = {}) {
  rail.showLoading();
  try {
    const books = await load();
    const covers = books.filter((book) => book.coverId || book.coverUrl).length;
    if (optional && covers < MIN_COVERS) rail.remove();
    else rail.showBooks(books, { badge });
  } catch (error) {
    if (isAbort(error)) return;
    if (optional) rail.remove();
    else rail.showError(error, () => fill(rail, load, { badge, optional }));
  }
}

const trending = BookRail({
  title: { key: 'home.trending' },
  moreHref: buildUrl('catalog.html', { sort: 'trending' }),
});
const classics = BookRail({
  title: { key: 'categories.classics' },
  moreHref: buildUrl('catalog.html', { category: 'classics' }),
});
const armenian = BookRail({
  title: { key: 'categories.armenian' },
  moreHref: buildUrl('catalog.html', { category: 'armenian' }),
});

render(qs('#home-rails'), trending, classics, armenian);

fill(trending, () => getTrending({ limit: RAIL_SIZE }), { badge: { key: 'book.trending' } });
fill(classics, () => getCategoryBooks('classics', { limit: RAIL_SIZE }));
fill(
  armenian,
  async () => (await listInventory({ category: 'armenian', pageSize: RAIL_SIZE })).items,
  { optional: true },
);
