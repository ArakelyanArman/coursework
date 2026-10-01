// @ts-check
import { loadTemplate } from '../../js/core/template.js';

// One shared tooltip for every element with a data-tooltip attribute. It is visual only:
// the element's own aria-label or aria-description already carries the text.

const GAP = 8;
const create = await loadTemplate(new URL('./Tooltip.html', import.meta.url));

/** @type {HTMLElement} */
const tooltip = create();
/** @type {Element | null} */
let anchor = null;

function hide() {
  anchor = null;
  if (tooltip.matches(':popover-open')) tooltip.hidePopover();
}

/** @param {Element} target */
function show(target) {
  const text = target.getAttribute('data-tooltip');
  if (!text) return;
  anchor = target;
  tooltip.textContent = text;

  // Re-opening moves it to the top of the top layer, above any open dialog.
  if (!tooltip.isConnected) document.body.append(tooltip);
  if (tooltip.matches(':popover-open')) tooltip.hidePopover();
  tooltip.showPopover();

  const box = target.getBoundingClientRect();
  const { width, height } = tooltip.getBoundingClientRect();
  const fitsBelow = box.bottom + GAP + height <= window.innerHeight;
  const top = fitsBelow ? box.bottom + GAP : box.top - GAP - height;
  const left = Math.max(GAP, Math.min(window.innerWidth - width - GAP, box.left + box.width / 2 - width / 2));
  tooltip.style.setProperty('--tooltip-x', `${Math.round(left)}px`);
  tooltip.style.setProperty('--tooltip-y', `${Math.round(top)}px`);
}

/** @param {Event} event */
const targetOf = (event) =>
  event.target instanceof Element ? event.target.closest('[data-tooltip]') : null;

if (typeof tooltip.showPopover === 'function') {
  document.addEventListener('mouseover', (event) => {
    const target = targetOf(event);
    if (target && target !== anchor) show(target);
    else if (!target) hide();
  });
  document.addEventListener('focusin', (event) => {
    const target = targetOf(event);
    if (target?.matches(':focus-visible')) show(target);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', hide);
  document.addEventListener('scroll', hide, { capture: true, passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
}
