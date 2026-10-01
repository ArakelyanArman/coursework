// @ts-check
import { library } from '../providers/index.js';
import { currentUser, refreshSession } from './auth.js';

/** @typedef {import('../types.js').User} User */
/** @typedef {import('../types.js').Role} Role */

export const ROLES = /** @type {Role[]} */ (['member', 'admin']);

/** @param {string} userId @returns {boolean} Admins cannot delete or demote themselves. */
export const isSelf = (userId) => currentUser()?.id === userId;

/** @param {import('../types.js').ListQuery} [query] */
export function listUsers(query) {
  return library.listUsers(query);
}

/** @param {{ fullName: string, email: string, role: Role, password: string }} input @returns {Promise<User>} */
export function createUser(input) {
  return library.createUser(input);
}

/**
 * @param {string} id
 * @param {{ fullName?: string, email?: string, role?: Role }} changes
 * @returns {Promise<User>}
 */
export async function updateUser(id, changes) {
  const user = await library.updateUser(id, changes);
  if (isSelf(id)) await refreshSession();
  return user;
}

/** @param {string} id @returns {Promise<{ cancelledBookings: number }>} */
export function deleteUser(id) {
  return library.deleteUser(id);
}
