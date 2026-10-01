// @ts-check
import { clearHttpCache } from '../core/http.js';
import { setShared } from '../core/storage.js';
import { demo } from '../providers/index.js';

/** False once the app talks to the real backend: there is no local demo data then. */
export const hasDemoData = demo !== null;

/** @returns {Promise<{ books: number, users: number, bookings: number } | null>} */
export async function getDemoCounts() {
  return demo ? demo.counts() : null;
}

/** Restore the seed data and sign out, since sessions live in the same store. */
export async function resetDemoData() {
  if (!demo) return;
  await demo.reset();
  clearHttpCache();
  setShared('session', null);
}
