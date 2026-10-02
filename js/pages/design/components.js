// @ts-check
import { Badge } from '../../../components/Badge/Badge.js';
import { Button, IconButton, setDisabled, setIcon, setLabel, setLoading } from '../../../components/Button/Button.js';
import { Calendar } from '../../../components/Calendar/Calendar.js';
import { Checkbox, Radio } from '../../../components/Checkbox/Checkbox.js';
import { Chip, ChipRow, RemovableChip, setPressed } from '../../../components/Chip/Chip.js';
import { DateRangeField } from '../../../components/DateField/DateField.js';
import {
  CheckboxGroup,
  FilterAccordion,
  FilterSection,
  setSectionCount,
} from '../../../components/FilterAccordion/FilterAccordion.js';
import { Pagination } from '../../../components/Pagination/Pagination.js';
import { SearchField } from '../../../components/SearchField/SearchField.js';
import { Select } from '../../../components/Select/Select.js';
import { Tabs } from '../../../components/Tabs/Tabs.js';
import { PasswordField, TextField, setFieldError } from '../../../components/TextField/TextField.js';
import { toast } from '../../../components/Toast/Toast.js';
import { diffDays, todayIso } from '../../core/date.js';
import { h, qs, render } from '../../core/dom.js';
import { formatDateRange } from '../../core/format.js';
import { setText, whileConnected } from '../../core/i18n.js';
import { CATEGORIES, GENRES, SORTS, getUnavailableDates } from '../../services/books.js';
import { MAX_BOOKING_DAYS, checkBookingRange } from '../../services/bookings.js';
import { box, panel } from './panel.js';

/** @typedef {import('../../core/i18n.js').Text} Text */

// A book with booked days in the seed data, so the calendar has something to strike through.
const BOOKED_BOOK_ID = 'OL468431W';

/** @param {Text} text */
function tag(text) {
  const element = h('span', { class: 't-caption muted' });
  setText(element, text);
  return element;
}

function renderButtons() {
  const variants = /** @type {const} */ ([
    ['primary', 'common.save'],
    ['secondary', 'common.cancel'],
    ['ghost', 'common.clear'],
    ['danger', 'common.delete'],
    ['link', 'home.exploreAll'],
  ]);

  const matrix = box(
    'button-matrix',
    h('span'),
    ['default', 'disabled', 'loading'].map((state) => tag({ key: `design.states.${state}` })),
    variants.map(([variant, key]) => {
      const busy = Button({ label: { key }, variant });
      setLoading(busy, true);
      return [
        h('code', { class: 't-caption muted' }, variant),
        box('', Button({ label: { key }, variant })),
        box('', Button({ label: { key }, variant, disabled: true })),
        box('', busy),
      ];
    }),
  );

  const visibility = IconButton({
    icon: 'eye',
    label: { key: 'field.showPassword' },
    variant: 'secondary',
    pressed: false,
    onClick: () => {
      const pressed = visibility.getAttribute('aria-pressed') !== 'true';
      visibility.setAttribute('aria-pressed', String(pressed));
      setIcon(visibility, pressed ? 'eye-off' : 'eye');
      setLabel(visibility, { key: pressed ? 'field.hidePassword' : 'field.showPassword' });
    },
  });
  const locked = IconButton({ icon: 'trash-2', label: { key: 'common.delete' }, danger: true });
  setDisabled(locked, true, { key: 'users.errors.selfDelete' });

  render(
    qs('#buttons-demo'),
    panel(null, matrix),
    box(
      'design-columns',
      panel(
        { key: 'design.states.sizes' },
        box(
          'row gap-3',
          Button({ label: { key: 'common.search' }, size: 'sm' }),
          Button({ label: { key: 'common.search' } }),
          Button({ label: { key: 'common.search' }, size: 'lg' }),
        ),
      ),
      panel(
        { key: 'design.states.icons' },
        box(
          'row gap-3',
          Button({ label: { key: 'admin.books.add' }, icon: 'plus' }),
          Button({ label: { key: 'home.exploreAll' }, variant: 'secondary', trailingIcon: 'arrow-right' }),
          Button({ label: { key: 'home.exploreAll' }, variant: 'link', trailingIcon: 'arrow-right', href: '#books' }),
          IconButton({ icon: 'pencil', label: { key: 'common.save' } }),
          IconButton({ icon: 'trash-2', label: { key: 'common.delete' }, danger: true }),
          visibility,
          IconButton({ icon: 'chevron-left', label: { key: 'pagination.previous' }, variant: 'secondary', size: 'sm' }),
          locked,
        ),
      ),
    ),
  );
}

