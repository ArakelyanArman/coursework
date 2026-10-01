// @ts-check
import { getShared } from '../../core/storage.js';
import { userFromRow } from '../../mappers/backend.js';
import { fail, newId, open, requireUser, save } from './store.js';

/** @typedef {import('../../types.js').Session} Session */

const MIN_PASSWORD_LENGTH = 8;

/** Mock only: a real backend must use a salted, slow password hash. */
export async function hashPassword(/** @type {string} */ password) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** @param {string} email */
export const normalizeEmail = (email) => email.trim().toLowerCase();

/**
 * @param {import('./store.js').Database} db
 * @param {any} row
 * @returns {Session}
 */
function startSession(db, row) {
  const token = crypto.randomUUID();
  db.sessions[token] = row.id;
  save(db);
  return { token, user: userFromRow(row) };
}

/** @param {{ email: string, password: string }} credentials @returns {Promise<Session>} */
export async function login({ email, password }) {
  const db = await open();
  const row = db.users.find((user) => user.email === normalizeEmail(email));
  if (!row || row.password_hash !== (await hashPassword(password))) {
    fail(401, 'invalid_credentials', 'auth.errors.invalidCredentials');
  }
  return startSession(db, row);
}

/** @param {{ email: string, fullName: string, password: string }} input @returns {Promise<Session>} */
export async function register({ email, fullName, password }) {
  const db = await open();
  const address = normalizeEmail(email);
  if (db.users.some((user) => user.email === address)) {
    fail(409, 'email_taken', 'auth.errors.emailTaken');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(422, 'invalid', 'validation.minLength', { count: MIN_PASSWORD_LENGTH });
  }

  const row = {
    id: newId('u'),
    full_name: fullName.trim(),
    email: address,
    role: 'member',
    password_hash: await hashPassword(password),
    created_at: new Date().toISOString(),
  };
  db.users.push(row);
  return startSession(db, row);
}

export async function logout() {
  const db = await open({ wait: false });
  const token = getShared('session')?.token;
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    save(db);
  }
}

/** @returns {Promise<import('../../types.js').User>} The signed-in user; 401 when the session is gone. */
export async function me() {
  const db = await open({ wait: false });
  return userFromRow(requireUser(db));
}
