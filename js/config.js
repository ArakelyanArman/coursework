// @ts-check

export const config = {
  /** @type {'external' | 'backend'} */
  dataSource: 'external', // 'external' now → 'backend' later
  backendBaseUrl: '/api',
  openLibraryBaseUrl: 'https://openlibrary.org',
  coversBaseUrl: 'https://covers.openlibrary.org',
  localLatencyMs: [300, 600], // simulated latency for local-db only

  storagePrefix: 'library:', // also hard-coded in theme-init.js

  /** @type {ReadonlyArray<'en' | 'hy'>} */
  languages: ['en', 'hy'],
  /** @type {'en' | 'hy'} */
  defaultLanguage: 'en',
  /** @type {Record<'en' | 'hy', string>} */
  locales: { en: 'en-US', hy: 'hy-AM' },

  httpTimeoutMs: 10_000,
  httpCacheTtlMs: 10 * 60 * 1000,
  pageSize: 20,

  isDev: ['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname ?? ''),
};
