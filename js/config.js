// @ts-check

/**
 * App configuration. Switching to the real backend only touches this file and
 * the provider layer: set `dataSource` to 'backend'.
 */
export const config = {
  /** @type {'external' | 'backend'} */
  dataSource: 'external', // 'external' now → 'backend' later
  backendBaseUrl: '/api',
  openLibraryBaseUrl: 'https://openlibrary.org',
  coversBaseUrl: 'https://covers.openlibrary.org',
  /** Simulated latency range in ms, for local-db only. */
  localLatencyMs: [300, 600],

  /** Prefix for every localStorage/sessionStorage key. Also used in theme-init.js. */
  storagePrefix: 'library:',

  /** @type {ReadonlyArray<'en' | 'hy'>} */
  languages: ['en', 'hy'],
  /** @type {'en' | 'hy'} */
  defaultLanguage: 'en',
  /** @type {Record<'en' | 'hy', string>} */
  locales: { en: 'en-US', hy: 'hy-AM' },

  httpTimeoutMs: 10_000,
  /** Cache lifetime for Open Library GETs. */
  httpCacheTtlMs: 10 * 60 * 1000,

  /** Dev-only warnings (missing translation keys, etc.). */
  isDev: ['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname ?? ''),
};
