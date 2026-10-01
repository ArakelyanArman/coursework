// @ts-check
import { loadTemplate } from '../../js/core/template.js';

const create = await loadTemplate(new URL('./Skeleton.html', import.meta.url));

/**
 * A loading placeholder. Each component that loads data exports its own skeleton built from
 * these, sized like the real thing so nothing shifts when the data arrives.
 * @param {object} [props]
 * @param {'text' | 'title' | 'cover' | 'block'} [props.variant]
 * @param {string} [props.width] A CSS length or percentage, e.g. "60%".
 * @param {string} [props.height] For the block variant: a CSS length, usually a token.
 * @returns {HTMLElement}
 */
export function Skeleton({ variant = 'text', width, height } = {}) {
  const skeleton = create();
  if (variant !== 'text') skeleton.classList.add(`skeleton--${variant}`);
  if (width) skeleton.style.setProperty('--skeleton-width', width);
  if (height) skeleton.style.setProperty('--skeleton-height', height);
  return skeleton;
}
