// @ts-check
import { Banner } from '../../../components/Banner/Banner.js';
import { Button, setLoading } from '../../../components/Button/Button.js';
import { DateRangeField } from '../../../components/DateField/DateField.js';
import { Icon } from '../../../components/Icon/Icon.js';
import { toast } from '../../../components/Toast/Toast.js';
import { uid } from '../../core/a11y.js';
import { diffDays, isValidIso, todayIso } from '../../core/date.js';
import { h, render } from '../../core/dom.js';
import { EVENTS, on } from '../../core/events.js';
import { formatDate, formatDateRange } from '../../core/format.js';
import { ApiError } from '../../core/http.js';
import { applyTranslations, setText, t, whileConnected } from '../../core/i18n.js';
import { loginUrl, requireLogin } from '../../guards.js';
import { isLoggedIn } from '../../services/auth.js';
import { getUnavailableDates } from '../../services/books.js';
import { MAX_BOOKING_DAYS, checkBookingRange, createBooking } from '../../services/bookings.js';

/** @typedef {import('../../types.js').Book} Book */
/** @typedef {import('../../types.js').IsoDate} IsoDate */
/** @typedef {{ from: IsoDate | null, to: IsoDate | null }} Range */

/** @param {Range} range @returns {number} Days booked, both ends included. */
const dayCount = ({ from, to }) => (from && to ? diffDays(from, to) + 1 : 0);

/**
 * Dates that came from the URL are used only when they could still be booked.
 * @param {unknown} from
 * @param {unknown} to
 * @returns {Range}
 */
function usableRange(from, to) {
  const start = isValidIso(from) && String(from) >= todayIso() ? String(from) : null;
  const end = start && isValidIso(to) && String(to) >= start ? String(to) : null;
  const fits = end && dayCount({ from: start, to: end }) <= MAX_BOOKING_DAYS;
  return { from: start, to: fits ? end : null };
}

/**
 * The "Reserve this book" card: pick dates, book, and see the confirmation in place.
 * @param {object} props
 * @param {Book} props.book
 * @param {unknown} [props.from] Dates to start with, e.g. kept in the URL across a login.
 * @param {unknown} [props.to]
 * @param {(range: Range) => void} [props.onRangeChange]
 * @param {() => void} [props.onBooked]
 * @returns {HTMLElement}
 */
export function BookingBox({ book, from, to, onRangeChange, onBooked }) {
  const id = uid('booking');
  const start = usableRange(from, to);
  /** @type {Set<IsoDate>} Dates on which every copy is out. */
  let blocked = new Set();

  const message = h('div', { hidden: true });
  const summary = h('p', { class: 't-body-sm tnum', role: 'status' });
  const loginHint = h('p', { class: 't-caption muted' });
  setText(loginHint, { key: 'booking.loginHint' });

  const range = DateRangeField({
    from: start.from,
    to: start.to,
    min: todayIso(),
    maxDays: MAX_BOOKING_DAYS,
    isUnavailable: (date) => blocked.has(date),
    onChange: (value) => {
      range.setError(null);
      renderSummary();
      onRangeChange?.(value);
    },
  });

  const submit = Button({ label: { key: 'booking.submit' }, size: 'lg', type: 'submit' });
  const form = h(
    'form',
    { class: 'booking__form', novalidate: true },
    message,
    range,
    h(
      'div',
      { class: 'booking__footer' },
      h('div', { class: 'booking__notes' }, summary, loginHint),
      submit,
    ),
  );
  const content = h('div', form);

  // "7 days · Mar 15 – Mar 22" once both dates are chosen; the booking rule until then.
  function renderSummary() {
    const value = range.value();
    summary.classList.toggle('muted', !value.from || !value.to);
    summary.textContent =
      value.from && value.to
        ? t('booking.summary', {
            count: dayCount(value),
            range: formatDateRange(value.from, value.to, 'short'),
          })
        : t('booking.rules', { count: MAX_BOOKING_DAYS });
  }

  /** @param {import('../../core/i18n.js').Text | null} text @param {'danger' | 'info'} [tone] */
  function showMessage(text, tone = 'danger') {
    message.hidden = !text;
    render(message, text && Banner({ message: text, tone }));
  }

  async function loadBlockedDates() {
    try {
      blocked = new Set(await getUnavailableDates(book.id));
    } catch {
      showMessage({ key: 'booking.datesLoadFailed' }, 'info');
    }
  }

  /** @param {Range & { from: IsoDate, to: IsoDate }} booked */
  function showConfirmation(booked) {
    const text = h('p', { class: 't-body-sm' });
    const dates = h('p', { class: 't-body-sm muted tnum' });
    const title = h('span', { class: 't-label' });
    setText(title, { key: 'booking.confirmed' });

    const renderDates = () => {
      text.textContent = t('booking.confirmedText', { date: formatDate(booked.from, 'long') });
      dates.textContent = t('booking.summary', {
        count: dayCount(booked),
        range: formatDateRange(booked.from, booked.to, 'short'),
      });
    };
    renderDates();

    const done = h(
      'div',
      { class: 'booking__done', tabIndex: -1 },
      h(
        'p',
        { class: 'booking__done-title' },
        h('span', { class: 'booking__done-icon' }, Icon('check', 18)),
        title,
      ),
      text,
      dates,
      Button({
        label: { key: 'booking.again' },
        variant: 'secondary',
        onClick: () => {
          range.clear();
          renderSummary();
          render(content, form);
          // The form was off the page meanwhile and may have missed a language switch.
          applyTranslations(form);
          form.querySelector('input')?.focus();
        },
      }),
    );
    whileConnected(done, renderDates);
    render(content, done);
    done.focus();
  }

  form.addEventListener('submit', async (/** @type {SubmitEvent} */ event) => {
    event.preventDefault();
    const { from: fromDate, to: toDate } = range.value();
    const problem = checkBookingRange(fromDate, toDate, [...blocked]);
    range.setError(problem);
    if (problem || !fromDate || !toDate) {
      form.querySelector('input')?.focus();
      return;
    }
    if (!requireLogin()) return;

    showMessage(null);
    setLoading(submit, true);
    try {
      await createBooking({ bookId: book.id, fromDate, toDate });
      toast({ title: { key: 'booking.confirmed' }, tone: 'success' });
      showConfirmation({ from: fromDate, to: toDate });
      onRangeChange?.({ from: null, to: null });
      onBooked?.();
      loadBlockedDates();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showMessage({ key: 'errors.unknown' });
      } else if (error.status === 401) {
        window.location.assign(loginUrl());
      } else if (error.status === 409 || error.status === 422) {
        // Someone else took the dates meanwhile, or a rule was broken: say so under the fields.
        range.setError({ key: error.messageKey, params: error.params });
        loadBlockedDates();
      } else {
        showMessage({ key: error.messageKey, params: error.params });
      }
    } finally {
      setLoading(submit, false);
    }
  });

  const syncHint = () => {
    loginHint.hidden = isLoggedIn();
  };
  on(EVENTS.AUTH_CHANGE, syncHint);
  syncHint();

  const heading = h('h2', { class: 't-title-sm', id });
  setText(heading, { key: 'booking.title' });
  const box = h('section', { class: 'booking', 'aria-labelledby': id }, heading, content);

  whileConnected(box, renderSummary);
  renderSummary();
  loadBlockedDates();
  return box;
}
