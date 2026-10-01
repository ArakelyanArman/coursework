// @ts-check

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'use', 'g', 'path', 'circle', 'rect', 'line']);

/** Must be set as DOM properties to take effect. */
const PROPERTIES = new Set([
  'value',
  'checked',
  'indeterminate',
  'selected',
  'disabled',
  'hidden',
  'tabIndex',
  'textContent',
  'htmlFor',
]);

/** @typedef {Node | string | number | boolean | null | undefined} Child */

/**
 * @param {Element} element
 * @param {string} name
 * @param {unknown} value
 */
function setAttr(element, name, value) {
  if (value == null || value === false) {
    if (value === false && name.startsWith('aria-')) element.setAttribute(name, 'false');
    return;
  }

  if (name === 'class' || name === 'className') {
    const classes = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    if (classes) element.setAttribute('class', classes);
    return;
  }

  if (name === 'dataset' && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (entry != null) /** @type {HTMLElement} */ (element).dataset[key] = String(entry);
    }
    return;
  }

  if (name === 'style' && typeof value === 'object') {
    // Inline styles are limited to custom-property hooks such as { '--cover-hue': 210 }.
    for (const [prop, entry] of Object.entries(value)) {
      if (!prop.startsWith('--')) throw new Error(`h(): only custom properties allowed, got "${prop}"`);
      if (entry != null) /** @type {HTMLElement} */ (element).style.setProperty(prop, String(entry));
    }
    return;
  }

  if (name.startsWith('on') && typeof value === 'function') {
    element.addEventListener(name.slice(2).toLowerCase(), /** @type {EventListener} */ (value));
    return;
  }

  if (PROPERTIES.has(name)) {
    /** @type {any} */ (element)[name] = value;
    return;
  }

  if (value === true) {
    element.setAttribute(name, name.startsWith('aria-') ? 'true' : '');
    return;
  }

  element.setAttribute(name, String(value));
}

/**
 * @param {Node} parent
 * @param {Child | Child[]} child
 */
function append(parent, child) {
  if (Array.isArray(child)) {
    for (const entry of child) append(parent, entry);
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else if (child != null && child !== false && child !== true) {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

/**
 * Create an element. String children become text nodes, never HTML.
 * @param {string} tag
 * @param {Record<string, unknown> | Child | Child[]} [attrs] Attributes, or the first child.
 * @param {...(Child | Child[])} children
 * @returns {any}
 */
export function h(tag, attrs, ...children) {
  const element = SVG_TAGS.has(tag)
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);

  const hasAttrs =
    attrs != null && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs);

  if (hasAttrs) {
    for (const [name, value] of Object.entries(/** @type {Record<string, unknown>} */ (attrs))) {
      setAttr(element, name, value);
    }
  } else {
    append(element, /** @type {Child | Child[]} */ (attrs));
  }

  append(element, children);
  return element;
}

/**
 * Replace everything inside `parent`.
 * @param {Element} parent
 * @param {...(Child | Child[])} children
 * @returns {Element}
 */
export function render(parent, ...children) {
  const fragment = document.createDocumentFragment();
  append(fragment, children);
  parent.replaceChildren(fragment);
  return parent;
}

/** @param {Element} element */
export function clear(element) {
  element.replaceChildren();
}

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {any}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {any[]}
 */
export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}
