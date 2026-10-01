// @ts-check
import { diffDays, eachDay, isValidIso, todayIso } from '../../core/date.js';
import { bookingFromRow } from '../../mappers/backend.js';
import { DEFAULT_COPIES, occupancy } from './books.js';
import { fail, newId, open, requireUser, save } from './store.js';

/** @typedef {import('../../types.js').Booking} Booking */
/** @typedef {import('../../types.js').IsoDate} IsoDate */

export const MAX_BOOKING_DAYS = 14;

/**
 * @param {{ bookId: string, fromDate: IsoDate, toDate: IsoDate }} input
 * @returns {Promise<Booking>}
 */
export async function createBooking({ bookId, fromDate, toDate }) {
  const db = await open();
  const user = requireUser(db);

  if (!isValidIso(fromDate) || !isValidIso(toDate) || toDate < fromDate) {
    fail(422, 'invalid', 'booking.errors.invalidRange');
  }
  if (fromDate < todayIso()) fail(422, 'invalid', 'booking.errors.past');
  if (diffDays(fromDate, toDate) + 1 > MAX_BOOKING_DAYS) {
    fail(422, 'invalid', 'booking.errors.tooLong', { count: MAX_BOOKING_DAYS });
  }

  const book = db.books.find((row) => row.id === bookId);
  if (!book) fail(404, 'not_found', 'books.errors.notFound');
  const copies = book.copies ?? DEFAULT_COPIES;
  const taken = occupancy(db, bookId);
  if (eachDay(fromDate, toDate).some((day) => (taken.get(day) ?? 0) >= copies)) {
    fail(409, 'conflict', 'booking.errors.unavailable');
  }

  const row = {
    id: newId('b'),
    book_id: bookId,
    user_id: user.id,
    from_date: fromDate,
    to_date: toDate,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  db.bookings.push(row);
  save(db);
  return bookingFromRow(row);
}

/**
 * Members see their own bookings; admins see everyone's.
 * @param {{ bookId?: string, userId?: string, status?: string }} [filter]
 * @returns {Promise<Booking[]>}
 */
export async function listBookings({ bookId, userId, status } = {}) {
  const db = await open();
  const user = requireUser(db);
  const owner = user.role === 'admin' ? userId : user.id;
  return db.bookings
    .filter(
      (row) =>
        (!bookId || row.book_id === bookId) &&
        (!owner || row.user_id === owner) &&
        (!status || row.status === status),
    )
    .sort((a, b) => b.from_date.localeCompare(a.from_date))
    .map(bookingFromRow);
}

/** @param {string} id @returns {Promise<Booking>} */
export async function cancelBooking(id) {
  const db = await open();
  const user = requireUser(db);
  const row = db.bookings.find((entry) => entry.id === id);
  if (!row) fail(404, 'not_found', 'errors.notFound');
  if (user.role !== 'admin' && row.user_id !== user.id) fail(403, 'forbidden', 'errors.forbidden');
  row.status = 'cancelled';
  save(db);
  return bookingFromRow(row);
}
