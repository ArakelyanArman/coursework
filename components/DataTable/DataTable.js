// @ts-check
import { h } from '../../js/core/dom.js';
import { setAttrText, setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { Button } from '../Button/Button.js';
import { Checkbox, checkInput } from '../Checkbox/Checkbox.js';
import { Icon } from '../Icon/Icon.js';
import { Skeleton } from '../Skeleton/Skeleton.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */
/** @typedef {{ id: string, order: 'asc' | 'desc' }} Sort */

/**
 * @typedef {object} Column
 * @property {string} id
 * @property {Text} label
 * @property {boolean} [hideLabel] Header for screen readers only (the actions column).
 * @property {boolean} [sortable]
 * @property {boolean} [primary] The cell that names the row; rendered as its row header.
 * @property {'numeric' | 'actions'} [kind]
 * @property {(row: any) => Node | string | number | null} render
 */

/**
 * @typedef {object} Selection
 * @property {(row: any) => string} nameOf For each row checkbox's label ("Select {name}").
 * @property {(ids: string[]) => Element[]} actions Bulk actions for the selected rows.
 * @property {(ids: string[]) => void} [onChange]
 */

/**
 * @typedef {HTMLElement & {
 *   update: (patch: { rows?: any[], sort?: Sort | null }) => void,
 *   selected: () => string[],
 *   clearSelection: () => void,
 * }} DataTableElement
 */

const create = await loadTemplate(new URL('./DataTable.html', import.meta.url));

/**
 * @param {object} props
 * @param {Text} props.label The table's caption, for screen readers.
 * @param {Column[]} props.columns
 * @param {any[]} [props.rows]
 * @param {(row: any) => string} props.rowId
 * @param {Sort | null} [props.sort]
 * @param {(sort: Sort) => void} [props.onSort]
 * @param {Selection} [props.selection]
 * @returns {DataTableElement}
 */
export function DataTable({ label, columns, rows = [], rowId, sort = null, onSort, selection }) {
  const card = create();
  const parts = refs(card);
  /** @type {Set<string>} */
  const selected = new Set();
  let currentRows = rows;
  let currentSort = sort;

  setText(parts.caption, label);
  if (selection) parts.table.classList.add('data-table--selectable');

  const selectAll = selection
    ? Checkbox({
        label: { key: 'table.selectAll' },
        onChange: (checked) => {
          selected.clear();
          if (checked) currentRows.forEach((row) => selected.add(rowId(row)));
          renderBody();
          changed();
        },
      })
    : null;

  function changed() {
    selection?.onChange?.([...selected]);
  }

  function renderHead() {
    parts.head.replaceChildren(
      h(
        'tr',
        selectAll && h('th', { class: 'data-table__check', scope: 'col' }, selectAll),
        columns.map((column) => {
          const active = currentSort?.id === column.id;
          const th = h('th', {
            scope: 'col',
            class: column.kind ? `data-table__${column.kind}` : null,
            'aria-sort': active ? (currentSort?.order === 'asc' ? 'ascending' : 'descending') : null,
          });
          const text = h('span', { class: column.hideLabel ? 'sr-only' : null });
          setText(text, column.label);

          if (column.sortable && onSort) {
            const order = active && currentSort?.order === 'asc' ? 'desc' : 'asc';
            th.append(
              h(
                'button',
                { type: 'button', class: 'data-table__sort', onClick: () => onSort({ id: column.id, order }) },
                text,
                Icon('chevron-down', 14),
              ),
            );
          } else {
            th.append(text);
          }
          return th;
        }),
      ),
    );
  }

  function renderBulk() {
    const ids = [...selected];
    parts.bulk.hidden = ids.length === 0;
    if (!selection || ids.length === 0) return;

    setText(parts.count, { key: 'table.selected', params: { count: ids.length } });
    parts.actions.replaceChildren(
      ...selection.actions(ids),
      Button({
        label: { key: 'common.clear' },
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          selected.clear();
          renderBody();
          changed();
        },
      }),
    );
  }

  function renderBody() {
    parts.body.replaceChildren(
      ...currentRows.map((row) => {
        const id = rowId(row);
        const tr = h('tr', { class: selected.has(id) ? 'is-selected' : null });

        if (selection) {
          tr.append(
            h(
              'td',
              { class: 'data-table__check' },
              Checkbox({
                label: { key: 'table.selectRow', params: { name: selection.nameOf(row) } },
                hideLabel: true,
                checked: selected.has(id),
                onChange: (checked) => {
                  if (checked) selected.add(id);
                  else selected.delete(id);
                  tr.classList.toggle('is-selected', checked);
                  syncSelectAll();
                  renderBulk();
                  changed();
                },
              }),
            ),
          );
        }

        for (const column of columns) {
          const cell = column.primary
            ? h('th', { scope: 'row' }, column.render(row))
            : h('td', { class: column.kind ? `data-table__${column.kind}` : null }, column.render(row));
          // Shown in front of the value when the table collapses to cards on small screens.
          if (!column.primary && column.kind !== 'actions') setAttrText(cell, 'data-label', column.label);
          tr.append(cell);
        }
        return tr;
      }),
    );
    syncSelectAll();
    renderBulk();
  }

  function syncSelectAll() {
    if (!selectAll) return;
    const input = checkInput(selectAll);
    input.checked = currentRows.length > 0 && selected.size === currentRows.length;
    input.indeterminate = selected.size > 0 && selected.size < currentRows.length;
  }

  card.update = (/** @type {{ rows?: any[], sort?: Sort | null }} */ patch) => {
    if (patch.rows) {
      currentRows = patch.rows;
      const present = new Set(currentRows.map(rowId));
      for (const id of selected) if (!present.has(id)) selected.delete(id);
    }
    if (patch.sort !== undefined) currentSort = patch.sort;
    renderHead();
    renderBody();
  };
  card.selected = () => [...selected];
  card.clearSelection = () => {
    selected.clear();
    renderBody();
  };

  renderHead();
  renderBody();
  return card;
}

/**
 * @param {{ rows?: number }} [props]
 * @returns {HTMLElement}
 */
export function DataTableSkeleton({ rows = 5 } = {}) {
  return h(
    'div',
    { class: 'table-card', 'aria-hidden': true },
    Skeleton({ variant: 'block', height: 'var(--size-input)' }),
    Array.from({ length: rows }, () =>
      h('div', { class: 'data-table__skeleton-row' }, Skeleton({ width: '30%' }), Skeleton({ width: '20%' }), Skeleton({ width: '12%' })),
    ),
  );
}
