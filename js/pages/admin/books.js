// @ts-check
import { AvailabilityBadge } from '../../../components/Badge/Badge.js';
import { bookUrl } from '../../../components/BookCard/BookCard.js';
import { BookCover } from '../../../components/BookCover/BookCover.js';
import { Button, IconButton } from '../../../components/Button/Button.js';
import { DataTable } from '../../../components/DataTable/DataTable.js';
import { confirmDialog } from '../../../components/Dialog/Dialog.js';
import { EmptyState } from '../../../components/EmptyState/EmptyState.js';
import { toast } from '../../../components/Toast/Toast.js';
import { h } from '../../core/dom.js';
import { ApiError } from '../../core/http.js';
import { setText } from '../../core/i18n.js';
import {
  categoryById,
  countUpcomingBookings,
  deleteBook,
  listInventory,
} from '../../services/books.js';
import { openBookForm } from './book-form.js';
import { mountAdmin } from './layout.js';
import { mountList } from './list.js';

/** @typedef {import('../../types.js').Book} Book */

await mountAdmin('books');

async function add() {
  const book = await openBookForm();
  if (!book) return;
  toast({ tone: 'success', title: { key: 'admin.books.added' }, message: book.title });
  list.reload();
}

/** @param {Book} book */
async function edit(book) {
  const saved = await openBookForm(book);
  if (!saved) return;
  toast({ tone: 'success', title: { key: 'admin.saved' }, message: saved.title });
  list.reload();
}

/** @param {Book[]} books */
async function remove(books) {
  if (books.length === 0) return;
  const [first] = books;
  const single = books.length === 1;
  const counts = await Promise.all(books.map((book) => countUpcomingBookings(book.id)));
  const upcoming = counts.reduce((sum, count) => sum + count, 0);

  const withBookings = single ? 'admin.books.deleteText' : 'admin.books.deleteManyText';
  const without = single ? 'admin.books.deleteTextNone' : 'admin.books.deleteManyTextNone';
  const confirmed = await confirmDialog({
    title: single
      ? { key: 'admin.books.deleteTitle', params: { title: first.title } }
      : { key: 'admin.books.deleteManyTitle', params: { count: books.length } },
    message: upcoming > 0 ? { key: withBookings, params: { count: upcoming } } : { key: without },
  });
  if (!confirmed) return;

  try {
    await Promise.all(books.map((book) => deleteBook(book.id)));
    toast(
      single
        ? { tone: 'success', title: { key: 'admin.books.deleted' }, message: first.title }
        : {
            tone: 'success',
            title: { key: 'admin.books.deletedMany', params: { count: books.length } },
          },
    );
  } catch (error) {
    const key = error instanceof ApiError ? error.messageKey : 'errors.unknown';
    toast({ tone: 'error', title: { key: 'states.errorTitle' }, message: { key } });
  }
  table.clearSelection();
  list.reload();
}

/** @type {import('../../../components/DataTable/DataTable.js').DataTableElement} */
let table;

const list = mountList({
  path: 'admin/books.html',
  defaultSort: { id: 'title', order: 'asc' },
  searchLabel: { key: 'admin.books.search' },
  searchPlaceholder: { key: 'admin.books.searchPlaceholder' },
  addButton: Button({ label: { key: 'admin.books.add' }, icon: 'plus', onClick: add }),
  load: (query) => listInventory(query),
  emptyState: (q) =>
    q
      ? EmptyState({
          icon: 'search',
          title: { key: 'admin.books.noMatch.title', params: { q } },
          text: { key: 'admin.books.noMatch.text' },
        })
      : EmptyState({
          icon: 'book-open',
          title: { key: 'admin.books.empty.title' },
          text: { key: 'admin.books.empty.text' },
          action: Button({
            label: { key: 'admin.books.empty.action' },
            icon: 'plus',
            onClick: add,
          }),
        }),
  createTable: (sort, onSort) => {
    table = DataTable({
      label: { key: 'admin.books.tableLabel' },
      rowId: (book) => book.id,
      sort,
      onSort,
      selection: {
        nameOf: (book) => book.title,
        actions: (ids) => [
          Button({
            label: { key: 'common.delete' },
            variant: 'ghost',
            size: 'sm',
            icon: 'trash-2',
            onClick: () => remove(list.rows().filter((book) => ids.includes(book.id))),
          }),
        ],
      },
      columns: [
        {
          id: 'title',
          label: { key: 'admin.books.columns.title' },
          sortable: true,
          primary: true,
          render: (book) =>
            h(
              'span',
              { class: 'admin-name' },
              BookCover({ book, size: 'S', thumb: true }),
              h('a', { class: 'admin-name__link', href: bookUrl(book) }, book.title),
            ),
        },
        {
          id: 'author',
          label: { key: 'admin.books.columns.author' },
          sortable: true,
          render: (book) => book.authors.join(', '),
        },
        {
          id: 'category',
          label: { key: 'admin.books.columns.category' },
          sortable: true,
          render: (book) => {
            const category = categoryById(book.category);
            if (!category) return null;
            const label = h('span');
            setText(label, { key: category.labelKey });
            return label;
          },
        },
        {
          id: 'copies',
          label: { key: 'admin.books.columns.copies' },
          sortable: true,
          kind: 'numeric',
          render: (book) => book.copies,
        },
        {
          id: 'status',
          label: { key: 'admin.books.columns.status' },
          render: (book) => AvailabilityBadge(book),
        },
        {
          id: 'actions',
          label: { key: 'table.actions' },
          hideLabel: true,
          kind: 'actions',
          render: (book) => [
            IconButton({
              icon: 'pencil',
              label: { key: 'admin.editItem', params: { name: book.title } },
              size: 'sm',
              onClick: () => edit(book),
            }),
            IconButton({
              icon: 'trash-2',
              label: { key: 'admin.deleteItem', params: { name: book.title } },
              size: 'sm',
              danger: true,
              onClick: () => remove([book]),
            }),
          ],
        },
      ],
    });
    return table;
  },
});
