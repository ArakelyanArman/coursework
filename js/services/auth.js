// @ts-check
import { ApiError } from '../core/http.js';
import { getShared, setShared } from '../core/storage.js';
import { library } from '../providers/index.js';

/** @typedef {import('../types.js').Session} Session */
/** @typedef {import('../types.js').User} User */

/** @returns {Session | null} */
export function getSession() {
  const session = getShared('session');
  return session?.token && session?.user ? session : null;
}

/** @returns {User | null} */
export const currentUser = () => getSession()?.user ?? null;

export const isLoggedIn = () => getSession() !== null;

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
export async function login(email, password) {
  const session = await library.login({ email, password });
  setShared('session', session);
  return session.user;
}

/** @param {{ email: string, fullName: string, password: string }} input @returns {Promise<User>} */
export async function register(input) {
  const session = await library.register(input);
  setShared('session', session);
  return session.user;
}

export async function logout() {
  try {
    await library.logout();
  } finally {
    setShared('session', null);
  }
}

/**
 * Re-read the signed-in user; signs out locally when the server no longer knows the session.
 * @returns {Promise<User | null>}
 */
export async function refreshSession() {
  const session = getSession();
  if (!session) return null;
  try {
    const user = await library.me();
    // Written only when something changed, so pages are not told about a change that is none.
    if (JSON.stringify(user) !== JSON.stringify(session.user)) {
      setShared('session', { token: session.token, user });
    }
    return user;
  } catch (error) {
    // A failed request (offline, server down) says nothing about the session; only a 401 does.
    if (!(error instanceof ApiError) || error.status !== 401) return session.user;
    setShared('session', null);
    return null;
  }
}
