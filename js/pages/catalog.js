// @ts-check
import { Button } from '../../components/Button/Button.js';
import { Dialog, openDialog } from '../../components/Dialog/Dialog.js';
import { ErrorState } from '../../components/EmptyState/EmptyState.js';
import { Pagination } from '../../components/Pagination/Pagination.js';
import { SearchField } from '../../components/SearchField/SearchField.js';
import { h, qs, render } from '../core/dom.js';
import { isAbort } from '../core/http.js';
import { setText } from '../core/i18n.js';
import { refs } from '../core/template.js';
import { buildUrl, onParamsChange, writeParams } from '../core/url-state.js';
import { searchBooks } from '../services/books.js';
import { mountShell } from '../shell.js';
import { FilterPanel } from './catalog/filters.js';
import {
  MAX_PAGES,
  NO_FILTERS,
  SCHEMA,
  authorName,
  authorsOf,
  baseSignature,
  countFilters,
  hasFilters,
  normalize,
  readState,
  rememberAuthors,
} from './catalog/state.js';
import {
  ActiveFilters,
  BookList,
  CategoryChips,
  ClearFiltersLink,
  LoadingList,
  NoResults,
  SortSelect,
} from './catalog/view.js';

/** @typedef {import('./catalog/state.js').CatalogState} CatalogState */
/** @typedef {import('./catalog/state.js').AuthorOption} AuthorOption */

await mountShell({ page: 'catalog' });

const wide = window.matchMedia('(min-width: 1024px)');
const results = qs('.catalog__results');
const count = qs('#catalog-count');
const active = qs('#catalog-active');
const list = qs('#catalog-list');
const pagination = qs('#catalog-pagination');

let state = readState();
/** @type {AbortController | null} */
let controller = null;
/** @type {ReturnType<typeof FilterPanel> | null} */
let sidebar = null;
/** @type {HTMLDialogElement | null} */
let drawer = null;

// Authors offered as filters: those of the current search, collected across its pages.
let authorPool = { signature: '', options: /** @type {AuthorOption[]} */ ([]) };

/** @returns {AuthorOption[]} The pool, plus any selected author it does not hold. */
function authorOptions() {
  const known = new Set(authorPool.options.map((author) => author.id));
  const extra = state.authors
    .filter((id) => !known.has(id))
    .map((id) => ({ id, name: authorName(id) }));
  return [...extra, ...authorPool.options];
}

/** @param {import('../types.js').Book[]} books */
function collectAuthors(books) {
  const found = authorsOf(books);
  rememberAuthors(found);
  const signature = baseSignature(state);
  if (signature !== authorPool.signature) {
    authorPool = { signature, options: found };
    return;
  }
  const known = new Set(authorPool.options.map((author) => author.id));
  authorPool.options.push(...found.filter((author) => !known.has(author.id)));
}

const search = SearchField({
  label: { key: 'catalog.searchLabel' },
  placeholder: { key: 'catalog.searchPlaceholder' },
  value: state.q,
  onSubmit: (q) => update({ q }),
});
const categories = CategoryChips((patch) => update(patch));
const sort = SortSelect((patch) => update(patch));
const filterButton = Button({
  label: { key: 'catalog.filters.title' },
  variant: 'secondary',
  onClick: openDrawer,
});
filterButton.setAttribute('aria-haspopup', 'dialog');

// The sidebar keeps its place in the page while it is in use; only its contents are replaced.
const panelSlot = h('div');
const clearSlot = h('div', { class: 'catalog__clear' });

render(qs('#catalog-search'), search);
render(qs('#catalog-filter-button'), filterButton);
render(qs('#catalog-filters'), h('div', { class: 'catalog__filters-panel' }, panelSlot, clearSlot));
render(qs('#catalog-categories'), categories.element);
render(qs('#catalog-sort'), sort.element);

/**
 * Bring every control in line with the state.
 * @param {{ keepSidebar?: boolean }} [options] Leave the sidebar alone when the change came from it.
 */
