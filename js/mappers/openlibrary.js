// @ts-check

/** @typedef {import('../types.js').Book} Book */

const MAX_SUBJECTS = 8;

/** @param {unknown} key "/works/OL27482W" → "OL27482W" */
export const idFromKey = (key) => String(key ?? '').split('/').pop() ?? '';

/** @param {string} id */
export const isWorkId = (id) => /^OL\d+W$/.test(id);

/**
 * Open Library sends descriptions as a string or as { type, value }, often with a
 * trailing "----------" block of edition notes and markdown link references.
 * @param {unknown} value
 * @returns {string | null}
 */
export function descriptionText(value) {
  const raw = typeof value === 'string' ? value : /** @type {any} */ (value)?.value;
  if (typeof raw !== 'string') return null;
  const text = raw
    .split(/\r?\n\s*-{5,}/)[0]
    .replace(/^\s*\[\d+\]:.*$/gm, '')
    .replace(/\(?\[([^\]]+)\]\[\d+\]\)?/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

/** @param {unknown} subjects @returns {string[]} */
const subjectList = (subjects) =>
  Array.isArray(subjects) ? subjects.slice(0, MAX_SUBJECTS).map(String) : [];

/** @param {Partial<Book> & { id: string, title: string }} fields @returns {Book} */
function book(fields) {
  return {
    authors: [],
    authorIds: [],
    category: null,
    genres: [],
    firstPublishYear: null,
    coverId: null,
    coverUrl: null,
    description: null,
    subjects: [],
    copies: null,
    availableCopies: null,
    availability: null,
    createdAt: null,
    ...fields,
  };
}

/** @param {any} doc A /search.json or /trending doc. @returns {Book} */
export function bookFromSearchDoc(doc) {
  return book({
    id: idFromKey(doc.key),
    title: doc.title ?? '',
    authors: doc.author_name ?? [],
    authorIds: doc.author_key ?? [],
    firstPublishYear: doc.first_publish_year ?? null,
    coverId: doc.cover_i ?? null,
    subjects: subjectList(doc.subject),
  });
}

/** @param {any} work A /subjects/{subject}.json work. @returns {Book} */
export function bookFromSubjectWork(work) {
  const authors = Array.isArray(work.authors) ? work.authors : [];
  return book({
    id: idFromKey(work.key),
    title: work.title ?? '',
    authors: authors.map((/** @type {any} */ author) => author.name),
    authorIds: authors.map((/** @type {any} */ author) => idFromKey(author.key)),
    firstPublishYear: work.first_publish_year ?? null,
    coverId: work.cover_id ?? null,
    subjects: subjectList(work.subject),
  });
}

/**
 * @param {any} work /works/{id}.json
 * @param {any} [doc] The matching search doc: it carries author names and the first publish year.
 * @param {string[]} [authorNames] From /authors/{id}.json when the search doc is missing.
 * @returns {Book}
 */
export function bookFromWork(work, doc, authorNames = []) {
  const authorIds = (work.authors ?? [])
    .map((/** @type {any} */ entry) => idFromKey(entry?.author?.key))
    .filter(Boolean);
  const covers = (work.covers ?? []).filter((/** @type {number} */ id) => id > 0);
  const year = /\d{4}/.exec(work.first_publish_date ?? '')?.[0];

  return book({
    id: idFromKey(work.key),
    title: work.title ?? doc?.title ?? '',
    authors: doc?.author_name ?? authorNames,
    authorIds: doc?.author_key ?? authorIds,
    firstPublishYear: doc?.first_publish_year ?? (year ? Number(year) : null),
    coverId: doc?.cover_i ?? covers[0] ?? null,
    description: descriptionText(work.description),
    subjects: subjectList(work.subjects),
  });
}
