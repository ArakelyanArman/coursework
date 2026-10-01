// @ts-check
import {
  CheckboxGroup,
  FilterAccordion,
  FilterSection,
  setSectionCount,
} from '../../../components/FilterAccordion/FilterAccordion.js';
import { TextField, inputOf, setFieldError } from '../../../components/TextField/TextField.js';
import { h, render } from '../../core/dom.js';
import { setText } from '../../core/i18n.js';
import { refs } from '../../core/template.js';
import { GENRES } from '../../services/books.js';

/** @typedef {import('./state.js').FilterValues} FilterValues */
/** @typedef {import('./state.js').AuthorOption} AuthorOption */

/** Which sections are open; kept while the panel is rebuilt and shared with the drawer. */
const openSections = new Set(['authors', 'genres']);

/**
 * @param {string} id
 * @param {Parameters<typeof FilterSection>[0]} props
 */
function section(id, props) {
  const element = FilterSection({ ...props, open: openSections.has(id) });
  const { trigger } = refs(element);
  trigger.addEventListener('click', () => {
    if (trigger.getAttribute('aria-expanded') === 'true') openSections.add(id);
    else openSections.delete(id);
  });
  return element;
}

/**
 * @param {string} text
 * @returns {{ value: number | null, error: import('../../core/validate.js').ValidationError | null }}
 */
function parseYear(text) {
  const trimmed = text.trim();
  if (trimmed === '') return { value: null, error: null };
  const value = Number(trimmed);
  const max = new Date().getFullYear();
  if (!/^\d+$/.test(trimmed)) return { value: null, error: { key: 'validation.integer' } };
  if (value < 1) return { value: null, error: { key: 'validation.min', params: { min: 1 } } };
  if (value > max) return { value: null, error: { key: 'validation.max', params: { max } } };
  return { value, error: null };
}

/**
 * The Authors, Genres and Years filters. It reports each change and keeps no other state,
 * so the sidebar can apply changes at once while the drawer collects them until "Apply".
 * @param {object} props
 * @param {FilterValues} props.values
 * @param {AuthorOption[]} props.authors
 * @param {(patch: Partial<FilterValues>) => void} props.onChange
 * @returns {HTMLElement & { setAuthors: (authors: AuthorOption[]) => void }}
 */
export function FilterPanel({ values, authors, onChange }) {
  const current = { ...values };
  let authorKey = '';

  const authorList = h('div');
  const authorSection = section('authors', {
    label: { key: 'catalog.filters.authors' },
    content: authorList,
    count: current.authors.length,
  });

  /** @param {AuthorOption[]} options */
  function setAuthors(options) {
    const key = JSON.stringify(options);
    if (key === authorKey) return;
    authorKey = key;

    const focused = authorList.contains(document.activeElement)
      ? /** @type {HTMLInputElement} */ (document.activeElement).value
      : null;

    if (options.length === 0) {
      const note = h('p', { class: 't-body-sm muted' });
      setText(note, { key: 'catalog.filters.noAuthors' });
      render(authorList, note);
      return;
    }
    render(
      authorList,
      CheckboxGroup({
        label: { key: 'catalog.filters.authors' },
        options: options.map(({ id, name }) => ({ value: id, label: name })),
        selected: current.authors,
        onChange: (selected) => {
          current.authors = selected;
          setSectionCount(authorSection, selected.length);
          onChange({ authors: selected });
        },
      }),
    );
    if (focused) {
      const input = authorList.querySelector(`input[value="${CSS.escape(focused)}"]`);
      if (input instanceof HTMLElement) input.focus();
    }
  }

  const genreSection = section('genres', {
    label: { key: 'catalog.filters.genres' },
    count: current.genres.length,
    content: CheckboxGroup({
      label: { key: 'catalog.filters.genres' },
      options: GENRES.map((genre) => ({ value: genre.id, label: { key: genre.labelKey } })),
      selected: current.genres,
      onChange: (selected) => {
        current.genres = selected;
        setSectionCount(genreSection, selected.length);
        onChange({ genres: selected });
      },
    }),
  });

  const yearField = (/** @type {'yearFrom' | 'yearTo'} */ name) => {
    const field = TextField({
      label: { key: `catalog.filters.${name}` },
      name,
      value: String(current[name] ?? ''),
      inputMode: 'numeric',
      autocomplete: 'off',
      placeholder: { key: 'catalog.filters.yearPlaceholder' },
      onChange: commitYears,
    });
    inputOf(field).maxLength = 4;
    return field;
  };
  const fromField = yearField('yearFrom');
  const toField = yearField('yearTo');

  function commitYears() {
    const from = parseYear(inputOf(fromField).value);
    const to = parseYear(inputOf(toField).value);
    const outOfOrder = from.value != null && to.value != null && from.value > to.value;
    setFieldError(fromField, from.error);
    setFieldError(toField, to.error ?? (outOfOrder ? { key: 'catalog.filters.yearOrder' } : null));
    if (from.error || to.error || outOfOrder) return;

    current.yearFrom = from.value;
    current.yearTo = to.value;
    setSectionCount(yearSection, from.value != null || to.value != null ? 1 : 0);
    onChange({ yearFrom: from.value, yearTo: to.value });
  }

  if (current.yearFrom != null || current.yearTo != null) openSections.add('years');
  const yearSection = section('years', {
    label: { key: 'catalog.filters.years' },
    count: current.yearFrom != null || current.yearTo != null ? 1 : 0,
    content: h('div', { class: 'catalog__years' }, fromField, toField),
  });

  setAuthors(authors);
  const panel = FilterAccordion({ sections: [authorSection, genreSection, yearSection] });
  return Object.assign(panel, { setAuthors });
}
