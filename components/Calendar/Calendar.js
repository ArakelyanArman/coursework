// @ts-check
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  monthGrid,
  parseIso,
  startOfMonth,
  startOfWeek,
  todayIso,
} from '../../js/core/date.js';
import { h } from '../../js/core/dom.js';
import { formatDate, weekdayNames } from '../../js/core/format.js';
import { applyTranslations, t, whileConnected } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';
import { IconButton, setDisabled } from '../Button/Button.js';

/** @typedef {import('../../js/core/date.js').IsoDate} IsoDate */

/**
 * @typedef {object} CalendarState
 * @property {IsoDate | null} [value] The selected date.
 * @property {IsoDate | null} [rangeStart] With rangeEnd: the days between are highlighted.
 * @property {IsoDate | null} [rangeEnd]
 * @property {IsoDate | null} [min]
 * @property {IsoDate | null} [max]
 */

/**
 * @typedef {HTMLElement & {
 *   update: (patch: CalendarState) => void,
 *   show: (date: IsoDate) => void,
 *   focusDay: () => void,
 * }} CalendarElement
 */

const create = await loadTemplate(new URL('./Calendar.html', import.meta.url));

const ARROWS = /** @type {Record<string, number>} */ ({
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
});

/**
 * A month grid. Arrow keys move by day and week, Home and End to the ends of the week,
 * PageUp and PageDown by month (with Shift: by year).
 * @param {CalendarState & {
 *   isUnavailable?: (date: IsoDate) => boolean,
 *   onSelect?: (date: IsoDate) => void,
 * }} props
 * @returns {CalendarElement}
 */
export function Calendar({ isUnavailable, onSelect, ...initial }) {
  const calendar = create();
  const parts = refs(calendar);
  /** @type {Required<CalendarState>} */
  const state = { value: null, rangeStart: null, rangeEnd: null, min: null, max: null, ...initial };

  /** @param {IsoDate} date */
  const clamp = (date) => {
    if (state.min && date < state.min) return state.min;
    if (state.max && date > state.max) return state.max;
    return date;
  };
  /** @param {IsoDate} date */
  const isBlocked = (date) =>
    Boolean((state.min && date < state.min) || (state.max && date > state.max) || isUnavailable?.(date));

  // The one day that is in the tab order; arrow keys move it.
  let focusDate = clamp(state.value ?? state.rangeStart ?? todayIso());

  const previous = IconButton({
    icon: 'chevron-left',
    label: { key: 'calendar.previousMonth' },
    size: 'sm',
    onClick: () => move(addMonths(focusDate, -1), false),
  });
  const next = IconButton({
    icon: 'chevron-right',
    label: { key: 'calendar.nextMonth' },
    size: 'sm',
    onClick: () => move(addMonths(focusDate, 1), false),
  });
  parts.prev.replaceWith(previous);
  parts.next.replaceWith(next);
  parts.unavailableKey.hidden = !isUnavailable;
  applyTranslations(calendar);

  function focusDay() {
    parts.days.querySelector(`[data-date="${focusDate}"]`)?.focus();
  }

  /**
   * @param {IsoDate} date
   * @param {boolean} [focus]
   */
  function move(date, focus = true) {
    focusDate = clamp(date);
    render();
    if (focus) focusDay();
  }

  function render() {
    const { year, month } = parseIso(focusDate);
    const today = todayIso();
    const { value, rangeStart, rangeEnd } = state;

    parts.title.textContent = formatDate(startOfMonth(focusDate), 'monthYear');
    setDisabled(previous, Boolean(state.min && startOfMonth(focusDate) <= state.min));
    setDisabled(next, Boolean(state.max && endOfMonth(focusDate) >= state.max));

    const longNames = weekdayNames('long');
    parts.weekdays.replaceChildren(
      ...weekdayNames('short').map((name, index) =>
        h('th', { class: 'calendar__weekday', scope: 'col', abbr: longNames[index] }, name),
      ),
    );

    parts.days.replaceChildren(
      ...monthGrid(year, month).map((week) =>
        h(
          'tr',
          week.map(({ iso, inMonth }) => {
            if (!inMonth) return h('td');
            const unavailable = Boolean(isUnavailable?.(iso));
            const selected = iso === value || iso === rangeStart || iso === rangeEnd;
            const inRange = Boolean(rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd);
            return h(
              'td',
              { role: 'gridcell', 'aria-selected': selected ? 'true' : null },
              h(
                'button',
                {
                  type: 'button',
                  class: [
                    'calendar__day',
                    iso === today && 'calendar__day--today',
                    selected && 'calendar__day--selected',
                    inRange && 'calendar__day--in-range',
                    unavailable && 'calendar__day--unavailable',
                  ],
                  tabIndex: iso === focusDate ? 0 : -1,
                  'aria-label': formatDate(iso, 'long') + (unavailable ? `, ${t('calendar.unavailable')}` : ''),
                  'aria-current': iso === today ? 'date' : null,
                  'aria-disabled': isBlocked(iso) ? 'true' : null,
                  dataset: { date: iso },
                },
                String(parseIso(iso).day),
              ),
            );
          }),
        ),
      ),
    );
  }

  parts.days.addEventListener('click', (/** @type {MouseEvent} */ event) => {
    const day = event.target instanceof Element ? event.target.closest('.calendar__day') : null;
    if (!(day instanceof HTMLElement) || !day.dataset.date) return;
    focusDate = day.dataset.date;
    if (day.getAttribute('aria-disabled') !== 'true') onSelect?.(focusDate);
  });

  parts.days.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
    let target = null;
    if (event.key in ARROWS) target = addDays(focusDate, ARROWS[event.key]);
    else if (event.key === 'Home') target = startOfWeek(focusDate);
    else if (event.key === 'End') target = endOfWeek(focusDate);
    else if (event.key === 'PageUp') target = addMonths(focusDate, event.shiftKey ? -12 : -1);
    else if (event.key === 'PageDown') target = addMonths(focusDate, event.shiftKey ? 12 : 1);
    if (!target) return;
    event.preventDefault();
    move(target);
  });

  calendar.update = (/** @type {CalendarState} */ patch) => {
    Object.assign(state, patch);
    if (patch.value) focusDate = patch.value;
    focusDate = clamp(focusDate);
    render();
  };
  calendar.show = (/** @type {IsoDate} */ date) => move(date, false);
  calendar.focusDay = focusDay;

  // Month and weekday names come from Intl, so they are redrawn on a language switch.
  whileConnected(calendar, render);
  render();
  return calendar;
}
