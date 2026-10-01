// @ts-check
import { loadTemplate } from '../../js/core/template.js';

const create = await loadTemplate(new URL('./Avatar.html', import.meta.url));

/** @param {string} name "Anna Petrosyan" → "AP" */
function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => [...word][0].toUpperCase()).join('');
}

/**
 * Decorative: always shown next to the person's name.
 * @param {{ name: string }} props
 * @returns {HTMLElement}
 */
export function Avatar({ name }) {
  const avatar = create();
  avatar.textContent = initials(name);
  return avatar;
}
