// @ts-check
import { AvailabilityBadge } from '../../../components/Badge/Badge.js';
import { Banner } from '../../../components/Banner/Banner.js';
import { BookCard, BookCardSkeleton } from '../../../components/BookCard/BookCard.js';
import { BookCover } from '../../../components/BookCover/BookCover.js';
import { BookListItem, BookListItemSkeleton } from '../../../components/BookListItem/BookListItem.js';
import { Button, IconButton } from '../../../components/Button/Button.js';
import { DataTable, DataTableSkeleton } from '../../../components/DataTable/DataTable.js';
import { confirmDialog, formDialog } from '../../../components/Dialog/Dialog.js';
import { EmptyState, ErrorState } from '../../../components/EmptyState/EmptyState.js';
import { TextField, inputOf, setFieldError } from '../../../components/TextField/TextField.js';
import { toast } from '../../../components/Toast/Toast.js';
import { todayIso } from '../../core/date.js';
import { h, qs, render } from '../../core/dom.js';
import { formatDate } from '../../core/format.js';
import { ApiError } from '../../core/http.js';
import { setText } from '../../core/i18n.js';
import { rules, validate } from '../../core/validate.js';
import { categoryById, countUpcomingBookings, listInventory } from '../../services/books.js';
import { box, caption, panel } from './panel.js';

/** @typedef {import('../../types.js').Book} Book */
/** @typedef {import('../../../components/DataTable/DataTable.js').Sort} Sort */

const TABLE_ROWS = 6;

/** @param {Book[]} books */
function renderBooks(books) {
  const withCover = books.filter((book) => book.coverId).slice(0, 4);
  const withoutCover = books.filter((book) => !book.coverId).slice(0, 2);
  const byState = ['unavailable', 'few', 'available']
    .map((state) => books.find((book) => book.availability === state))
    .filter((book) => book !== undefined);

  render(
    qs('#books-demo'),
    box(
      'design-rail',
      [...withCover, ...withoutCover].map((book, index) =>
        BookCard({ book, badge: index < 2 ? { key: 'book.trending' } : undefined }),
      ),
      BookCardSkeleton(),
    ),
    box('stack gap-4', byState.map((book) => BookListItem({ book })), BookListItemSkeleton()),
  );
}

