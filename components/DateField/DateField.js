// @ts-check
import { onEscape, trapFocus } from '../../js/core/a11y.js';
import { addDays, todayIso } from '../../js/core/date.js';
import { h } from '../../js/core/dom.js';
import { formatDate, formatTypedDate, parseTypedDate } from '../../js/core/format.js';
import { setAttrText, whileConnected } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { IconButton } from '../Button/Button.js';
import { Calendar } from '../Calendar/Calendar.js';
import { TextField, inputOf, setFieldError } from '../TextField/TextField.js';

/** @typedef {import('../../js/core/date.js').IsoDate} IsoDate */
/** @typedef {import('../../js/core/i18n.js').Text} Text */
/** @typedef {import('../../js/core/validate.js').ValidationError} ValidationError */
/** @typedef {import('../Calendar/Calendar.js').CalendarState} CalendarState */

/**
 * @typedef {HTMLElement & {
 *   value: () => IsoDate | null,
 *   setValue: (date: IsoDate | null) => void,
 *   update: (patch: CalendarState) => void,
 *   open: () => void,
 *   setError: (error: ValidationError | null) => void,
 * }} DateFieldElement
 */

const create = await loadTemplate(new URL('./DateField.html', import.meta.url));

/**
 * A text field with a calendar popover. Dates can be picked or typed.
 * @param {object} props
 * @param {Text} props.label
 * @param {IsoDate | null} [props.value]
 * @param {IsoDate | null} [props.min]
 * @param {IsoDate | null} [props.max]
 * @param {IsoDate | null} [props.rangeStart]
 * @param {IsoDate | null} [props.rangeEnd]
 * @param {(date: IsoDate) => boolean} [props.isUnavailable]
 * @param {'start' | 'end'} [props.align] Which edge of the field the popover lines up with.
 * @param {(date: IsoDate | null, source: 'calendar' | 'input') => void} [props.onChange]
 * @returns {DateFieldElement}
 */
export function DateField({ label, value = null, align = 'start', isUnavailable, onChange, ...limits }) {
  const root = create();
  const { popover } = refs(root);
  let current = value;
  /** @type {(() => void)[]} */
  let cleanup = [];

  const trigger = IconButton({
    icon: 'calendar-days',
    label: { key: 'calendar.open' },
    onClick: () => (popover.hidden ? open() : close()),
  });
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');

  const field = TextField({
    label,
    placeholder: { key: 'calendar.placeholder' },
    autocomplete: 'off',
    trailing: trigger,
  });
  const input = inputOf(field);
  refs(root).field.replaceWith(field);
  if (align === 'end') root.classList.add('date-field--end');

  const calendar = Calendar({
    ...limits,
    value: current,
    isUnavailable,
    onSelect: (date) => {
      // Close first: onChange may move focus on (a range opens its second calendar).
      close();
      commit(date, 'calendar');
    },
  });
  popover.append(calendar);
  setAttrText(popover, 'aria-label', { key: 'calendar.label' });

  // Shown in the language's long form; switched to the typeable form while editing.
  function display() {
    if (!current) input.value = '';
    else input.value = document.activeElement === input ? formatTypedDate(current) : formatDate(current);
  }

  /**
   * @param {IsoDate | null} date
   * @param {'calendar' | 'input'} source
   */
  function commit(date, source) {
    current = date;
    setFieldError(field, null);
    calendar.update({ value: date });
    display();
    onChange?.(date, source);
  }

  function readInput() {
    const text = input.value.trim();
    if (text === '') {
      if (current !== null) commit(null, 'input');
      else setFieldError(field, null);
      return;
    }
    const date = parseTypedDate(text);
    if (!date) setFieldError(field, { key: 'validation.date' });
    else if (date !== current) commit(date, 'input');
    else display();
  }

  function open() {
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    calendar.show(current ?? limits.rangeStart ?? limits.min ?? todayIso());
    calendar.focusDay();

    const outside = (/** @type {Event} */ event) => {
      if (event.target instanceof Node && !root.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', outside, true);
    cleanup = [
      trapFocus(popover),
      onEscape(popover, (event) => {
        event.stopPropagation();
        close();
      }),
      () => document.removeEventListener('pointerdown', outside, true),
    ];
  }

  /** @param {boolean} [returnFocus] */
  function close(returnFocus = true) {
    if (popover.hidden) return;
    popover.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    cleanup.forEach((undo) => undo());
    cleanup = [];
    if (returnFocus) trigger.focus();
  }

  input.addEventListener('focus', display);
  input.addEventListener('blur', readInput);
  input.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      readInput();
    } else if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault();
      open();
    }
  });

  root.value = () => current;
  root.setValue = (/** @type {IsoDate | null} */ date) => {
    current = date;
    calendar.update({ value: date });
    display();
  };
  root.update = (/** @type {CalendarState} */ patch) => {
    Object.assign(limits, patch);
    calendar.update(patch);
  };
  root.open = open;
  root.setError = (/** @type {ValidationError | null} */ error) => setFieldError(field, error);

  whileConnected(root, display);
  display();
  return root;
}

/**
 * @typedef {HTMLElement & {
 *   value: () => { from: IsoDate | null, to: IsoDate | null },
 *   clear: () => void,
 *   setError: (error: ValidationError | null) => void,
 * }} DateRangeFieldElement
 */

/**
 * "From" and "To". Picking From opens To; To cannot be earlier than From.
 * @param {object} [props]
 * @param {IsoDate | null} [props.from]
 * @param {IsoDate | null} [props.to]
 * @param {IsoDate | null} [props.min]
 * @param {number} [props.maxDays] Longest allowed range, both ends included.
 * @param {(date: IsoDate) => boolean} [props.isUnavailable]
 * @param {(range: { from: IsoDate | null, to: IsoDate | null }) => void} [props.onChange]
 * @returns {DateRangeFieldElement}
 */
export function DateRangeField({ from = null, to = null, min = null, maxDays, isUnavailable, onChange } = {}) {
  const range = { from, to };
  const lastDay = () => (range.from && maxDays ? addDays(range.from, maxDays - 1) : null);

  const fromField = DateField({
    label: { key: 'calendar.from' },
    value: from,
    min,
    rangeStart: from,
    rangeEnd: to,
    isUnavailable,
    onChange: (date, source) => {
      range.from = date;
      const limit = lastDay();
      if (range.to && date && (range.to < date || (limit && range.to > limit))) {
        range.to = null;
        toField.setValue(null);
      }
      sync();
      onChange?.({ ...range });
      if (date && source === 'calendar') toField.open();
    },
  });

  const toField = DateField({
    label: { key: 'calendar.to' },
    value: to,
    min: from ?? min,
    max: lastDay(),
    rangeStart: from,
    rangeEnd: to,
    isUnavailable,
    align: 'end',
    onChange: (date) => {
      range.to = date;
      sync();
      onChange?.({ ...range });
    },
  });

  function sync() {
    fromField.update({ rangeStart: range.from, rangeEnd: range.to });
    toField.update({ min: range.from ?? min, max: lastDay(), rangeStart: range.from, rangeEnd: range.to });
  }

  const group = h('div', { class: 'date-range', role: 'group' }, fromField, toField);
  setAttrText(group, 'aria-label', { key: 'calendar.range' });

  group.value = () => ({ ...range });
  group.clear = () => {
    range.from = null;
    range.to = null;
    fromField.setValue(null);
    toField.setValue(null);
    sync();
  };
  // A range error concerns both dates; it is shown once, under the first field.
  group.setError = (/** @type {ValidationError | null} */ error) => fromField.setError(error);
  return group;
}
