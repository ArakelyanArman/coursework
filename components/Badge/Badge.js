// @ts-check
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */
/** @typedef {'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'primary'} Tone */

const create = await loadTemplate(new URL('./Badge.html', import.meta.url));

/**
 * @param {object} props
 * @param {Text} props.label
 * @param {Tone} [props.tone]
 * @param {boolean} [props.dot] State is never shown by colour alone: the dot comes with a label.
 * @returns {HTMLElement}
 */
export function Badge({ label, tone = 'neutral', dot = false }) {
  const badge = create();
  const parts = refs(badge);
  if (tone !== 'neutral') badge.classList.add(`badge--${tone}`);
  parts.dot.hidden = !dot;
  setText(parts.label, label);
  return badge;
}

/**
 * @param {import('../../js/types.js').Book} book
 * @param {{ detailed?: boolean }} [options] `detailed` adds the copy count ("Available · 3 copies").
 * @returns {HTMLElement | null} Null when availability is unknown.
 */
export function AvailabilityBadge(book, { detailed = false } = {}) {
  const count = book.availableCopies ?? 0;
  if (book.availability === 'unavailable') {
    return Badge({ label: { key: 'book.availability.unavailable' }, tone: 'danger', dot: true });
  }
  if (book.availability === 'few') {
    return Badge({ label: { key: 'book.availability.few', params: { count } }, tone: 'warning', dot: true });
  }
  if (book.availability === 'available') {
    const label = detailed
      ? { key: 'book.availability.availableCopies', params: { count } }
      : { key: 'book.availability.available' };
    return Badge({ label, tone: 'success', dot: true });
  }
  return null;
}
