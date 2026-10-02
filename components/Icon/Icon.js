// @ts-check
import { assetUrl } from '../../js/core/paths.js';
import { loadTemplate } from '../../js/core/template.js';

/** Every symbol in assets/icons/sprite.svg. */
export const ICON_NAMES = /** @type {const} */ ([
  'arrow-right',
  'arrow-up',
  'book-open',
  'calendar-days',
  'chart-column',
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'circle-alert',
  'download',
  'eye',
  'eye-off',
  'inbox',
  'info',
  'languages',
  'log-out',
  'menu',
  'moon',
  'pencil',
  'plus',
  'search',
  'shield',
  'sun',
  'trash-2',
  'x',
]);

/** @typedef {typeof ICON_NAMES[number]} IconName */

const spriteUrl = assetUrl('assets/icons/sprite.svg');
const create = await loadTemplate(new URL('./Icon.html', import.meta.url));

/**
 * Decorative only: the button or link around it carries the label.
 * @param {IconName} name
 * @param {number} [size]
 * @returns {SVGSVGElement}
 */
export function Icon(name, size = 20) {
  const svg = create();
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.firstElementChild.setAttribute('href', `${spriteUrl}#${name}`);
  return svg;
}
