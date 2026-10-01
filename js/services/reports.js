// @ts-check
import { library } from '../providers/index.js';

/** @typedef {import('../types.js').ReportType} ReportType */
/** @typedef {import('../types.js').IsoDate} IsoDate */

/**
 * `columns` names the row fields to show, in order; `chart` plots `value` against `label`.
 * @type {{ id: ReportType, labelKey: string, chart: 'line' | 'bar', label: string, value: string, columns: string[] }[]}
 */
export const REPORT_TYPES = [
  {
    id: 'bookings-by-date',
    labelKey: 'reports.types.bookingsByDate',
    chart: 'line',
    label: 'date',
    value: 'bookings',
    columns: ['date', 'bookings'],
  },
  {
    id: 'most-booked',
    labelKey: 'reports.types.mostBooked',
    chart: 'bar',
    label: 'title',
    value: 'bookings',
    columns: ['title', 'bookings', 'averageDays'],
  },
  {
    id: 'active-users',
    labelKey: 'reports.types.activeUsers',
    chart: 'bar',
    label: 'fullName',
    value: 'bookings',
    columns: ['fullName', 'email', 'bookings', 'lastBooking'],
  },
  {
    id: 'overdue',
    labelKey: 'reports.types.overdue',
    chart: 'bar',
    label: 'title',
    value: 'daysOverdue',
    columns: ['title', 'fullName', 'toDate', 'daysOverdue'],
  },
];

/**
 * @param {ReportType} type
 * @param {{ from: IsoDate, to: IsoDate }} range
 * @returns {Promise<import('../types.js').Report>}
 */
export function getReport(type, range) {
  return library.getReport(type, range);
}
