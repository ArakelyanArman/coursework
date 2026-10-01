// @ts-check
import { config } from '../config.js';
import { catalog, library } from '../providers/index.js';

/** @typedef {import('../types.js').Book} Book */
/** @typedef {import('../types.js').BookInput} BookInput */
/** @typedef {import('../types.js').BookQuery} BookQuery */
/** @typedef {import('../types.js').Category} Category */
/** @typedef {{ signal?: AbortSignal }} Options */

/** Top-level categories (single select). `subject` is the Open Library subject key. */
export const CATEGORIES = /** @type {Category[]} */ ([
  { id: 'fiction', subject: 'fiction', labelKey: 'categories.fiction' },
  { id: 'classics', subject: 'classics', labelKey: 'categories.classics' },
  { id: 'mystery', subject: 'mystery', labelKey: 'categories.mystery' },
  { id: 'fantasy', subject: 'fantasy', labelKey: 'categories.fantasy' },
  { id: 'science-fiction', subject: 'science_fiction', labelKey: 'categories.scienceFiction' },
  { id: 'history', subject: 'history', labelKey: 'categories.history' },
  { id: 'science', subject: 'science', labelKey: 'categories.science' },
  { id: 'poetry', subject: 'poetry', labelKey: 'categories.poetry' },
  { id: 'biography', subject: 'biography', labelKey: 'categories.biography' },
  { id: 'armenian', subject: 'armenian_literature', labelKey: 'categories.armenian' },
]);

/** Genres (multi select). The id is the Open Library subject key. */
export const GENRES = [
  { id: 'romance', labelKey: 'genres.romance' },
  { id: 'historical_fiction', labelKey: 'genres.historicalFiction' },
  { id: 'adventure', labelKey: 'genres.adventure' },
  { id: 'thriller', labelKey: 'genres.thriller' },
  { id: 'horror', labelKey: 'genres.horror' },
  { id: 'humor', labelKey: 'genres.humor' },
  { id: 'drama', labelKey: 'genres.drama' },
  { id: 'short_stories', labelKey: 'genres.shortStories' },
  { id: 'philosophy', labelKey: 'genres.philosophy' },
  { id: 'psychology', labelKey: 'genres.psychology' },
  { id: 'juvenile_fiction', labelKey: 'genres.children' },
  { id: 'essays', labelKey: 'genres.essays' },
];

export const SORTS = [
  { id: 'relevance', labelKey: 'sort.relevance' },
  { id: 'title', labelKey: 'sort.title' },
  { id: 'newest', labelKey: 'sort.newest' },
  { id: 'trending', labelKey: 'sort.trending' },
];

/** @param {string | null | undefined} id */
export const categoryById = (id) => CATEGORIES.find((category) => category.id === id) ?? null;

/** @param {Book} book A book without a category gets one from its Open Library subjects. */
function categorize(book) {
  if (book.category) return book;
  const subjects = new Set(book.subjects.map((subject) => subject.toLowerCase().replace(/\s+/g, '_')));
  // "Fiction" is on almost every novel, so it only wins when nothing more specific matches.
  const match =
    CATEGORIES.find((category) => category.id !== 'fiction' && subjects.has(category.subject)) ??
    (subjects.has('fiction') ? categoryById('fiction') : null);
  return { ...book, category: match?.id ?? null };
}

/**
 * @param {Book} book
 * @param {'S' | 'M' | 'L'} [size]
 * @returns {string | null} Null when the book has no cover: render the typographic fallback.
 */
export function coverUrl(book, size = 'M') {
  if (book.coverUrl) return book.coverUrl;
  if (!book.coverId) return null;
  // default=false makes a missing cover a 404 instead of a blank image.
  return `${config.coversBaseUrl}/b/id/${book.coverId}-${size}.jpg?default=false`;
}

/**
 * @param {BookQuery} query
 * @param {Options} [options]
 * @returns {Promise<import('../types.js').Paged<Book>>}
 */
export async function searchBooks(query, options) {
  const categorySubject = categoryById(query.category)?.subject;
  const page = await catalog.searchBooks({ ...query, categorySubject }, options);
  // Results of a category search belong to that category, whatever their first subjects say.
  const categorized = page.items.map((book) =>
    categorySubject && !book.category ? { ...book, category: query.category ?? null } : categorize(book),
  );
  const items = await library.withAvailability(categorized);
  return { ...page, items };
}

/**
 * @param {string} id
 * @param {Options} [options]
 * @returns {Promise<Book>}
 */
export async function getBook(id, options) {
  const book = await catalog.getBook(id, options);
  return library.ensureBook(categorize(book));
}

/** @param {{ limit?: number } & Options} [options] @returns {Promise<Book[]>} */
export async function getTrending(options) {
  return library.withAvailability((await catalog.getTrending(options)).map(categorize));
}

/**
 * @param {string} categoryId
 * @param {{ limit?: number } & Options} [options]
 * @returns {Promise<Book[]>}
 */
export async function getCategoryBooks(categoryId, options) {
  const category = categoryById(categoryId);
  if (!category) return [];
  const books = await catalog.getSubjectBooks(category.subject, options);
  return library.withAvailability(books.map((book) => ({ ...book, category: category.id })));
}

/** @param {string} isbn @param {Options} [options] @returns {Promise<Book | null>} */
export async function lookupIsbn(isbn, options) {
  const book = await catalog.lookupIsbn(isbn, options);
  return book ? categorize(book) : null;
}

/** @param {string} bookId @returns {Promise<import('../types.js').IsoDate[]>} Dates when every copy is booked. */
export function getUnavailableDates(bookId) {
  return library.getUnavailableDates(bookId);
}

/** @param {import('../types.js').ListQuery} [query] The library's own holdings (admin table). */
export function listInventory(query) {
  return library.listBooks(query);
}

/** @param {BookInput} input */
export function createBook(input) {
  return library.createBook(input);
}

/** @param {string} id @param {Partial<BookInput>} changes */
export function updateBook(id, changes) {
  return library.updateBook(id, changes);
}

/** @param {string} id @returns {Promise<{ cancelledBookings: number }>} */
export function deleteBook(id) {
  return library.deleteBook(id);
}

/** @param {string} bookId @returns {Promise<number>} Bookings that deleting the book would cancel. */
export function countUpcomingBookings(bookId) {
  return library.countUpcomingBookings(bookId);
}
