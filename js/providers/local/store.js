// @ts-check
import { config } from '../../config.js';
import { addDays, diffDays, todayIso } from '../../core/date.js';
import { ApiError, getJson } from '../../core/http.js';
import { assetUrl } from '../../core/paths.js';
import { getShared, local } from '../../core/storage.js';

/**
 * The mock "database": rows are snake_case, exactly as a backend would store and send them.
 * @typedef {{ version: number, books: any[], users: any[], bookings: any[], sessions: Record<string, string> }} Database
 */

const DB_KEY = 'db';
const DB_VERSION = 1;
const MS_PER_DAY = 86_400_000;

/** @type {Promise<Database> | null} */
let seeding = null;

function latency() {
  const [min, max] = config.localLatencyMs;
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

/**
 * Seed bookings are written relative to an anchor date and moved to "today" on first run,
 * so the demo always has past, current and upcoming bookings.
 * @returns {Promise<Database>}
 */
async function seed() {
  const [books, users, bookingSeed] = await Promise.all(
    ['inventory', 'users', 'bookings'].map((name) => getJson(assetUrl(`data/seed/${name}.json`))),
  );
  const shift = diffDays(bookingSeed.anchor_date, todayIso());
  const bookings = bookingSeed.bookings.map((/** @type {any} */ row) => ({
    ...row,
    from_date: addDays(row.from_date, shift),
    to_date: addDays(row.to_date, shift),
    created_at: new Date(Date.parse(row.created_at) + shift * MS_PER_DAY).toISOString(),
  }));
  return { version: DB_VERSION, books, users, bookings, sessions: {} };
}

/** @param {Database} db */
export function save(db) {
  local.set(DB_KEY, db);
}

/**
 * Read the database, seeding it on first run.
 * @param {{ wait?: boolean }} [options] `wait: false` skips the simulated latency.
 * @returns {Promise<Database>}
 */
export async function open({ wait = true } = {}) {
  if (wait) await latency();

  /** @type {Database | null} */
  let db = local.get(DB_KEY);
  if (db?.version !== DB_VERSION) {
    seeding ??= seed();
    db = await seeding;
    seeding = null;
    save(db);
  }

  // Nobody checks books back in here, so a booking that has ended counts as returned.
  const today = todayIso();
  let changed = false;
  for (const row of db.bookings) {
    if (row.status === 'active' && row.to_date < today) {
      row.status = 'returned';
      changed = true;
    }
  }
  if (changed) save(db);
  return db;
}

export async function resetDatabase() {
  local.remove(DB_KEY);
  await open({ wait: false });
}

/**
 * @param {number} status
 * @param {string} code
 * @param {string} messageKey
 * @param {Record<string, unknown>} [params]
 * @returns {never}
 */
export function fail(status, code, messageKey, params) {
  throw new ApiError({ status, code, messageKey, params });
}

/** @param {Database} db @returns {any | null} The user row behind the current session token. */
export function sessionUser(db) {
  const token = getShared('session')?.token;
  const userId = token ? db.sessions[token] : null;
  return db.users.find((user) => user.id === userId) ?? null;
}

/** @param {Database} db */
export function requireUser(db) {
  return sessionUser(db) ?? fail(401, 'unauthorized', 'errors.unauthorized');
}

/** @param {Database} db */
export function requireAdmin(db) {
  const user = requireUser(db);
  if (user.role !== 'admin') fail(403, 'forbidden', 'errors.forbidden');
  return user;
}

/** @param {string} prefix */
export const newId = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

/**
 * @template T
 * @param {T[]} items
 * @param {number} [page]
 * @param {number} [pageSize]
 * @returns {{ items: T[], total: number, page: number, pageSize: number }}
 */
export function paginate(items, page = 1, pageSize = config.pageSize) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

/**
 * @param {any[]} rows
 * @param {(row: any) => string | number | null} pick
 * @param {'asc' | 'desc'} [order]
 */
export function sortRows(rows, pick, order = 'asc') {
  const direction = order === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = pick(a) ?? '';
    const right = pick(b) ?? '';
    const result =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return result * direction;
  });
}

/** @param {string} text @param {string} [q] */
export const matches = (text, q) => !q || text.toLowerCase().includes(q.trim().toLowerCase());
