// @ts-check

/** @typedef {import('../types.js').Book} Book */
/** @typedef {import('../types.js').User} User */
/** @typedef {import('../types.js').Booking} Booking */

const camel = (/** @type {string} */ key) => key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
const snake = (/** @type {string} */ key) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

/**
 * @param {any} value
 * @param {(key: string) => string} rename
 * @returns {any}
 */
function renameKeys(value, rename) {
  if (Array.isArray(value)) return value.map((entry) => renameKeys(entry, rename));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [rename(key), renameKeys(entry, rename)]),
    );
  }
  return value;
}

/** @param {any} value snake_case from the API. @returns {any} */
export const toCamel = (value) => renameKeys(value, camel);

/** @param {any} value camelCase from the app. @returns {any} */
export const toSnake = (value) => renameKeys(value, snake);

/** @param {any} row @returns {Book} */
export function bookFromRow(row) {
  const book = toCamel(row);
  return {
    id: String(book.id),
    title: book.title ?? '',
    authors: book.authors ?? [],
    authorIds: book.authorIds ?? [],
    category: book.category ?? null,
    genres: book.genres ?? [],
    firstPublishYear: book.firstPublishYear ?? null,
    coverId: book.coverId ?? null,
    coverUrl: book.coverUrl ?? null,
    description: book.description ?? null,
    subjects: book.subjects ?? [],
    copies: book.copies ?? null,
    availableCopies: book.availableCopies ?? null,
    availability: book.availability ?? null,
    createdAt: book.createdAt ?? null,
  };
}

/** @param {Partial<Book>} book @returns {any} Only the stored columns, snake_case. */
export function bookToRow(book) {
  return toSnake({
    id: book.id,
    title: book.title,
    authors: book.authors,
    category: book.category,
    genres: book.genres,
    firstPublishYear: book.firstPublishYear,
    coverId: book.coverId,
    coverUrl: book.coverUrl,
    description: book.description,
    copies: book.copies,
    createdAt: book.createdAt,
  });
}

/** @param {any} row @returns {User} Never carries the password hash. */
export function userFromRow(row) {
  return {
    id: String(row.id),
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

/** @param {any} row @returns {Booking} */
export function bookingFromRow(row) {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    userId: String(row.user_id),
    fromDate: row.from_date,
    toDate: row.to_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * @template T
 * @param {any} data { items, total, page, page_size }
 * @param {(row: any) => T} mapItem
 * @returns {import('../types.js').Paged<T>}
 */
export function pageFromApi(data, mapItem) {
  return {
    items: (data.items ?? []).map(mapItem),
    total: data.total ?? 0,
    page: data.page ?? 1,
    pageSize: data.page_size ?? data.items?.length ?? 0,
  };
}
