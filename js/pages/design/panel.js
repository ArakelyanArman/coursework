// @ts-check
import { h } from '../../core/dom.js';
import { setText } from '../../core/i18n.js';

/** @typedef {import('../../core/i18n.js').Text} Text */
/** @typedef {import('../../core/dom.js').Child} Child */

/**
 * @param {Text} text
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function caption(text, className = 'design-panel__title t-label muted') {
  const element = h('h3', { class: className });
  setText(element, text);
  return element;
}

/**
 * A titled card on the style-guide page.
 * @param {Text | null} title
 * @param {...(Child | Child[])} children
 * @returns {HTMLElement}
 */
export function panel(title, ...children) {
  return h('div', { class: 'design-panel' }, title && caption(title), children);
}

/**
 * @param {string} className
 * @param {...(Child | Child[])} children
 * @returns {HTMLElement}
 */
export const box = (className, ...children) => h('div', { class: className }, children);