function renderForms() {
  const invalid = TextField({ label: { key: 'auth.email' }, type: 'email', value: 'reader@library' });
  setFieldError(invalid, { key: 'validation.email' });

  const sortOptions = SORTS.map((sort) => ({ value: sort.id, label: { key: sort.labelKey } }));

  render(
    qs('#forms-demo'),
    panel(
      null,
      box(
        'stack gap-5',
        TextField({ label: { key: 'auth.email' }, type: 'email', autocomplete: 'email' }),
        TextField({ label: { key: 'auth.fullName' }, helper: { key: 'design.forms.nameHelper' }, autocomplete: 'name' }),
        invalid,
        TextField({ label: { key: 'design.states.disabled' }, value: 'OL27482W', disabled: true }),
        PasswordField({
          label: { key: 'auth.password' },
          helper: { key: 'auth.passwordHelper' },
          autocomplete: 'new-password',
        }),
        TextField({
          label: { key: 'admin.books.form.description' },
          helper: { key: 'admin.books.form.descriptionHelper' },
          multiline: true,
        }),
      ),
    ),
    box(
      'stack gap-4',
      panel(
        null,
        box(
          'stack gap-5',
          SearchField({
            label: { key: 'catalog.searchLabel' },
            placeholder: { key: 'catalog.searchPlaceholder' },
            onSubmit: (query) => toast({ title: { key: 'common.search' }, message: query || '—' }),
          }),
          Select({ label: { key: 'catalog.sortBy' }, options: sortOptions, value: 'relevance' }),
          Select({
            label: { key: 'admin.users.columns.role' },
            options: [{ value: 'admin', label: { key: 'roles.admin' } }],
            disabled: true,
            helper: { key: 'users.errors.selfDemote' },
          }),
        ),
      ),
      panel(
        null,
        box(
          'design-columns',
          box(
            'stack',
            Checkbox({ label: { key: 'genres.romance' } }),
            Checkbox({ label: { key: 'genres.adventure' }, checked: true }),
            Checkbox({ label: { key: 'table.selectAll' }, indeterminate: true }),
            Checkbox({ label: { key: 'design.states.disabled' }, disabled: true }),
          ),
          box(
            'stack',
            SORTS.slice(0, 3).map((sort, index) =>
              Radio({ label: { key: sort.labelKey }, name: 'demo-sort', value: sort.id, checked: index === 0 }),
            ),
            Radio({ label: { key: 'design.states.disabled' }, name: 'demo-sort', disabled: true }),
          ),
        ),
      ),
    ),
  );
}

function renderSelection() {
  const categories = [{ id: 'all', labelKey: 'categories.all' }, ...CATEGORIES];
  /** @type {HTMLButtonElement[]} */
  const chips = categories.map((category, index) =>
    Chip({
      label: { key: category.labelKey },
      pressed: index === 0,
      onClick: () => chips.forEach((chip, other) => setPressed(chip, other === index)),
    }),
  );

  const removable = GENRES.slice(0, 3).map((genre) => {
    const chip = RemovableChip({ label: { key: genre.labelKey }, onRemove: () => chip.remove() });
    return chip;
  });

  const pages = box('');
  const showPage = (/** @type {number} */ page) =>
    render(
      pages,
      Pagination({ page, pageCount: 8, hrefFor: (target) => `?page=${target}#selection`, onNavigate: showPage }),
    );
  showPage(2);

  render(
    qs('#selection-demo'),
    panel(
      null,
      box(
        'stack gap-5',
        ChipRow({ label: { key: 'catalog.categoriesLabel' }, chips }),
        ChipRow({ label: { key: 'catalog.activeFilters' }, chips: removable, wrap: true }),
        Tabs({
          label: { key: 'admin.tabsLabel' },
          items: [
            { label: { key: 'admin.tabs.books' }, href: '#selection', current: true },
            { label: { key: 'admin.tabs.reports' }, href: '#selection' },
            { label: { key: 'admin.tabs.users' }, href: '#selection' },
          ],
        }),
      ),
    ),
    panel(
      null,
      box(
        'stack gap-5',
        box(
          'row gap-2',
          Badge({ label: { key: 'categories.fiction' } }),
          Badge({ label: { key: 'book.trending' }, tone: 'accent' }),
          Badge({ label: { key: 'book.availability.available' }, tone: 'success', dot: true }),
          Badge({ label: { key: 'book.availability.few', params: { count: 1 } }, tone: 'warning', dot: true }),
          Badge({ label: { key: 'book.availability.unavailable' }, tone: 'danger', dot: true }),
          Badge({ label: { key: 'roles.admin' }, tone: 'primary' }),
        ),
        pages,
      ),
    ),
  );
}

function renderFilters() {
  /**
   * @param {Text} label
   * @param {{ id: string, labelKey: string }[]} items
   * @param {string[]} selected
   * @param {boolean} open
   */
  const section = (label, items, selected, open) => {
    const element = FilterSection({
      label,
      open,
      count: selected.length,
      content: CheckboxGroup({
        label,
        options: items.map((item) => ({ value: item.id, label: { key: item.labelKey } })),
        selected,
        onChange: (values) => setSectionCount(element, values.length),
      }),
    });
    return element;
  };

  render(
    qs('#filters-demo'),
    FilterAccordion({
      sections: [
        section({ key: 'catalog.filters.genres' }, GENRES, ['romance'], true),
        section({ key: 'catalog.categoriesLabel' }, CATEGORIES, [], false),
      ],
    }),
  );
}

async function renderDates() {
  const booked = new Set(await getUnavailableDates(BOOKED_BOOK_ID).catch(() => []));
  const isUnavailable = (/** @type {string} */ date) => booked.has(date);
  const summary = h('p', { class: 't-body-sm muted tnum' });

  const range = DateRangeField({
    min: todayIso(),
    maxDays: MAX_BOOKING_DAYS,
    isUnavailable,
    onChange: () => describe(),
  });

  function describe() {
    const { from, to } = range.value();
    const error = from && to ? checkBookingRange(from, to, [...booked]) : null;
    range.setError(error);
    if (from && to && !error) {
      const params = { count: diffDays(from, to) + 1, range: formatDateRange(from, to, 'short') };
      setText(summary, { key: 'booking.summary', params });
    } else {
      setText(summary, { key: 'design.dates.none' });
    }
  }
  describe();
  whileConnected(summary, describe);

  const calendar = Calendar({
    min: todayIso(),
    isUnavailable,
    onSelect: (date) => calendar.update({ value: date }),
  });

  render(
    qs('#dates-demo'),
    panel({ key: 'calendar.range' }, box('stack gap-3', range, summary)),
    panel({ key: 'calendar.label' }, calendar),
  );
}

/** Demos whose text is bound to translation keys: built once, they follow language switches. */
export function renderComponents() {
  renderButtons();
  renderForms();
  renderSelection();
  renderFilters();
  renderDates();
}
