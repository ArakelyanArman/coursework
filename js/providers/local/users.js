// @ts-check
import { todayIso } from '../../core/date.js';
import { userFromRow } from '../../mappers/backend.js';
import { hashPassword, normalizeEmail } from './auth.js';
import { fail, matches, newId, open, paginate, requireAdmin, save, sortRows } from './store.js';

/** @typedef {import('../../types.js').User} User */
/** @typedef {import('../../types.js').Role} Role */

/**
 * @param {import('../../types.js').ListQuery} [query]
 * @returns {Promise<import('../../types.js').Paged<User>>}
 */
export async function listUsers({ q, sort = 'fullName', order = 'asc', page, pageSize } = {}) {
  const db = await open();
  requireAdmin(db);
  const rows = db.users.filter((row) => matches(`${row.full_name} ${row.email}`, q));
  /** @type {Record<string, (row: any) => string>} */
  const sorters = {
    fullName: (row) => row.full_name,
    email: (row) => row.email,
    role: (row) => row.role,
    createdAt: (row) => row.created_at,
  };
  const result = paginate(sortRows(rows, sorters[sort] ?? sorters.fullName, order), page, pageSize);
  return { ...result, items: result.items.map(userFromRow) };
}

/**
 * @param {import('./store.js').Database} db
 * @param {string} email
 * @param {string} [exceptId]
 */
function assertEmailFree(db, email, exceptId) {
  if (db.users.some((row) => row.email === email && row.id !== exceptId)) {
    fail(409, 'email_taken', 'auth.errors.emailTaken');
  }
}

/** @param {{ fullName: string, email: string, role: Role, password: string }} input @returns {Promise<User>} */
export async function createUser({ fullName, email, role, password }) {
  const db = await open();
  requireAdmin(db);
  const address = normalizeEmail(email);
  assertEmailFree(db, address);

  const row = {
    id: newId('u'),
    full_name: fullName.trim(),
    email: address,
    role,
    password_hash: await hashPassword(password),
    created_at: new Date().toISOString(),
  };
  db.users.push(row);
  save(db);
  return userFromRow(row);
}

/**
 * @param {string} id
 * @param {{ fullName?: string, email?: string, role?: Role }} changes
 * @returns {Promise<User>}
 */
export async function updateUser(id, { fullName, email, role }) {
  const db = await open();
  const admin = requireAdmin(db);
  const row = db.users.find((user) => user.id === id);
  if (!row) fail(404, 'not_found', 'users.errors.notFound');
  if (row.id === admin.id && role && role !== 'admin') fail(409, 'conflict', 'users.errors.selfDemote');

  if (email != null) {
    const address = normalizeEmail(email);
    assertEmailFree(db, address, id);
    row.email = address;
  }
  if (fullName != null) row.full_name = fullName.trim();
  if (role != null) row.role = role;
  save(db);
  return userFromRow(row);
}

/** @param {string} id @returns {Promise<{ cancelledBookings: number }>} */
export async function deleteUser(id) {
  const db = await open();
  const admin = requireAdmin(db);
  if (id === admin.id) fail(409, 'conflict', 'users.errors.selfDelete');
  const index = db.users.findIndex((user) => user.id === id);
  if (index === -1) fail(404, 'not_found', 'users.errors.notFound');

  const today = todayIso();
  const cancelled = db.bookings.filter(
    (row) => row.user_id === id && row.status === 'active' && row.to_date >= today,
  );
  for (const row of cancelled) row.status = 'cancelled';
  for (const [token, userId] of Object.entries(db.sessions)) {
    if (userId === id) delete db.sessions[token];
  }
  db.users.splice(index, 1);
  save(db);
  return { cancelledBookings: cancelled.length };
}
