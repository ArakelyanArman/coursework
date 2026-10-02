// @ts-check
import { Banner } from '../../../components/Banner/Banner.js';
import { Button, setLoading } from '../../../components/Button/Button.js';
import { formDialog } from '../../../components/Dialog/Dialog.js';
import { CheckboxGroup } from '../../../components/FilterAccordion/FilterAccordion.js';
import { Select } from '../../../components/Select/Select.js';
import { TextField, inputOf, setFieldError } from '../../../components/TextField/TextField.js';
import { h, render } from '../../core/dom.js';
import { ApiError } from '../../core/http.js';
import { setText } from '../../core/i18n.js';
import { refs } from '../../core/template.js';
import { rules, validate } from '../../core/validate.js';
import { CATEGORIES, GENRES, createBook, lookupIsbn, updateBook } from '../../services/books.js';

/** @typedef {import('../../types.js').Book} Book */

const MAX_COPIES = 99;

/** @param {string} value */
const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(value.trim());

/** @param {string} text "Raffi, Hovhannes Tumanyan" → ['Raffi', 'Hovhannes Tumanyan'] */
const splitAuthors = (text) =>
  text
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

/**
 * The Add / Edit book dialog. Adding offers "Import by ISBN", which fills the form from
 * Open Library; every field stays editable.
 * @param {Book} [book] The book to edit; leave out to add one.
 * @returns {Promise<Book | null>} The saved book, or null when the dialog was cancelled.
 */
export function openBookForm(book) {
  /** @type {Book | null} A book found by ISBN: its Open Library id and cover are kept. */
  let imported = null;
  let genres = book?.genres ?? [];

  const fields = {
    title: TextField({
      label: { key: 'admin.books.columns.title' },
      name: 'title',
      value: book?.title ?? '',
      required: true,
    }),
    authors: TextField({
      label: { key: 'admin.books.form.authors' },
      name: 'authors',
      value: book?.authors.join(', ') ?? '',
      helper: { key: 'admin.books.form.authorsHelper' },
      required: true,
    }),
    year: TextField({
      label: { key: 'admin.books.form.year' },
      name: 'year',
      value: String(book?.firstPublishYear ?? ''),
      inputMode: 'numeric',
    }),
    copies: TextField({
      label: { key: 'admin.books.columns.copies' },
      name: 'copies',
      value: String(book?.copies ?? 1),
      inputMode: 'numeric',
      required: true,
    }),
    description: TextField({
      label: { key: 'admin.books.form.description' },
      name: 'description',
      value: book?.description ?? '',
      helper: { key: 'admin.books.form.descriptionHelper' },
      multiline: true,
    }),
    coverUrl: TextField({
      label: { key: 'admin.books.form.coverUrl' },
      name: 'coverUrl',
      type: 'url',
      value: book?.coverUrl ?? '',
      helper: { key: 'admin.books.form.coverUrlHelper' },
    }),
  };

  const category = Select({
    label: { key: 'admin.books.columns.category' },
    name: 'category',
    value: book?.category ?? '',
    options: [
      { value: '', label: { key: 'admin.books.form.noCategory' } },
      ...CATEGORIES.map(({ id, labelKey }) => ({ value: id, label: { key: labelKey } })),
    ],
  });

  const genreSlot = h('div');
  const renderGenres = () =>
    render(
      genreSlot,
      CheckboxGroup({
        label: { key: 'catalog.filters.genres' },
        options: GENRES.map(({ id, labelKey }) => ({ value: id, label: { key: labelKey } })),
        selected: genres,
        onChange: (selected) => {
          genres = selected;
        },
      }),
    );
  const genreLabel = h('span', { class: 'field__label' });
  setText(genreLabel, { key: 'catalog.filters.genres' });
  renderGenres();

  const schema = {
    title: [rules.required()],
    authors: [rules.required()],
    year: [rules.number({ min: 1, max: new Date().getFullYear(), integer: true })],
    copies: [rules.required(), rules.number({ min: 1, max: MAX_COPIES, integer: true })],
    coverUrl: [rules.custom(isHttpUrl, 'validation.url')],
  };

  return formDialog({
    title: { key: book ? 'admin.books.edit' : 'admin.books.add' },
    fields: [
      !book && IsbnImport((found) => {
        imported = found;
        inputOf(fields.title).value = found.title;
        inputOf(fields.authors).value = found.authors.join(', ');
        inputOf(fields.year).value = String(found.firstPublishYear ?? '');
        refs(category).input.value = found.category ?? '';
        genres = found.genres;
        renderGenres();
      }),
      fields.title,
      fields.authors,
      category,
      h('div', { class: 'field' }, genreLabel, genreSlot),
      h('div', { class: 'book-form__pair' }, fields.year, fields.copies),
      fields.description,
      fields.coverUrl,
    ].filter(Boolean),
    onSubmit: async () => {
      const values = Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [name, inputOf(field).value]),
      );
      const { valid, errors, firstInvalid } = validate(schema, values);
      for (const [name, field] of Object.entries(fields)) {
        setFieldError(field, errors[name] ?? null);
      }
      if (!valid) {
        const invalid = /** @type {keyof typeof fields} */ (firstInvalid);
        inputOf(fields[invalid]).focus();
        return false;
      }

      const input = {
        title: values.title.trim(),
        authors: splitAuthors(values.authors),
        category: refs(category).input.value || null,
        genres,
        firstPublishYear: values.year.trim() ? Number(values.year) : null,
        copies: Number(values.copies),
        description: values.description.trim() || null,
        coverUrl: values.coverUrl.trim() || null,
      };
      if (book) return updateBook(book.id, input);
      return createBook({ ...input, id: imported?.id, coverId: imported?.coverId ?? null });
    },
  });
}

/**
 * @param {(book: Book) => void} onFound
 * @returns {HTMLElement}
 */
function IsbnImport(onFound) {
  const status = h('div', { class: 'book-form__status', hidden: true });
  const field = TextField({
    label: { key: 'admin.books.form.isbn' },
    name: 'isbn',
    inputMode: 'numeric',
    autocomplete: 'off',
    placeholder: { key: 'admin.books.form.isbnPlaceholder' },
  });
  const input = inputOf(field);

  async function lookUp() {
    const digits = input.value.replace(/[^0-9Xx]/g, '');
    status.hidden = true;
    if (digits.length !== 10 && digits.length !== 13) {
      setFieldError(field, { key: 'admin.books.form.isbnInvalid' });
      input.focus();
      return;
    }
    setFieldError(field, null);
    setLoading(button, true);
    try {
      const found = await lookupIsbn(digits);
      if (!found) {
        setFieldError(field, { key: 'admin.books.form.isbnNotFound' });
        input.focus();
        return;
      }
      onFound(found);
      render(status, Banner({ tone: 'success', message: { key: 'admin.books.form.isbnFound' } }));
      status.hidden = false;
    } catch (error) {
      const key = error instanceof ApiError ? error.messageKey : 'errors.unknown';
      setFieldError(field, { key });
    } finally {
      setLoading(button, false);
    }
  }

  const button = Button({
    label: { key: 'admin.books.form.isbnLookup' },
    variant: 'secondary',
    icon: 'search',
    onClick: lookUp,
  });
  // Enter in the ISBN field looks the book up instead of submitting the whole form.
  input.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    lookUp();
  });

  return h('div', { class: 'book-form__isbn' }, field, button, status);
}
