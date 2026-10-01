// @ts-check
import { addDays, eachDay, todayIso } from '../../core/date.js';
import { bookFromRow, bookToRow } from '../../mappers/backend.js';
import { fail, matches, newId, open, paginate, requireAdmin, save, sortRows } from './store.js';

/** @typedef {import('../../types.js').Book} Book */
/** @typedef {import('../../types.js').BookInput} BookInput */
/** @typedef {import('../../types.js').IsoDate} IsoDate */
/** @typedef {import('./store.js').Database} Database */

// A work that is not in the inventory yet counts as a single copy.
export const DEFAULT_COPIES = 1;
const HORIZON_DAYS = 180;

/**
 * How many copies of a book are out on each date.
 * @param {Database} db
 * @param {string} bookId
 * @returns {Map<IsoDate, number>}
 */
export function occupancy(db, bookId) {
  const today = todayIso();
  /** @type {Map<IsoDate, number>} */
  const days = new Map();
  for (const row of db.bookings) {
    if (row.book_id !== bookId) continue;
    if (row.status !== 'active' && row.status !== 'overdue') continue;
    // An overdue copy is still out today, whatever its end date says.
    const end = row.status === 'overdue' && row.to_date < today ? today : row.to_date;
    for (const day of eachDay(row.from_date, end)) days.set(day, (days.get(day) ?? 0) + 1);
  }
  return days;
}

/**
 * Inventory values win over Open Library metadata; availability is worked out for today.
 * @param {Database} db
 * @param {Book} book
 * @returns {Book}
 */
function decorate(db, book) {
  const row = db.books.find((entry) => entry.id === book.id);
  const copies = row?.copies ?? DEFAULT_COPIES;
  const out = occupancy(db, book.id).get(todayIso()) ?? 0;
  const availableCopies = Math.max(0, copies - out);

  /** @type {import('../../types.js').Availability} */
  let availability = 'available';
  if (availableCopies === 0) availability = 'unavailable';
  else if (availableCopies === 1 && copies > 1) availability = 'few';

  return {
    ...book,
    title: row?.title || book.title,
    authors: row?.authors?.length ? row.authors : book.authors,
    category: row?.category ?? book.category,
    genres: row?.genres?.length ? row.genres : book.genres,
    firstPublishYear: row?.first_publish_year ?? book.firstPublishYear,
    coverId: row?.cover_id ?? book.coverId,
    coverUrl: row?.cover_url ?? book.coverUrl,
    description: row?.description || book.description,
    createdAt: row?.created_at ?? book.createdAt,
    copies,
    availableCopies,
    availability,
  };
}

/** @param {Book[]} books @returns {Promise<Book[]>} */
export async function withAvailability(books) {
  const db = await open({ wait: false });
  return books.map((book) => decorate(db, book));
}

/**
 * Called when a book is viewed: a work the library has not seen yet is saved with one copy.
 * @param {Book} book
 * @returns {Promise<Book>}
 */
export async function ensureBook(book) {
  const db = await open({ wait: false });
  if (!db.books.some((row) => row.id === book.id)) {
    db.books.push(
      bookToRow({ ...book, copies: DEFAULT_COPIES, description: null, createdAt: new Date().toISOString() }),
    );
    save(db);
  }
  return decorate(db, book);
}

/** @param {string} id @returns {Promise<Book>} A book that exists only in the inventory. */
export async function getStoredBook(id) {
  const db = await open();
  const row = db.books.find((entry) => entry.id === id);
  if (!row) fail(404, 'not_found', 'books.errors.notFound');
  return decorate(db, bookFromRow(row));
}

/**
 * @param {import('../../types.js').ListQuery} [query]
 * @returns {Promise<import('../../types.js').Paged<Book>>}
 */
export async function listBooks({ q, category, sort = 'title', order = 'asc', page, pageSize } = {}) {
  const db = await open();
  const rows = db.books.filter(
    (row) =>
      (!category || row.category === category) && matches(`${row.title} ${row.authors.join(' ')}`, q),
  );
  /** @type {Record<string, (row: any) => string | number | null>} */
  const sorters = {
    title: (row) => row.title,
    author: (row) => row.authors[0] ?? '',
    category: (row) => row.category,
    copies: (row) => row.copies,
    createdAt: (row) => row.created_at,
  };
  const sorted = sortRows(rows, sorters[sort] ?? sorters.title, order);
  const result = paginate(sorted, page, pageSize);
  return { ...result, items: result.items.map((row) => decorate(db, bookFromRow(row))) };
}

/** @param {BookInput} input @returns {Promise<Book>} */
export async function createBook(input) {
  const db = await open();
  requireAdmin(db);
  const id = input.id || newId('L');
  if (db.books.some((row) => row.id === id)) fail(409, 'conflict', 'books.errors.exists');

  const row = bookToRow({
    category: null,
    genres: [],
    firstPublishYear: null,
    coverId: null,
    coverUrl: null,
    description: null,
    ...input,
    id,
    createdAt: new Date().toISOString(),
  });
  db.books.push(row);
  save(db);
  return decorate(db, bookFromRow(row));
}

/**
 * @param {string} id
 * @param {Partial<BookInput>} changes
 * @returns {Promise<Book>}
 */
export async function updateBook(id, changes) {
  const db = await open();
  requireAdmin(db);
  const row = db.books.find((entry) => entry.id === id);
  if (!row) fail(404, 'not_found', 'books.errors.notFound');

  const { id: _ignored, ...patch } = bookToRow(changes);
  for (const [column, value] of Object.entries(patch)) {
    if (value !== undefined) row[column] = value;
  }
  save(db);
  return decorate(db, bookFromRow(row));
}

/** @param {Database} db @param {string} bookId */
const upcoming = (db, bookId) =>
  db.bookings.filter(
    (row) => row.book_id === bookId && row.status === 'active' && row.to_date >= todayIso(),
  );

/** @param {string} bookId @returns {Promise<number>} Bookings a delete would cancel. */
export async function countUpcomingBookings(bookId) {
  const db = await open({ wait: false });
  return upcoming(db, bookId).length;
}

/** @param {string} id @returns {Promise<{ cancelledBookings: number }>} */
export async function deleteBook(id) {
  const db = await open();
  requireAdmin(db);
  const index = db.books.findIndex((row) => row.id === id);
  if (index === -1) fail(404, 'not_found', 'books.errors.notFound');

  const cancelled = upcoming(db, id);
  for (const row of cancelled) row.status = 'cancelled';
  db.books.splice(index, 1);
  save(db);
  return { cancelledBookings: cancelled.length };
}

/**
 * Dates on which every copy is booked.
 * @param {string} bookId
 * @param {{ from?: IsoDate, to?: IsoDate }} [range] Defaults to the next 180 days.
 * @returns {Promise<IsoDate[]>}
 */
export async function getUnavailableDates(bookId, { from = todayIso(), to } = {}) {
  const db = await open();
  const copies = db.books.find((row) => row.id === bookId)?.copies ?? DEFAULT_COPIES;
  const last = to ?? addDays(from, HORIZON_DAYS);
  return [...occupancy(db, bookId)]
    .filter(([day, count]) => count >= copies && day >= from && day <= last)
    .map(([day]) => day)
    .sort();
}
