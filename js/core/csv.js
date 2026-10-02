// @ts-check

/** @param {unknown} value Quoted when it holds a separator, a quote or a line break. */
function cell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @param {string[]} header
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function toCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

/**
 * Save text as a CSV file. The byte-order mark makes Excel read it as UTF-8, so Armenian
 * text opens correctly.
 * @param {string} filename
 * @param {string} csv
 */
export function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
