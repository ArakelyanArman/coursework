// @ts-check
import { BookListItem, BookListItemSkeleton } from '../../../components/BookListItem/BookListItem.js';
import { Button } from '../../../components/Button/Button.js';
import { Chip, ChipRow, RemovableChip, setPressed } from '../../../components/Chip/Chip.js';
import { EmptyState } from '../../../components/EmptyState/EmptyState.js';
import { Select } from '../../../components/Select/Select.js';
import { h } from '../../core/dom.js';
import { setAttrText } from '../../core/i18n.js';
import { refs } from '../../core/template.js';
import { CATEGORIES, GENRES, SORTS } from '../../services/books.js';
import { NO_FILTERS, authorName, hasFilters } from './state.js';

/** @typedef {import('../../types.js').Book} Book */
/** @typedef {import('./state.js').CatalogState} CatalogState */
/** @typedef {(patch: Partial<CatalogState>) => void} Change */

const SKELETON_ITEMS = 6;

/**
 * "All" plus one chip per category; one of them is always pressed.
 * @param {Change} onChange
 * @returns {{ element: HTMLElement, sync: (state: CatalogState) => void }}
 */
export function CategoryChips(onChange) {
  const all = { id: '', labelKey: 'categories.all' };
  const entries = [all, ...CATEGORIES].map(({ id, labelKey }) => ({
    id,
    chip: Chip({ label: { key: labelKey }, onClick: () => onChange({ category: id }) }),
  }));
  const element = ChipRow({
    label: { key: 'catalog.categoriesLabel' },
    chips: entries.map(({ chip }) => chip),
  });

  /** @param {CatalogState} state */
  function sync(state) {
    for (const { id, chip } of entries) {
      const pressed = id === state.category;
      setPressed(chip, pressed);
      if (!pressed) continue;
      // The row scrolls sideways when it does not fit: bring the chosen chip to its middle.
      const row = element.getBoundingClientRect();
      const box = chip.getBoundingClientRect();
      element.scrollLeft += box.left - row.left - (row.width - box.width) / 2;
    }
  }
  return { element, sync };
}

/**
 * @param {Change} onChange
 * @returns {{ element: HTMLElement, sync: (state: CatalogState) => void }}
 */
export function SortSelect(onChange) {
  const element = Select({
    label: { key: 'catalog.sortBy' },
    options: SORTS.map(({ id, labelKey }) => ({ value: id, label: { key: labelKey } })),
    size: 'sm',
    onChange: (sort) => onChange({ sort }),
  });
  return {
    element,
    sync: (state) => {
      refs(element).input.value = state.sort;
    },
  };
}

/** @param {CatalogState} state */
function yearLabel({ yearFrom, yearTo }) {
  if (yearFrom != null && yearTo != null) {
    return { key: 'catalog.chip.yearRange', params: { from: yearFrom, to: yearTo } };
  }
  return yearFrom != null
    ? { key: 'catalog.chip.yearFrom', params: { year: yearFrom } }
    : { key: 'catalog.chip.yearTo', params: { year: yearTo } };
}

/**
 * The search and the sidebar filters as chips that remove themselves when pressed.
 * @param {CatalogState} state
 * @param {Change} onChange
 * @returns {Element[]} Empty when nothing is active.
 */
export function ActiveFilters(state, onChange) {
  const chips = [];
  if (state.q) {
    chips.push(
      RemovableChip({
        label: { key: 'catalog.chip.search', params: { q: state.q } },
        onRemove: () => onChange({ q: '' }),
      }),
    );
  }
  for (const id of state.authors) {
    chips.push(
      RemovableChip({
        label: authorName(id),
        onRemove: () => onChange({ authors: state.authors.filter((author) => author !== id) }),
      }),
    );
  }
  for (const id of state.genres) {
    const labelKey = GENRES.find((genre) => genre.id === id)?.labelKey ?? id;
    chips.push(
      RemovableChip({
        label: { key: labelKey },
        onRemove: () => onChange({ genres: state.genres.filter((genre) => genre !== id) }),
      }),
    );
  }
  if (state.yearFrom != null || state.yearTo != null) {
    chips.push(
      RemovableChip({
        label: yearLabel(state),
        onRemove: () => onChange({ yearFrom: null, yearTo: null }),
      }),
    );
  }
  if (chips.length === 0) return [];

  const row = ChipRow({ label: { key: 'catalog.activeFilters' }, chips, wrap: true });
  if (!hasFilters(state)) return [row];
  return [row, ClearFiltersLink(onChange)];
}

/**
 * Clears the category and the sidebar filters; the search stays.
 * @param {Change} onChange
 * @param {import('../../core/i18n.js').Text} [label]
 */
export function ClearFiltersLink(onChange, label = { key: 'catalog.clearFilters' }) {
  return Button({
    label,
    variant: 'link',
    onClick: () => onChange({ ...NO_FILTERS, category: '' }),
  });
}

/** @returns {HTMLElement} */
export function LoadingList() {
  return h(
    'div',
    { class: 'catalog__items', 'aria-hidden': true },
    Array.from({ length: SKELETON_ITEMS }, BookListItemSkeleton),
  );
}

/** @param {Book[]} books @returns {HTMLElement} */
export function BookList(books) {
  const list = h(
    'ul',
    { class: 'catalog__items', role: 'list' },
    books.map((book) => h('li', BookListItem({ book }))),
  );
  setAttrText(list, 'aria-label', { key: 'catalog.resultsLabel' });
  return list;
}

/**
 * @param {CatalogState} state
 * @param {Change} onChange
 * @returns {HTMLElement}
 */
export function NoResults(state, onChange) {
  if (hasFilters(state)) {
    return EmptyState({
      icon: 'search',
      title: { key: 'catalog.empty.title' },
      text: { key: 'catalog.empty.text' },
      action: Button({
        label: { key: 'catalog.clearFilters' },
        variant: 'secondary',
        onClick: () => onChange({ ...NO_FILTERS, category: '' }),
      }),
    });
  }
  if (state.q) {
    return EmptyState({
      icon: 'search',
      title: { key: 'catalog.empty.searchTitle', params: { q: state.q } },
      text: { key: 'catalog.empty.searchText' },
      action: Button({
        label: { key: 'catalog.clearSearch' },
        variant: 'secondary',
        onClick: () => onChange({ q: '' }),
      }),
    });
  }
  return EmptyState({
    title: { key: 'catalog.empty.noneTitle' },
    text: { key: 'catalog.empty.noneText' },
  });
}