/** @param {Book[]} books */
function renderTable(books) {
  let rows = books.slice(0, TABLE_ROWS);
  /** @type {Sort} */
  let sort = { id: 'title', order: 'asc' };

  const sorted = () => {
    const pick = /** @type {Record<string, (book: Book) => string | number>} */ ({
      title: (book) => book.title,
      author: (book) => book.authors[0] ?? '',
      copies: (book) => book.copies ?? 0,
    })[sort.id];
    const direction = sort.order === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const [left, right] = [pick(a), pick(b)];
      const result = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
      return result * direction;
    });
  };
  const refresh = () => table.update({ rows: sorted(), sort });

  /** @param {Book[]} targets */
  async function remove(targets) {
    const [first] = targets;
    const upcoming = (await Promise.all(targets.map((book) => countUpcomingBookings(book.id)))).reduce(
      (sum, count) => sum + count,
      0,
    );
    const confirmed = await confirmDialog({
      title:
        targets.length === 1
          ? { key: 'admin.books.deleteTitle', params: { title: first.title } }
          : { key: 'admin.books.deleteManyTitle', params: { count: targets.length } },
      message:
        upcoming > 0
          ? { key: 'admin.books.deleteText', params: { count: upcoming } }
          : { key: 'admin.books.deleteTextNone' },
    });
    if (!confirmed) return;
    rows = rows.filter((book) => !targets.includes(book));
    refresh();
    toast({ tone: 'success', title: { key: 'admin.books.deleted' }, message: targets.length === 1 ? first.title : undefined });
  }

  /** @param {Book} book */
  async function edit(book) {
    const title = TextField({ label: { key: 'admin.books.columns.title' }, value: book.title, required: true });
    const copies = TextField({
      label: { key: 'admin.books.columns.copies' },
      value: String(book.copies ?? 1),
      inputMode: 'numeric',
      required: true,
    });
    const saved = await formDialog({
      title: { key: 'admin.books.edit' },
      fields: [title, copies],
      onSubmit: async () => {
        const values = { title: inputOf(title).value, copies: inputOf(copies).value };
        const result = validate(
          { title: [rules.required()], copies: [rules.required(), rules.number({ min: 1, max: 99, integer: true })] },
          values,
        );
        setFieldError(title, result.errors.title ?? null);
        setFieldError(copies, result.errors.copies ?? null);
        if (!result.valid) {
          inputOf(result.firstInvalid === 'title' ? title : copies).focus();
          return false;
        }
        return { ...book, title: values.title.trim(), copies: Number(values.copies) };
      },
    });
    if (!saved) return;
    rows = rows.map((row) => (row === book ? saved : row));
    refresh();
    toast({ tone: 'success', title: { key: 'admin.saved' }, message: saved.title });
  }

  const table = DataTable({
    label: { key: 'admin.books.tableLabel' },
    rowId: (book) => book.id,
    sort,
    onSort: (next) => {
      sort = next;
      refresh();
    },
    selection: {
      nameOf: (book) => book.title,
      actions: (ids) => [
        Button({
          label: { key: 'common.delete' },
          variant: 'ghost',
          size: 'sm',
          icon: 'trash-2',
          onClick: () => remove(rows.filter((book) => ids.includes(book.id))),
        }),
      ],
    },
    columns: [
      {
        id: 'title',
        label: { key: 'admin.books.columns.title' },
        sortable: true,
        primary: true,
        render: (book) => h('span', { class: 'data-table__main' }, BookCover({ book, size: 'S', thumb: true }), book.title),
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
      { id: 'status', label: { key: 'admin.books.columns.status' }, render: (book) => AvailabilityBadge(book) },
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
  refresh();

  render(qs('#table-demo'), table, box('', caption({ key: 'design.states.skeletons' }), DataTableSkeleton({ rows: 3 })));
}

function renderMessages() {
  const network = new ApiError({ code: 'network', messageKey: 'errors.network' });
  const notify = () =>
    toast({
      tone: 'success',
      title: { key: 'booking.confirmed' },
      message: { key: 'booking.confirmedText', params: { date: formatDate(todayIso()) } },
    });
  const fail = () => toast({ tone: 'error', title: { key: 'states.errorTitle' }, message: { key: 'errors.network' } });

  render(
    qs('#messages-demo'),
    panel(
      null,
      box(
        'stack gap-4',
        Banner({
          tone: 'danger',
          message: { key: 'errors.network' },
          action: Button({ label: { key: 'common.retry' }, variant: 'link', onClick: notify }),
        }),
        Banner({ tone: 'success', message: { key: 'booking.confirmed' } }),
        Banner({ message: { key: 'catalog.empty.text' } }),
        box(
          'row gap-3',
          Button({ label: { key: 'design.feedback.toastSuccess' }, variant: 'secondary', onClick: notify }),
          Button({ label: { key: 'design.feedback.toastError' }, variant: 'secondary', onClick: fail }),
        ),
      ),
    ),
    box(
      'stack gap-4',
      EmptyState({
        title: { key: 'catalog.empty.title' },
        text: { key: 'catalog.empty.text' },
        action: Button({ label: { key: 'catalog.clearFilters' }, variant: 'secondary', size: 'sm', onClick: notify }),
      }),
      ErrorState({ error: network, onRetry: notify }),
    ),
  );
}

/** Books and the table need real inventory data; the feedback demos do not. */
export async function renderContent() {
  renderMessages();
  render(qs('#books-demo'), box('design-rail', Array.from({ length: 5 }, BookCardSkeleton)));
  render(qs('#table-demo'), DataTableSkeleton());
  try {
    const { items } = await listInventory({ pageSize: 100 });
    renderBooks(items);
    renderTable(items);
  } catch (error) {
    render(qs('#books-demo'), ErrorState({ error, onRetry: renderContent }));
    render(qs('#table-demo'));
  }
}
