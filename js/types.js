// @ts-check

/**
 * Domain types. Field names map 1:1 to database columns: camelCase here, snake_case in the API.
 *
 * @typedef {import('./core/date.js').IsoDate} IsoDate
 * @typedef {import('./core/http.js').ApiError} ApiError
 * @typedef {'member' | 'admin'} Role
 * @typedef {'active' | 'returned' | 'cancelled' | 'overdue'} BookingStatus
 * @typedef {'available' | 'few' | 'unavailable'} Availability
 */

/**
 * @typedef {object} Book
 * @property {string} id Open Library work ID (e.g. "OL27482W") or a local ID.
 * @property {string} title
 * @property {string[]} authors Author names.
 * @property {string[]} authorIds Open Library author IDs, parallel to `authors` when known.
 * @property {string | null} category A Category id.
 * @property {string[]} genres Genre ids.
 * @property {number | null} firstPublishYear
 * @property {number | null} coverId Open Library cover ID.
 * @property {string | null} coverUrl Custom cover set by an admin; wins over `coverId`.
 * @property {string | null} description
 * @property {string[]} subjects
 * @property {number | null} copies
 * @property {number | null} availableCopies Copies not out today.
 * @property {Availability | null} availability
 * @property {string | null} createdAt
 */

/**
 * @typedef {object} BookInput
 * @property {string} [id] Open Library work ID when imported; omitted for manual entries.
 * @property {string} title
 * @property {string[]} authors
 * @property {string | null} [category]
 * @property {string[]} [genres]
 * @property {number | null} [firstPublishYear]
 * @property {number | null} [coverId]
 * @property {string | null} [coverUrl]
 * @property {string | null} [description]
 * @property {number} copies
 */

/**
 * @typedef {object} BookQuery
 * @property {string} [q]
 * @property {string} [category] A Category id.
 * @property {string[]} [authors] Open Library author IDs.
 * @property {string[]} [genres] Genre ids.
 * @property {number | null} [yearFrom]
 * @property {number | null} [yearTo]
 * @property {string} [sort] 'relevance' | 'title' | 'newest' | 'trending'
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * @typedef {object} ListQuery
 * @property {string} [q]
 * @property {string} [category]
 * @property {string} [sort]
 * @property {'asc' | 'desc'} [order]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * @template T
 * @typedef {object} Paged
 * @property {T[]} items
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 */

/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} fullName
 * @property {string} email
 * @property {Role} role
 * @property {string} createdAt
 */

/**
 * @typedef {object} Session
 * @property {string} token
 * @property {User} user
 */

/**
 * @typedef {object} Booking
 * @property {string} id
 * @property {string} bookId
 * @property {string} userId
 * @property {IsoDate} fromDate
 * @property {IsoDate} toDate
 * @property {BookingStatus} status
 * @property {string} createdAt
 */

/**
 * @typedef {object} Category
 * @property {string} id
 * @property {string} subject Open Library subject key.
 * @property {string} labelKey
 */

/**
 * @typedef {'bookings-by-date' | 'most-booked' | 'active-users' | 'overdue'} ReportType
 * @typedef {Record<string, string | number | null>} ReportRow
 *
 * @typedef {object} Report
 * @property {ReportType} type
 * @property {IsoDate} from
 * @property {IsoDate} to
 * @property {{ totalBookings: number, uniqueUsers: number, averageDays: number }} summary
 * @property {ReportRow[]} rows
 */

export {};
