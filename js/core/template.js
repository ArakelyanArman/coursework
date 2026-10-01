// @ts-check
import { getText } from './http.js';

/** @type {Map<string, Promise<() => any>>} */
const cache = new Map();

/**
 * Load a component's HTML file once; the returned function gives a fresh copy of its root element.
 * @param {string | URL} url
 * @returns {Promise<() => any>}
 */
export function loadTemplate(url) {
  const href = String(url);
  let pending = cache.get(href);
  if (!pending) {
    pending = getText(href).then((markup) => {
      // Parsed inside <template> so roots like <tr> or <li> survive.
      const parsed = new DOMParser().parseFromString(`<template>${markup}</template>`, 'text/html');
      const source = parsed.querySelector('template')?.content.firstElementChild;
      if (!source) throw new Error(`Empty template: ${href}`);
      return () => document.importNode(source, true);
    });
    cache.set(href, pending);
  }
  return pending;
}

/**
 * @param {Element} root
 * @returns {Record<string, any>} Elements marked with data-ref="name", by name.
 */
export function refs(root) {
  /** @type {Record<string, Element>} */
  const found = {};
  const marked = [...root.querySelectorAll('[data-ref]')];
  if (root.hasAttribute('data-ref')) marked.unshift(root);
  for (const element of marked) found[element.getAttribute('data-ref') ?? ''] = element;
  return found;
}
