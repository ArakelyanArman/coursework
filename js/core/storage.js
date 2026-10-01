// @ts-check
import { config } from '../config.js';
import { EVENTS, emit } from './events.js';

/**
 * @typedef {object} Store
 * @property {(key: string, fallback?: any) => any} get
 * @property {(key: string, value: unknown) => boolean} set False when the write failed (quota, private mode).
 * @property {(key: string) => void} remove
 * @property {() => string[]} keys This app's keys, without the prefix.
 * @property {() => void} clear Removes only this app's keys.
 */

/**
 * JSON store over a Web Storage area; falls back to memory when storage is unavailable.
 * @param {() => Storage} getArea
 * @returns {Store}
 */
function createStore(getArea) {
  /** @type {Map<string, string>} */
  const memory = new Map();
  const prefix = config.storagePrefix;

  /** @returns {Storage | null} */
  const area = () => {
    try {
      return getArea();
    } catch {
      return null;
    }
  };

  return {
    get(key, fallback = null) {
      let raw = null;
      try {
        raw = area()?.getItem(prefix + key) ?? null;
      } catch {
        raw = null;
      }
      if (raw == null) raw = memory.get(key) ?? null;
      if (raw == null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        const target = area();
        if (!target) throw new Error('storage unavailable');
        target.setItem(prefix + key, raw);
        memory.delete(key);
        return true;
      } catch {
        memory.set(key, raw);
        return false;
      }
    },

    remove(key) {
      memory.delete(key);
      try {
        area()?.removeItem(prefix + key);
      } catch {
        return;
      }
    },

    keys() {
      const found = new Set(memory.keys());
      try {
        const target = area();
        for (let i = 0; target && i < target.length; i += 1) {
          const name = target.key(i);
          if (name?.startsWith(prefix)) found.add(name.slice(prefix.length));
        }
      } catch {
        return [...found];
      }
      return [...found];
    },

    clear() {
      for (const key of this.keys()) this.remove(key);
    },
  };
}

export const local = createStore(() => window.localStorage);
export const session = createStore(() => window.sessionStorage);

/** Shared state: persisted, and broadcast with detail { value, source: 'local' | 'remote' }. */
const SHARED = Object.freeze({
  session: { key: 'session', event: EVENTS.AUTH_CHANGE },
  theme: { key: 'theme', event: EVENTS.THEME_CHANGE },
  language: { key: 'lang', event: EVENTS.LANG_CHANGE },
});

/** @typedef {keyof typeof SHARED} SharedName */

/**
 * @param {SharedName} name
 * @param {any} [fallback]
 * @returns {any}
 */
export function getShared(name, fallback = null) {
  return local.get(SHARED[name].key, fallback);
}

/**
 * @param {SharedName} name
 * @param {unknown} value null removes it.
 */
export function setShared(name, value) {
  const { key, event } = SHARED[name];
  if (value == null) local.remove(key);
  else local.set(key, value);
  emit(event, { value: value ?? null, source: 'local' });
}

// Another tab changed shared state: re-broadcast it here.
window.addEventListener('storage', (event) => {
  if (event.storageArea !== window.localStorage || !event.key) return;
  const entry = Object.values(SHARED).find(({ key }) => config.storagePrefix + key === event.key);
  if (!entry) return;
  emit(entry.event, { value: local.get(entry.key), source: 'remote' });
});
