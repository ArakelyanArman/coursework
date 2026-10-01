// @ts-check
import { diffDays, eachDay, isValidIso, todayIso } from '../../core/date.js';
import { fail, open, requireAdmin } from './store.js';

/** @typedef {import('../../types.js').IsoDate} IsoDate */
/** @typedef {import('../../types.js').Report} Report */
/** @typedef {import('../../types.js').ReportRow} ReportRow */

const TOP_ROWS = 20;

/** @param {any} row Days the booking covers, both ends included. */
const length = (row) => diffDays(row.from_date, row.to_date) + 1;

/** @param {number[]} values */
const average = (values) =>
  values.length === 0 ? 0 : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

/**
 * @param {any[]} rows
 * @param {(row: any) => string} keyOf
 * @returns {Map<string, any[]>}
 */
function groupBy(rows, keyOf) {
  /** @type {Map<string, any[]>} */
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

/**
 * @param {import('../../types.js').ReportType} type
 * @param {{ from: IsoDate, to: IsoDate }} range Bookings are counted by their start date.
 * @returns {Promise<Report>}
 */
export async function getReport(type, { from, to }) {
  const db = await open();
  requireAdmin(db);
  if (!isValidIso(from) || !isValidIso(to) || to < from) {
    fail(422, 'invalid', 'booking.errors.invalidRange');
  }

  const bookings = db.bookings.filter(
    (row) => row.status !== 'cancelled' && row.from_date >= from && row.from_date <= to,
  );
  const titleOf = (/** @type {string} */ id) => db.books.find((book) => book.id === id)?.title ?? id;
  const userOf = (/** @type {string} */ id) => db.users.find((user) => user.id === id);

  /** @type {ReportRow[]} */
  let rows = [];

  if (type === 'bookings-by-date') {
    const perDay = groupBy(bookings, (row) => row.from_date);
    rows = eachDay(from, to).map((date) => ({ date, bookings: perDay.get(date)?.length ?? 0 }));
  } else if (type === 'most-booked') {
    rows = [...groupBy(bookings, (row) => row.book_id)]
      .map(([bookId, group]) => ({
        bookId,
        title: titleOf(bookId),
        bookings: group.length,
        averageDays: average(group.map(length)),
      }))
      .sort((a, b) => b.bookings - a.bookings || a.title.localeCompare(b.title))
      .slice(0, TOP_ROWS);
  } else if (type === 'active-users') {
    rows = [...groupBy(bookings, (row) => row.user_id)]
      .map(([userId, group]) => ({
        userId,
        fullName: userOf(userId)?.full_name ?? userId,
        email: userOf(userId)?.email ?? null,
        bookings: group.length,
        lastBooking: group.map((row) => row.from_date).sort().at(-1) ?? null,
      }))
      .sort((a, b) => b.bookings - a.bookings || a.fullName.localeCompare(b.fullName))
      .slice(0, TOP_ROWS);
  } else if (type === 'overdue') {
    const today = todayIso();
    rows = db.bookings
      .filter((row) => row.status === 'overdue' && row.to_date >= from && row.to_date <= to)
      .map((row) => ({
        bookingId: row.id,
        title: titleOf(row.book_id),
        fullName: userOf(row.user_id)?.full_name ?? row.user_id,
        toDate: row.to_date,
        daysOverdue: diffDays(row.to_date, today),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  } else {
    fail(400, 'invalid', 'errors.unknown');
  }

  return {
    type,
    from,
    to,
    summary: {
      totalBookings: bookings.length,
      uniqueUsers: new Set(bookings.map((row) => row.user_id)).size,
      averageDays: average(bookings.map(length)),
    },
    rows,
  };
}

/** @returns {Promise<{ books: number, users: number, bookings: number }>} */
export async function getCounts() {
  const db = await open({ wait: false });
  return { books: db.books.length, users: db.users.length, bookings: db.bookings.length };
}
