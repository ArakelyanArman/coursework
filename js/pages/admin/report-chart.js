// @ts-check
import { h } from '../../core/dom.js';
import { EVENTS, on } from '../../core/events.js';
import { formatDate, formatDateRange } from '../../core/format.js';
import { t } from '../../core/i18n.js';
import { assetUrl } from '../../core/paths.js';

/** @typedef {import('../../types.js').Report} Report */
/** @typedef {typeof import('../../services/reports.js').REPORT_TYPES[number]} ReportType */

const MAX_LABEL_LENGTH = 32;

/** @type {Promise<any> | null} */
let library = null;

/** Chart.js is large and only this page draws charts, so it is fetched on first use. */
function loadChartLibrary() {
  library ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = assetUrl('assets/vendor/chart.umd.min.js');
    script.addEventListener('load', () => resolve(/** @type {any} */ (window).Chart));
    script.addEventListener('error', () => {
      library = null;
      reject(new Error('Chart.js did not load'));
    });
    document.head.append(script);
  });
  return library;
}

/** @param {string} name A custom property on the page, e.g. '--color-primary'. */
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** @param {string} text */
const shorten = (text) =>
  text.length > MAX_LABEL_LENGTH ? `${text.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…` : text;

/**
 * Everything visual is read from the design tokens at draw time, so the chart matches the theme.
 * @param {Report} report
 * @param {ReportType} type
 */
function chartConfig(report, type) {
  const line = type.chart === 'line';
  const primary = token('--color-primary');
  const grid = { color: token('--color-border') };
  const ticks = { color: token('--color-text-muted') };
  const count = { beginAtZero: true, grid, ticks: { ...ticks, precision: 0 } };
  // Day labels stay level and are thinned out rather than squeezed in at an angle.
  const category = {
    grid: { display: false },
    ticks: line
      ? { ...ticks, maxRotation: 0, autoSkipPadding: parseFloat(token('--space-4')) }
      : ticks,
  };

  return {
    type: type.chart,
    data: {
      labels: report.rows.map((row) =>
        type.label === 'date'
          ? formatDate(String(row.date), 'short')
          : shorten(String(row[type.label])),
      ),
      datasets: [
        {
          label: t(`admin.reports.columns.${type.value}`),
          data: report.rows.map((row) => Number(row[type.value])),
          borderColor: primary,
          backgroundColor: line ? token('--color-primary-soft') : primary,
          borderWidth: line ? parseFloat(token('--border-width-strong')) : 0,
          borderRadius: parseFloat(token('--radius-sm')),
          fill: line,
          cubicInterpolationMode: 'monotone',
          pointRadius: 0,
          pointHitRadius: parseFloat(token('--space-3')),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Long book titles and names read better beside horizontal bars.
      indexAxis: line ? 'x' : 'y',
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
      interaction: { mode: 'index', intersect: false, axis: line ? 'x' : 'y' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: token('--color-text'),
          titleColor: token('--color-bg'),
          bodyColor: token('--color-bg'),
          displayColors: false,
        },
      },
      scales: line ? { x: category, y: count } : { x: count, y: category },
    },
  };
}

/**
 * The report as a line or bar chart. It redraws itself when the theme or the language changes.
 * The table below it holds the same figures, which is what screen readers are given.
 * @param {Report} report
 * @param {ReportType} type
 * @returns {HTMLElement}
 */
export function ReportChart(report, type) {
  const canvas = h('canvas', { role: 'img' });
  const figure = h(
    'div',
    { class: ['report-chart', type.chart === 'bar' && 'report-chart--bar'] },
    canvas,
  );
  figure.style.setProperty('--chart-rows', String(report.rows.length));
  /** @type {any} */
  let chart = null;

  async function draw() {
    canvas.setAttribute(
      'aria-label',
      t('admin.reports.chartLabel', {
        type: t(type.labelKey),
        range: formatDateRange(report.from, report.to),
      }),
    );
    try {
      const Chart = await loadChartLibrary();
      chart?.destroy();
      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
      Chart.defaults.font.size = parseFloat(getComputedStyle(figure).fontSize);
      chart = new Chart(canvas, chartConfig(report, type));
    } catch {
      // Without the chart the figures are still in the table below.
      figure.hidden = true;
    }
  }

  const redraw = () => {
    if (figure.isConnected) {
      draw();
      return;
    }
    chart?.destroy();
    stopTheme();
    stopLanguage();
  };
  const stopTheme = on(EVENTS.THEME_CHANGE, redraw);
  const stopLanguage = on(EVENTS.LANG_CHANGE, redraw);

  draw();
  return figure;
}
