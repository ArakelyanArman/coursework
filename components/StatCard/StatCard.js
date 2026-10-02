// @ts-check
import { h } from '../../js/core/dom.js';
import { setText } from '../../js/core/i18n.js';
import { loadTemplate, refs } from '../../js/core/template.js';

/** @typedef {import('../../js/core/i18n.js').Text} Text */

const create = await loadTemplate(new URL('./StatCard.html', import.meta.url));

/**
 * One figure with its label.
 * @param {{ label: Text, value: string }} props `value` is already formatted for the language.
 * @returns {HTMLElement}
 */
export function StatCard({ label, value }) {
  const card = create();
  const parts = refs(card);
  setText(parts.label, label);
  parts.value.textContent = value;
  return card;
}

/**
 * A description list, so each value is tied to its label.
 * @param {Element[]} cards
 * @returns {HTMLElement}
 */
export function StatList(cards) {
  return h('dl', { class: 'stat-list' }, cards);
}
