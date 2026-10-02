// @ts-check
import { DataTableSkeleton } from '../../../components/DataTable/DataTable.js';
import { ErrorState } from '../../../components/EmptyState/EmptyState.js';
import { Pagination } from '../../../components/Pagination/Pagination.js';
import { SearchField } from '../../../components/SearchField/SearchField.js';
import { qs, render } from '../../core/dom.js';
import { buildUrl, onParamsChange, readParams, writeParams } from '../../core/url-state.js';

/** @typedef {import('../../core/i18n.js').Text} Text */
/** @typedef {import('../../../components/DataTable/DataTable.js').Sort} Sort */
/**
 * @typedef {import('../../../components/DataTable/DataTable.js').DataTableElement} DataTableElement
 * @typedef {import('../../types.js').ListQuery} ListQuery
 * @typedef {import('../../types.js').Paged<any>} Page
 */

export const PAGE_SIZE = 10;

/**
 * The part the Books and Users pages share: a searchable, sortable, paged table whose
 * search, sort and page live in the address.
 * @param {object} options
 * @param {string} options.path The page's own path, for the pagination links.
 * @param {Sort} options.defaultSort
 * @param {Text} options.searchLabel
 * @param {Text} options.searchPlaceholder
 * @param {Element} options.addButton
 * @param {(query: ListQuery) => Promise<Page>} options.load
 * @param {(sort: Sort, onSort: (sort: Sort) => void) => DataTableElement} options.createTable
 * @param {(q: string) => Element} options.emptyState Shown when nothing is listed.
 * @returns {{ reload: () => Promise<void>, rows: () => any[] }}
 */
export function mountList({
  path,
  defaultSort,
  searchLabel,
  searchPlaceholder,
  addButton,
  load,
  createTable,
  emptyState,
}) {
  const schema = /** @type {import('../../core/url-state.js').ParamSchema} */ ({
    q: { type: 'string' },
    sort: { type: 'string', default: defaultSort.id },
    order: { type: 'string', default: defaultSort.order },
    page: { type: 'number', default: 1 },
  });
  const content = qs('#admin-content');
  const pagination = qs('#admin-pagination');

  const read = () => {
    const raw = readParams(schema);
    return {
      q: String(raw.q).trim(),
      sort: String(raw.sort),
      order: raw.order === 'desc' ? /** @type {const} */ ('desc') : /** @type {const} */ ('asc'),
      page: Number.isInteger(raw.page) && raw.page > 0 ? Number(raw.page) : 1,
    };
  };
  let state = read();
  /** @type {any[]} */
  let rows = [];
  let request = 0;

  /** @param {Partial<typeof state>} patch */
  const update = (patch) => {
    state = { ...state, ...patch };
    writeParams(state, schema);
    reload();
  };

  const search = SearchField({
    label: searchLabel,
    placeholder: searchPlaceholder,
    value: state.q,
    onSubmit: (q) => update({ q, page: 1 }),
  });
  const table = createTable({ id: state.sort, order: state.order }, (sort) =>
    update({ sort: sort.id, order: sort.order, page: 1 }),
  );

  async function reload() {
    const current = (request += 1);
    content.setAttribute('aria-busy', 'true');
    if (!table.isConnected) render(content, DataTableSkeleton());

    try {
      const result = await load({ ...state, pageSize: PAGE_SIZE });
      if (current !== request) return;

      // The last row of the last page was deleted: step back to the page that now ends the list.
      const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (state.page > pageCount) {
        state = { ...state, page: pageCount };
        writeParams(state, schema, { replace: true });
        await reload();
        return;
      }

      rows = result.items;
      if (rows.length === 0) {
        render(content, emptyState(state.q));
      } else {
        table.update({ rows, sort: { id: state.sort, order: state.order } });
        if (!table.isConnected) render(content, table);
      }
      render(
        pagination,
        Pagination({
          page: state.page,
          pageCount,
          hrefFor: (page) => buildUrl(path, { ...state, page }, schema),
          onNavigate: (page) => {
            update({ page });
            content.focus({ preventScroll: true });
            content.scrollIntoView({ block: 'start' });
          },
        }),
      );
    } catch (error) {
      if (current !== request) return;
      render(content, ErrorState({ error, onRetry: reload }));
      render(pagination);
    } finally {
      if (current === request) content.removeAttribute('aria-busy');
    }
  }

  render(qs('#admin-toolbar'), search, addButton);
  onParamsChange(() => {
    state = read();
    /** @type {HTMLInputElement} */ (search.querySelector('input')).value = state.q;
    reload();
  });
  reload();

  return { reload, rows: () => rows };
}
