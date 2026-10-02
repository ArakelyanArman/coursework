// @ts-check
import { Button, setLoading } from '../../../components/Button/Button.js';
import { DataTable, DataTableSkeleton } from '../../../components/DataTable/DataTable.js';
import { DateRangeField } from '../../../components/DateField/DateField.js';
import { EmptyState, ErrorState } from '../../../components/EmptyState/EmptyState.js';
import { Select } from '../../../components/Select/Select.js';
import { Skeleton } from '../../../components/Skeleton/Skeleton.js';
import { StatCard, StatList } from '../../../components/StatCard/StatCard.js';
import { downloadCsv, toCsv } from '../../core/csv.js';
import { addMonths, isValidIso, todayIso } from '../../core/date.js';
import { h, qs, render } from '../../core/dom.js';
import { EVENTS, on } from '../../core/events.js';
import { formatDate, formatNumber } from '../../core/format.js';
import { t } from '../../core/i18n.js';
import { refs } from '../../core/template.js';
import { readParams, writeParams } from '../../core/url-state.js';
import { REPORT_TYPES, getReport } from '../../services/reports.js';
import { mountAdmin } from './layout.js';
import { ReportChart } from './report-chart.js';

/** @typedef {import('../../types.js').Report} Report */
/** @typedef {typeof REPORT_TYPES[number]} ReportType */

const SCHEMA = /** @type {import('../../core/url-state.js').ParamSchema} */ ({
  type: { type: 'string' },
  from: { type: 'string' },
  to: { type: 'string' },
});
const DATE_COLUMNS = new Set(['date', 'lastBooking', 'toDate']);
const NUMBER_COLUMNS = new Set(['bookings', 'averageDays', 'daysOverdue']);

await mountAdmin('reports');

const content = qs('#admin-content');
const params = readParams(SCHEMA);
const typeOf = (/** @type {string} */ id) => REPORT_TYPES.find((type) => type.id === id);

// A report named in the address is run at once; otherwise the last three months are offered.
const fromAddress = Boolean(
  typeOf(params.type) && isValidIso(params.from) && isValidIso(params.to),
);
const initial = {
  type: typeOf(params.type)?.id ?? REPORT_TYPES[0].id,
  from: fromAddress ? params.from : addMonths(todayIso(), -3),
  to: fromAddress ? params.to : todayIso(),
};
/** @type {{ report: Report, type: ReportType } | null} The result on screen. */
let shown = null;

const typeSelect = Select({
  label: { key: 'admin.reports.type' },
  name: 'type',
  value: initial.type,
  options: REPORT_TYPES.map(({ id, labelKey }) => ({ value: id, label: { key: labelKey } })),
});
const range = DateRangeField({ from: initial.from, to: initial.to });
const generate = Button({ label: { key: 'admin.reports.generate' }, type: 'submit' });
const controls = qs('#report-controls');
render(controls, typeSelect, range, h('div', { class: 'report-controls__submit' }, generate));

/** @param {string} column @param {unknown} value @returns {string} As shown in the table. */
function display(column, value) {
  if (value == null) return '';
  if (DATE_COLUMNS.has(column)) return formatDate(String(value));
  if (NUMBER_COLUMNS.has(column)) return formatNumber(Number(value), { maximumFractionDigits: 1 });
  return String(value);
}

/** @param {Report} report @param {ReportType} type */
function exportCsv(report, type) {
  const header = type.columns.map((column) => t(`admin.reports.columns.${column}`));
  const rows = report.rows.map((row) => type.columns.map((column) => row[column]));
  downloadCsv(`${type.id}_${report.from}_${report.to}.csv`, toCsv(header, rows));
}

/** @param {Report} report @param {ReportType} type */
function showReport(report, type) {
  shown = { report, type };
  const { summary } = report;
  const stats = StatList([
    StatCard({
      label: { key: 'admin.reports.stats.totalBookings' },
      value: formatNumber(summary.totalBookings),
    }),
    StatCard({
      label: { key: 'admin.reports.stats.uniqueUsers' },
      value: formatNumber(summary.uniqueUsers),
    }),
    StatCard({
      label: { key: 'admin.reports.stats.averageDays' },
      value: formatNumber(summary.averageDays, { maximumFractionDigits: 1 }),
    }),
  ]);

  const byDate = type.id === 'bookings-by-date';
  const hasRows = byDate ? summary.totalBookings > 0 : report.rows.length > 0;
  if (!hasRows) {
    render(
      content,
      stats,
      EmptyState({
        title: { key: 'admin.reports.none.title' },
        text: { key: 'admin.reports.none.text' },
      }),
    );
    return;
  }

  // Day by day, the chart shows every date; the table lists only the days that had bookings.
  const tableRows = byDate ? report.rows.filter((row) => Number(row.bookings) > 0) : report.rows;
  const table = DataTable({
    label: { key: 'admin.reports.tableLabel' },
    rowId: (row) => String(row[type.columns[0]]) + String(row.bookingId ?? ''),
    rows: tableRows,
    columns: type.columns.map((column, index) => ({
      id: column,
      label: { key: `admin.reports.columns.${column}` },
      primary: index === 0,
      kind: NUMBER_COLUMNS.has(column) ? /** @type {const} */ ('numeric') : undefined,
      render: (row) => display(column, row[column]),
    })),
  });

  render(
    content,
    h(
      'div',
      { class: 'report-result' },
      stats,
      ReportChart(report, type),
      h(
        'div',
        { class: 'report-result__toolbar' },
        Button({
          label: { key: 'admin.reports.exportCsv' },
          variant: 'secondary',
          icon: 'download',
          onClick: () => exportCsv(report, type),
        }),
      ),
      table,
    ),
  );
}

function showSkeleton() {
  render(
    content,
    StatList(
      Array.from({ length: 3 }, () =>
        h(
          'div',
          { class: 'stat-card', 'aria-hidden': true },
          Skeleton({ width: '60%' }),
          Skeleton({ variant: 'block', width: '40%', height: 'var(--text-h1-line)' }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'report-chart', 'aria-hidden': true },
      Skeleton({ variant: 'block', height: '100%' }),
    ),
    DataTableSkeleton(),
  );
}

async function run() {
  const type = typeOf(refs(typeSelect).input.value) ?? REPORT_TYPES[0];
  const { from, to } = range.value();
  if (!from || !to) {
    range.setError({ key: 'booking.errors.invalidRange' });
    controls.querySelector('.date-range input')?.focus();
    return;
  }
  range.setError(null);
  writeParams({ type: type.id, from, to }, SCHEMA, { replace: true });

  shown = null;
  setLoading(generate, true);
  content.setAttribute('aria-busy', 'true');
  showSkeleton();
  try {
    showReport(await getReport(type.id, { from, to }), type);
  } catch (error) {
    render(content, ErrorState({ error, onRetry: run }));
  } finally {
    setLoading(generate, false);
    content.removeAttribute('aria-busy');
  }
}

controls.addEventListener('submit', (/** @type {SubmitEvent} */ event) => {
  event.preventDefault();
  run();
});

// Dates and numbers in the result are formatted for the language, so it is drawn again.
on(EVENTS.LANG_CHANGE, () => {
  if (shown) showReport(shown.report, shown.type);
});

if (fromAddress) {
  run();
} else {
  render(
    content,
    EmptyState({
      icon: 'chart-column',
      title: { key: 'admin.reports.empty.title' },
      text: { key: 'admin.reports.empty.text' },
    }),
  );
}
