// @ts-check
// Everything no public API offers: auth, users, bookings, inventory and reports,
// kept in localStorage and seeded from data/seed/ on first run.
export { login, logout, me, register } from './local/auth.js';
export {
  countUpcomingBookings,
  createBook,
  deleteBook,
  ensureBook,
  getStoredBook,
  getUnavailableDates,
  listBooks,
  updateBook,
  withAvailability,
} from './local/books.js';
export { MAX_BOOKING_DAYS, cancelBooking, createBooking, listBookings } from './local/bookings.js';
export { getCounts, getReport } from './local/reports.js';
export { resetDatabase } from './local/store.js';
export { createUser, deleteUser, listUsers, updateUser } from './local/users.js';
