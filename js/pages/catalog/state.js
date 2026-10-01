// @ts-check
import { session } from '../../core/storage.js';
import { readParams } from '../../core/url-state.js';
import { GENRES, SORTS, categoryById } from '../../services/books.js';

/** @typedef {import('../../types.js').Book} Book */

/**
 * Everything the Catalog shows is decided by these values, and all of them live in the URL.
 * @typedef {object} CatalogState
 * @property {string} q
 * @property {string} category A category id, or '' for all.
 * @property {string[]} authors Open Library author ids.
 * @property {string[]} genres
 * @property {number | null} yearFrom
 * @property {number | null} yearTo
 * @property {string} sort
 * @property {number} page
 */

/** @typedef {Pick<CatalogState, 'authors' | 'genres' | 'yearFrom' | 'yearTo'>} FilterValues */
/** @typedef {{ id: string, name: string }} AuthorOption */

export const SCHEMA = /** @type {import('../../core/url-state.js').ParamSchema} */ ({
  q: { type: 'string' },
  category: { type: 'string' },
  authors: { type: 'array' },
  genres: { type: 'array' },
  yearFrom: { type: 'number' },
  yearTo: { type: 'number' },
  sort: { type: 'string', default: 'relevance' },
  page: { type: 'number', default: 1 },
});

// Open Library pages reliably through the first 10,000 results of a search.
export const MAX_PAGES = 500;
export const NO_FILTERS = Object.freeze({ authors: [], genres: [], yearFrom: null, yearTo: null });

const AUTHOR_NAMES_KEY = 'catalog:authors';

/** @param {unknown} value @returns {number | null} */
const year = (value) =>
  Number.isInteger(value) && Number(value) > 0 && Number(value) <= 9999 ? Number(value) : null;

/**
 * Drop anything the page cannot work with, so a hand-edited URL never breaks it.
 * @param {Record<string, any>} raw
 * @returns {CatalogState}
 */
export function normalize(raw) {
  const page = Number.isInteger(raw.page) ? raw.page : 1;
  return {
    q: String(raw.q ?? '').trim(),
    category: categoryById(raw.category)?.id ?? '',
    authors: (raw.authors ?? []).filter((/** @type {string} */ id) => /^OL\d+A$/.test(id)),
    genres: GENRES.map((genre) => genre.id).filter((id) => (raw.genres ?? []).includes(id)),
    yearFrom: year(raw.yearFrom),
    yearTo: year(raw.yearTo),
    sort: SORTS.some((sort) => sort.id === raw.sort) ? raw.sort : 'relevance',
    page: Math.min(Math.max(page, 1), MAX_PAGES),
  };
}

/** @returns {CatalogState} */
export const readState = () => normalize(readParams(SCHEMA));

/** @param {FilterValues} values @returns {number} Shown on the "Filters (n)" button. */
export function countFilters({ authors, genres, yearFrom, yearTo }) {
  return authors.length + genres.length + (yearFrom != null || yearTo != null ? 1 : 0);
}

/** @param {CatalogState} state */
export const hasFilters = (state) => countFilters(state) > 0 || state.category !== '';

/** @param {CatalogState} state @returns {string} The search without its author filter, sort and page. */
export const baseSignature = ({ q, category, genres, yearFrom, yearTo }) =>
  JSON.stringify([q, category, genres, yearFrom, yearTo]);

/**
 * @param {Book[]} books
 * @returns {AuthorOption[]} The authors of these books, the most frequent first.
 */
export function authorsOf(books) {
  /** @type {Map<string, { name: string, count: number }>} */
  const found = new Map();
  for (const book of books) {
    book.authorIds.forEach((id, index) => {
      const name = book.authors[index];
      if (!id || !name) return;
      const entry = found.get(id) ?? { name, count: 0 };
      entry.count += 1;
      found.set(id, entry);
    });
  }
  return [...found]
    .sort(([, a], [, b]) => b.count - a.count || a.name.localeCompare(b.name))
    .map(([id, { name }]) => ({ id, name }));
}

/** @param {AuthorOption[]} authors Remembered for this tab, so a filter chip can show a name. */
export function rememberAuthors(authors) {
  if (authors.length === 0) return;
  const names = session.get(AUTHOR_NAMES_KEY, {});
  for (const { id, name } of authors) names[id] = name;
  session.set(AUTHOR_NAMES_KEY, names);
}

/** @param {string} id @returns {string} The author's name, or the id when it was never seen. */
export const authorName = (id) => session.get(AUTHOR_NAMES_KEY, {})[id] ?? id;
