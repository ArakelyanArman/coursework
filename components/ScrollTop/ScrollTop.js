// @ts-check
import { h } from '../../js/core/dom.js';
import { IconButton } from '../Button/Button.js';

const MIN_DURATION = 500;
const MAX_DURATION = 1100;
const STOP_ON = /** @type {const} */ (['wheel', 'touchstart', 'keydown', 'mousedown']);

/** Starts and stops gently. @param {number} t 0 to 1 */
const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** The browser's own smooth scroll rushes long pages, so the page is moved frame by frame. */
function scrollToTop() {
  const start = window.scrollY;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  const duration = Math.min(MAX_DURATION, MIN_DURATION + start / 5);
  const began = performance.now();
  let frame = 0;

  // The visitor scrolling, tapping or typing takes over at once.
  const stop = () => {
    cancelAnimationFrame(frame);
    STOP_ON.forEach((type) => window.removeEventListener(type, stop));
  };
  /** @param {number} now */
  const step = (now) => {
    const progress = Math.min(1, (now - began) / duration);
    window.scrollTo({ top: start * (1 - ease(progress)), behavior: 'instant' });
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };

  STOP_ON.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  frame = requestAnimationFrame(step);
}

/**
 * A floating button that appears once the page has been scrolled and brings it back to the top.
 * @param {object} props
 * @param {HTMLElement} props.target Takes the focus afterwards, so the keyboard carries on from the top.
 * @returns {HTMLElement}
 */
export function ScrollTop({ target }) {
  const button = IconButton({
    icon: 'arrow-up',
    label: { key: 'common.backToTop' },
    variant: 'secondary',
    onClick: () => {
      scrollToTop();
      target.focus({ preventScroll: true });
    },
  });
  button.classList.add('scroll-top__button');
  const root = h('div', { class: 'scroll-top' }, button);

  const sync = () => {
    root.classList.toggle('scroll-top--visible', window.scrollY > window.innerHeight / 2);
  };
  window.addEventListener('scroll', sync, { passive: true });
  sync();
  return root;
}
