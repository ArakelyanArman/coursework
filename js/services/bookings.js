// @ts-check
import { diffDays, eachDay, isValidIso, todayIso } from '../core/date.js';
import { library } from '../providers/index.js';

/** @typedef {import('../types.js').Booking} Booking */
/** @typedef {import('../types.js').IsoDate} IsoDate */

export const MAX_BOOKING_DAYS = 14;

/**
 * The same rules the provider enforces, checked up front so the form can show the error inline.
 * @param {IsoDate | null} fromDate
 * @param {IsoDate | null} toDate
 * @param {IsoDate[]} [unavailableDates]
 * @returns {import('../core/validate.js').ValidationError | null}
 */
export function checkBookingRange(fromDate, toDate, unavailableDates = []) {
  if (!fromDate || !toDate || !isValidIso(fromDate) || !isValidIso(toDate) || toDate < fromDate) {
    return { key: 'booking.errors.invalidRange' };
  }
  if (fromDate < todayIso()) return { key: 'booking.errors.past' };
  if (diffDays(fromDate, toDate) + 1 > MAX_BOOKING_DAYS) {
    return { key: 'booking.errors.tooLong', params: { count: MAX_BOOKING_DAYS } };
  }
  const blocked = new Set(unavailableDates);
  if (eachDay(fromDate, toDate).some((day) => blocked.has(day))) {
    return { key: 'booking.errors.unavailable' };
  }
  return null;
}

/** @param {{ bookId: string, fromDate: IsoDate, toDate: IsoDate }} input @returns {Promise<Booking>} */
export function createBooking(input) {
  return library.createBooking(input);
}

/** @param {{ bookId?: string, userId?: string, status?: string }} [filter] @returns {Promise<Booking[]>} */
export function listBookings(filter) {
  return library.listBookings(filter);
}

/** @param {string} id @returns {Promise<Booking>} */
export function cancelBooking(id) {
  return library.cancelBooking(id);
}
