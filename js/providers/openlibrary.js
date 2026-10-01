// @ts-check
import { config } from '../config.js';
import { ApiError, getJson, withQuery } from '../core/http.js';
import {
  bookFromSearchDoc,
  bookFromSubjectWork,
  bookFromWork,
  idFromKey,
  isWorkId,
} from '../mappers/openlibrary.js';

/** @typedef {import('../types.js').Book} Book */
/** @typedef {import('../types.js').BookQuery} BookQuery */
/** @typedef {{ signal?: AbortSignal }} Options */

const FIELDS = 'key,title,author_name,author_key,first_publish_year,cover_i,subject';
const SORTS = /** @type {Record<string, string>} */ ({ title: 'title', newest: 'new', trending: 'trending' });

// Open Library rejects a match-all query and times out on a bare year range, so a search with
// nothing else to narrow it starts from the books that are trending now.
const BROWSE_QUERY = 'trending_z_score:{0 TO *]';

const base = config.openLibraryBaseUrl;
const cached = { cacheTtlMs: config.httpCacheTtlMs };

export { isWorkId };

/** @param {string} text Strips query-syntax characters so user input is searched as plain words. */
const plain = (text) => text.replace(/[+\-!(){}[\]^"~*?:\\/&|]/g, ' ').replace(/\s+/g, ' ').trim();

/** @param {string[]} values */
const anyOf = (values) => (values.length === 1 ? values[0] : `(${values.join(' OR ')})`);

/**
 * @param {BookQuery & { categorySubject?: string }} query
 * @returns {{ q: string, browsing: boolean }} `browsing` is true when nothing narrowed the search.
 */
function buildQuery({ q = '', categorySubject, genres = [], authors = [], yearFrom, yearTo }) {
  const parts = [];
  const text = plain(q);
  if (text) parts.push(text);
  if (categorySubject) parts.push(`subject_key:${categorySubject}`);
  if (genres.length > 0) parts.push(`subject_key:${anyOf(genres)}`);
  const authorIds = authors.filter((id) => /^OL\d+A$/.test(id));
  if (authorIds.length > 0) parts.push(`author_key:${anyOf(authorIds)}`);

  const browsing = parts.length === 0;
  if (browsing) parts.push(BROWSE_QUERY);
  if (yearFrom != null || yearTo != null) {
    parts.push(`first_publish_year:[${yearFrom ?? '*'} TO ${yearTo ?? '*'}]`);
  }
  return { q: parts.join(' AND '), browsing };
}

/**
 * @param {BookQuery & { categorySubject?: string }} query
 * @param {Options} [options]
 * @returns {Promise<import('../types.js').Paged<Book>>}
 */
export function searchBooks(query, { signal } = {}) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? config.pageSize;
  const { q, browsing } = buildQuery(query);
  const sort = SORTS[query.sort ?? ''] ?? (browsing ? SORTS.trending : '');

  const url = withQuery(`${base}/search.json`, {
    q,
    fields: FIELDS,
    sort,
    page,
    limit: pageSize,
  });
  return getJson(url, {
    ...cached,
    signal,
    select: (data) => ({
      items: (data.docs ?? []).map(bookFromSearchDoc),
      total: data.numFound ?? 0,
      page,
      pageSize,
    }),
  });
}

/**
 * @param {string} id
 * @param {Options} [options]
 * @returns {Promise<Book>}
 */
export async function getBook(id, { signal } = {}) {
  const notFound = () =>
    new ApiError({ code: 'not_found', status: 404, messageKey: 'books.errors.notFound' });
  if (!isWorkId(id)) throw notFound();

  let work = await getJson(`${base}/works/${id}.json`, { ...cached, signal }).catch((error) => {
    throw error instanceof ApiError && error.status === 404 ? notFound() : error;
  });
  // Merged works answer with a redirect record instead of the work itself.
  if (work?.type?.key === '/type/redirect' && work.location) {
    work = await getJson(`${base}/works/${idFromKey(work.location)}.json`, { ...cached, signal });
  }
  const workId = idFromKey(work.key);

  const searchUrl = withQuery(`${base}/search.json`, { q: `key:/works/${workId}`, fields: FIELDS, limit: 1 });
  const doc = await getJson(searchUrl, { ...cached, signal, select: (data) => data.docs?.[0] ?? null })
    .catch(() => null);

  let authorNames = [];
  if (!doc) {
    const keys = (work.authors ?? []).map((/** @type {any} */ a) => idFromKey(a?.author?.key)).slice(0, 3);
    const authors = await Promise.all(
      keys.map((/** @type {string} */ key) =>
        getJson(`${base}/authors/${key}.json`, { ...cached, signal, select: (data) => data.name })
          .catch(() => null),
      ),
    );
    authorNames = authors.filter(Boolean);
  }

  return bookFromWork(work, doc, authorNames);
}

/**
 * @param {{ limit?: number } & Options} [options]
 * @returns {Promise<Book[]>}
 */
export function getTrending({ limit = 12, signal } = {}) {
  return getJson(withQuery(`${base}/trending/weekly.json`, { limit }), {
    ...cached,
    signal,
    select: (data) => (data.works ?? []).map(bookFromSearchDoc),
  });
}

/**
 * @param {string} subject Open Library subject key, e.g. "classics".
 * @param {{ limit?: number } & Options} [options]
 * @returns {Promise<Book[]>}
 */
export function getSubjectBooks(subject, { limit = 12, signal } = {}) {
  return getJson(withQuery(`${base}/subjects/${encodeURIComponent(subject)}.json`, { limit }), {
    ...cached,
    signal,
    select: (data) => (data.works ?? []).map(bookFromSubjectWork),
  });
}

/**
 * @param {string} isbn
 * @param {Options} [options]
 * @returns {Promise<Book | null>}
 */
export function lookupIsbn(isbn, { signal } = {}) {
  const digits = isbn.replace(/[^0-9Xx]/g, '');
  if (digits.length !== 10 && digits.length !== 13) return Promise.resolve(null);
  return getJson(withQuery(`${base}/search.json`, { q: `isbn:${digits}`, fields: FIELDS, limit: 1 }), {
    ...cached,
    signal,
    select: (data) => (data.docs?.[0] ? bookFromSearchDoc(data.docs[0]) : null),
  });
}
