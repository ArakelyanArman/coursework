// @ts-check
import { h } from '../core/dom.js';
import { assetUrl } from '../core/paths.js';

/**
 * Every symbol in assets/icons/sprite.svg. Add the Lucide symbol to the sprite
 * before adding its name here.
 */
export const ICON_NAMES = /** @type {const} */ ([
  'arrow-right',
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

/**
 * A decorative Lucide icon, drawn in the current text colour.
 * Icons never carry meaning on their own: label the button or link around them.
 * @param {IconName} name
 * @param {number} [size] Width and height in CSS pixels.
 * @returns {SVGSVGElement}
 */
export function Icon(name, size = 20) {
  return h(
    'svg',
    {
      class: 'icon',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      'aria-hidden': true,
      focusable: 'false',
    },
    h('use', { href: `${spriteUrl}#${name}` }),
  );
}
