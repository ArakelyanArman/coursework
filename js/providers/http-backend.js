// @ts-check
// The future REST backend. Same function names and return shapes as the Open Library and
// local-db providers, so switching `config.dataSource` to 'backend' needs no other change.
// TODO: written against the agreed REST contract; verify each call once the backend exists.
import { config } from '../config.js';
import { getJson, sendJson, withQuery } from '../core/http.js';
import { getShared } from '../core/storage.js';
import {
  bookFromRow,
  bookingFromRow,
  pageFromApi,
  toCamel,
  toSnake,
  userFromRow,
} from '../mappers/backend.js';

/** @typedef {import('../types.js').Book} Book */
/** @typedef {import('../types.js').BookInput} BookInput */
/** @typedef {import('../types.js').BookQuery} BookQuery */
/** @typedef {import('../types.js').ListQuery} ListQuery */
/** @typedef {import('../types.js').IsoDate} IsoDate */
/** @typedef {{ signal?: AbortSignal }} Options */

const api = (/** @type {string} */ path) => config.backendBaseUrl + path;

function auth() {
  const token = getShared('session')?.token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

/** @param {any} data */
const sessionFromApi = (data) => ({ token: data.token, user: userFromRow(data.user) });

/** @param {string[] | undefined} values */
const list = (values) => (values?.length ? values.join(',') : undefined);

/** @param {ListQuery} query Column names in `sort` are sent in snake_case too. */
const listParams = (query) => toSnake({ ...query, sort: query.sort?.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`) });

// ---------- Catalog ----------

/** @param {BookQuery} query @param {Options} [options] GET /books */
export function searchBooks(query, { signal } = {}) {
  const url = withQuery(api('/books'), {
    q: query.q,
    category: query.category,
    authors: list(query.authors),
    genres: list(query.genres),
    year_from: query.yearFrom,
    year_to: query.yearTo,
    sort: query.sort,
    page: query.page,
    page_size: query.pageSize,
  });
  return getJson(url, { signal, ...auth(), select: (data) => pageFromApi(data, bookFromRow) });
}

/** @param {string} id @param {Options} [options] GET /books/:id */
export function getBook(id, { signal } = {}) {
  return getJson(api(`/books/${encodeURIComponent(id)}`), { signal, ...auth(), select: bookFromRow });
}

/** @param {{ limit?: number } & Options} [options] GET /books?sort=trending */
export function getTrending({ limit = 12, signal } = {}) {
  return searchBooks({ sort: 'trending', pageSize: limit }, { signal }).then((page) => page.items);
}

/** @param {string} subject @param {{ limit?: number } & Options} [options] GET /books?subject= */
export function getSubjectBooks(subject, { limit = 12, signal } = {}) {
  const url = withQuery(api('/books'), { subject, page_size: limit });
  return getJson(url, { signal, select: (data) => pageFromApi(data, bookFromRow).items });
}

/** @param {string} isbn @param {Options} [options] GET /books/isbn/:isbn */
export function lookupIsbn(isbn, { signal } = {}) {
  return getJson(api(`/books/isbn/${encodeURIComponent(isbn)}`), {
    signal,
    ...auth(),
    select: (data) => (data ? bookFromRow(data) : null),
  });
}

// ---------- Library ----------

// The backend already returns copies and availability with every book.
/** @param {Book[]} books */
export const withAvailability = async (books) => books;
/** @param {Book} book */
export const ensureBook = async (book) => book;
export const getStoredBook = getBook;

/** @param {string} bookId @param {{ from?: IsoDate, to?: IsoDate }} [range] GET /books/:id/unavailable-dates */
export function getUnavailableDates(bookId, { from, to } = {}) {
  const url = withQuery(api(`/books/${encodeURIComponent(bookId)}/unavailable-dates`), { from, to });
  return getJson(url, { select: (data) => data.dates ?? [] });
}

/** @param {ListQuery} [query] GET /admin/books */
export function listBooks(query = {}) {
  const url = withQuery(api('/admin/books'), listParams(query));
  return getJson(url, { ...auth(), select: (data) => pageFromApi(data, bookFromRow) });
}

/** @param {BookInput} input POST /admin/books */
export function createBook(input) {
  return sendJson('POST', api('/admin/books'), toSnake(input), auth()).then(bookFromRow);
}

/** @param {string} id @param {Partial<BookInput>} changes PUT /admin/books/:id */
export function updateBook(id, changes) {
  return sendJson('PUT', api(`/admin/books/${encodeURIComponent(id)}`), toSnake(changes), auth()).then(
    bookFromRow,
  );
}

/** @param {string} id DELETE /admin/books/:id */
export function deleteBook(id) {
  return sendJson('DELETE', api(`/admin/books/${encodeURIComponent(id)}`), undefined, auth()).then(
    (data) => toCamel(data ?? { cancelled_bookings: 0 }),
  );
}

/** @param {string} bookId GET /bookings?book_id=&upcoming=true */
export function countUpcomingBookings(bookId) {
  const url = withQuery(api('/bookings'), { book_id: bookId, upcoming: true });
  return getJson(url, { ...auth(), select: (data) => data.total ?? 0 });
}

/** @param {{ bookId: string, fromDate: IsoDate, toDate: IsoDate }} input POST /bookings */
export function createBooking(input) {
  return sendJson('POST', api('/bookings'), toSnake(input), auth()).then(bookingFromRow);
}

/** @param {{ bookId?: string, userId?: string, status?: string }} [filter] GET /bookings */
export function listBookings(filter = {}) {
  const url = withQuery(api('/bookings'), toSnake(filter));
  return getJson(url, { ...auth(), select: (data) => (data.items ?? []).map(bookingFromRow) });
}

/** @param {string} id POST /bookings/:id/cancel */
export function cancelBooking(id) {
  return sendJson('POST', api(`/bookings/${encodeURIComponent(id)}/cancel`), undefined, auth()).then(
    bookingFromRow,
  );
}

/** @param {{ email: string, password: string }} credentials POST /auth/login */
export function login(credentials) {
  return sendJson('POST', api('/auth/login'), credentials).then(sessionFromApi);
}

/** @param {{ email: string, fullName: string, password: string }} input POST /auth/register */
export function register(input) {
  return sendJson('POST', api('/auth/register'), toSnake(input)).then(sessionFromApi);
}

/** POST /auth/logout */
export function logout() {
  return sendJson('POST', api('/auth/logout'), undefined, auth());
}

/** GET /auth/me */
export function me() {
  return getJson(api('/auth/me'), { ...auth(), dedupe: false, select: userFromRow });
}

/** @param {ListQuery} [query] GET /admin/users */
export function listUsers(query = {}) {
  const url = withQuery(api('/admin/users'), listParams(query));
  return getJson(url, { ...auth(), select: (data) => pageFromApi(data, userFromRow) });
}

/** @param {{ fullName: string, email: string, role: string, password: string }} input POST /admin/users */
export function createUser(input) {
  return sendJson('POST', api('/admin/users'), toSnake(input), auth()).then(userFromRow);
}

/** @param {string} id @param {{ fullName?: string, email?: string, role?: string }} changes PUT /admin/users/:id */
export function updateUser(id, changes) {
  return sendJson('PUT', api(`/admin/users/${encodeURIComponent(id)}`), toSnake(changes), auth()).then(
    userFromRow,
  );
}

/** @param {string} id DELETE /admin/users/:id */
export function deleteUser(id) {
  return sendJson('DELETE', api(`/admin/users/${encodeURIComponent(id)}`), undefined, auth()).then(
    (data) => toCamel(data ?? { cancelled_bookings: 0 }),
  );
}

/** @param {string} type @param {{ from: IsoDate, to: IsoDate }} range GET /reports/:type */
export function getReport(type, { from, to }) {
  const url = withQuery(api(`/reports/${encodeURIComponent(type)}`), { from, to });
  return getJson(url, { ...auth(), select: toCamel });
}