function syncControls({ keepSidebar = false } = {}) {
  /** @type {HTMLInputElement} */ (search.querySelector('input')).value = state.q;
  categories.sync(state);
  sort.sync(state);

  const filters = countFilters(state);
  setText(
    refs(filterButton).label,
    filters > 0
      ? { key: 'catalog.filters.titleCount', params: { count: filters } }
      : { key: 'catalog.filters.title' },
  );

  if (!keepSidebar || !sidebar) {
    sidebar = FilterPanel({
      values: state,
      authors: authorOptions(),
      onChange: (patch) => update(patch, { keepSidebar: true }),
    });
    render(panelSlot, sidebar);
  }
  render(
    clearSlot,
    hasFilters(state) &&
      ClearFiltersLink((patch) => update(patch), { key: 'catalog.filters.clearAll' }),
  );

  const chips = ActiveFilters(state, (patch) => {
    update(patch);
    list.focus({ preventScroll: true });
  });
  render(active, chips);
  active.hidden = chips.length === 0;
}

/**
 * Change the search. Anything but a page change goes back to page 1.
 * @param {Partial<CatalogState>} patch
 * @param {{ keepSidebar?: boolean }} [options]
 */
function update(patch, options) {
  state = normalize({ ...state, page: 1, ...patch });
  writeParams(state, SCHEMA);
  syncControls(options);
  load();
}

/** The filters as a drawer, for screens too narrow for the sidebar. Nothing applies until "Apply". */
function openDrawer() {
  /** @type {import('./catalog/state.js').FilterValues} */
  let pending = {
    authors: state.authors,
    genres: state.genres,
    yearFrom: state.yearFrom,
    yearTo: state.yearTo,
  };
  const close = () => drawer?.close();
  drawer = Dialog({
    title: { key: 'catalog.filters.title' },
    drawer: true,
    body: FilterPanel({
      values: pending,
      authors: authorOptions(),
      onChange: (patch) => {
        pending = { ...pending, ...patch };
      },
    }),
    actions: [
      Button({
        label: { key: 'catalog.filters.clearAll' },
        variant: 'ghost',
        onClick: () => {
          close();
          update({ ...NO_FILTERS, category: '' });
        },
      }),
      Button({
        label: { key: 'catalog.filters.apply' },
        onClick: () => {
          close();
          update(pending);
        },
      }),
    ],
  });
  openDialog(drawer);
}

/** @param {import('../types.js').Paged<import('../types.js').Book>} page */
function showResults({ items, total, pageSize }) {
  setText(count, { key: 'catalog.resultCount', params: { count: total } });
  list.removeAttribute('aria-busy');

  if (items.length === 0) {
    render(list, NoResults(state, (patch) => update(patch)));
    render(pagination);
    return;
  }
  render(list, BookList(items));
  render(
    pagination,
    Pagination({
      page: state.page,
      pageCount: Math.min(Math.ceil(total / pageSize), MAX_PAGES),
      hrefFor: (page) => buildUrl('catalog.html', { ...state, page }, SCHEMA),
      onNavigate: (page) => {
        update({ page });
        results.scrollIntoView({ block: 'start' });
        list.focus({ preventScroll: true });
      },
    }),
  );
}

async function load() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  list.setAttribute('aria-busy', 'true');
  render(list, LoadingList());
  render(pagination);

  try {
    const page = await searchBooks(state, { signal });
    if (signal.aborted) return;

    // A page past the end (a stale link): start again from the first one.
    if (page.items.length === 0 && page.total > 0 && state.page > 1) {
      state = { ...state, page: 1 };
      writeParams(state, SCHEMA, { replace: true });
      load();
      return;
    }
    collectAuthors(page.items);
    sidebar?.setAuthors(authorOptions());
    showResults(page);
  } catch (error) {
    if (isAbort(error)) return;
    list.removeAttribute('aria-busy');
    setText(count, null);
    render(list, ErrorState({ error, onRetry: load }));
  }
}

onParamsChange(() => {
  state = readState();
  syncControls();
  load();
});

wide.addEventListener('change', (event) => {
  if (event.matches) drawer?.close();
});

syncControls();
load();
