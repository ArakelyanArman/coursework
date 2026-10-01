// @ts-check
import { config } from '../config.js';
import { session } from './storage.js';

/** The one error type the data layer throws. The UI shows t(error.messageKey, error.params). */
export class ApiError extends Error {
  /**
   * @param {object} init
   * @param {string} init.code
   * @param {number} [init.status] 0 when no response was received.
   * @param {string} init.messageKey
   * @param {Record<string, unknown>} [init.params]
   * @param {unknown} [init.cause]
   */
  constructor({ code, status = 0, messageKey, params, cause }) {
    super(code, { cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.messageKey = messageKey;
    this.params = params;
  }
}

/** @param {unknown} error @returns {boolean} True when the caller cancelled the request. */
export function isAbort(error) {
  return error instanceof ApiError && error.code === 'aborted';
}

/**
 * @typedef {object} RequestOptions
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 * @property {unknown} [body] Sent as JSON.
 * @property {AbortSignal} [signal]
 * @property {number} [timeoutMs]
 * @property {number} [retries] After a network failure. Defaults to 1.
 * @property {number} [cacheTtlMs] GET only.
 * @property {boolean} [dedupe] GET only: share one in-flight request per URL. Defaults to true.
 * @property {'json' | 'text'} [parse]
 * @property {(data: any) => any} [select] Maps the response before it is cached and returned.
 */

/** @typedef {{ promise: Promise<any>, controller: AbortController, subscribers: number }} Flight */

const RETRY_DELAY_MS = 400;
const CACHE_PREFIX = 'http:';

/** @type {Map<string, { expires: number, data: unknown }>} */
const memoryCache = new Map();
/** @type {Map<string, Flight>} */
const inFlight = new Map();

const aborted = () => new ApiError({ code: 'aborted', messageKey: 'errors.unknown' });
const delay = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {string} key */
function readCache(key) {
  let entry = memoryCache.get(key);
  if (!entry) {
    entry = session.get(CACHE_PREFIX + key) ?? undefined;
    if (entry) memoryCache.set(key, entry);
  }
  if (!entry) return undefined;
  if (entry.expires <= Date.now()) {
    memoryCache.delete(key);
    session.remove(CACHE_PREFIX + key);
    return undefined;
  }
  return entry.data;
}

/**
 * @param {string} key
 * @param {unknown} data
 * @param {number} ttlMs
 */
function writeCache(key, data, ttlMs) {
  const entry = { expires: Date.now() + ttlMs, data };
  memoryCache.set(key, entry);
  if (!session.set(CACHE_PREFIX + key, entry)) {
    // sessionStorage is full: drop the persisted copies, the memory cache still serves this tab.
    for (const name of session.keys()) {
      if (name.startsWith(CACHE_PREFIX)) session.remove(name);
    }
  }
}

export function clearHttpCache() {
  memoryCache.clear();
  for (const key of session.keys()) {
    if (key.startsWith(CACHE_PREFIX)) session.remove(key);
  }
}

/**
 * A backend may send { "error": { "code", "message_key", "params" } } to choose the message.
 * @param {Response} response
 */
async function errorFromResponse(response) {
  const { status } = response;
  /** @type {any} */
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  let code = 'http_error';
  let messageKey = 'errors.unknown';
  if (status === 401) [code, messageKey] = ['unauthorized', 'errors.unauthorized'];
  else if (status === 403) [code, messageKey] = ['forbidden', 'errors.forbidden'];
  else if (status === 404) [code, messageKey] = ['not_found', 'errors.notFound'];
  else if (status >= 500 || status === 429) [code, messageKey] = ['server', 'errors.server'];

  const sent = body?.error ?? {};
  return new ApiError({
    code: typeof sent.code === 'string' ? sent.code : code,
    status,
    messageKey: typeof sent.message_key === 'string' ? sent.message_key : messageKey,
    params: sent.params && typeof sent.params === 'object' ? sent.params : undefined,
  });
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {AbortSignal} signal Aborted once every caller has cancelled.
 * @param {number} timeoutMs
 * @param {'json' | 'text'} parse
 */
async function attempt(url, init, signal, timeoutMs, parse) {
  if (signal.aborted) throw aborted();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw await errorFromResponse(response);
    const text = response.status === 204 ? '' : await response.text();
    if (parse === 'text') return text;
    if (text === '') return null;
    try {
      return JSON.parse(text);
    } catch (cause) {
      throw new ApiError({
        code: 'bad_response',
        status: response.status,
        messageKey: 'errors.badResponse',
        cause,
      });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError({ code: 'timeout', messageKey: 'errors.timeout' });
    if (signal.aborted) throw aborted();
    throw new ApiError({ code: 'network', messageKey: 'errors.network', cause: error });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {AbortSignal} signal
 * @param {number} timeoutMs
 * @param {number} retries
 * @param {'json' | 'text'} parse
 */
async function execute(url, init, signal, timeoutMs, retries, parse) {
  for (let tries = 0; ; tries += 1) {
    try {
      return await attempt(url, init, signal, timeoutMs, parse);
    } catch (error) {
      const retryable = error instanceof ApiError && error.code === 'network';
      if (!retryable || tries >= retries) throw error;
      await delay(RETRY_DELAY_MS);
    }
  }
}

/**
 * Each caller can cancel on its own; the network request is only aborted once all have.
 * @param {Flight} flight
 * @param {AbortSignal} [signal]
 * @returns {Promise<any>}
 */
function subscribe(flight, signal) {
  flight.subscribers += 1;
  if (!signal) return flight.promise;

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      flight.subscribers -= 1;
      if (flight.subscribers === 0) flight.controller.abort();
      reject(aborted());
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    flight.promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/**
 * @param {string} url
 * @param {RequestOptions} [options]
 * @returns {Promise<any>} Throws ApiError; check isAbort() before showing an error.
 */
export function request(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    signal,
    timeoutMs = config.httpTimeoutMs,
    retries = 1,
    cacheTtlMs = 0,
    dedupe = true,
    parse = 'json',
    select,
  } = options;

  const verb = method.toUpperCase();
  const isGet = verb === 'GET';
  const key = `${verb} ${url}`;

  if (signal?.aborted) return Promise.reject(aborted());

  if (isGet && cacheTtlMs > 0) {
    const cached = readCache(key);
    if (cached !== undefined) return Promise.resolve(cached);
  }

  const shared = isGet && dedupe ? inFlight.get(key) : undefined;
  if (shared && !shared.controller.signal.aborted) return subscribe(shared, signal);

  /** @type {RequestInit} */
  const init = { method: verb, headers: { ...headers } };
  if (parse === 'json') init.headers = { Accept: 'application/json', ...headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json', ...init.headers };
  }

  const controller = new AbortController();
  /** @type {Flight} */
  const flight = { controller, subscribers: 0, promise: Promise.resolve() };
  flight.promise = execute(url, init, controller.signal, timeoutMs, retries, parse)
    .then((data) => {
      const result = select ? select(data) : data;
      if (isGet && cacheTtlMs > 0) writeCache(key, result, cacheTtlMs);
      return result;
    })
    .finally(() => {
      if (inFlight.get(key) === flight) inFlight.delete(key);
    });
  flight.promise.catch(() => {});

  if (isGet && dedupe) inFlight.set(key, flight);
  return subscribe(flight, signal);
}

/**
 * @param {string} url
 * @param {Omit<RequestOptions, 'method' | 'body'>} [options]
 */
export function getJson(url, options = {}) {
  return request(url, { ...options, method: 'GET' });
}

/**
 * @param {string} url
 * @param {Omit<RequestOptions, 'method' | 'body' | 'parse'>} [options]
 * @returns {Promise<string>}
 */
export function getText(url, options = {}) {
  return request(url, { ...options, method: 'GET', parse: 'text' });
}

/**
 * @param {'POST' | 'PUT' | 'PATCH' | 'DELETE'} method
 * @param {string} url
 * @param {unknown} [body]
 * @param {Omit<RequestOptions, 'method' | 'body'>} [options]
 */
export function sendJson(method, url, body, options = {}) {
  return request(url, { ...options, method, body });
}

/**
 * @param {string} url
 * @param {Record<string, string | number | boolean | null | undefined>} params Empty values are skipped.
 * @returns {string}
 */
export function withQuery(url, params) {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value != null && value !== '') search.set(name, String(value));
  }
  const query = search.toString();
  if (!query) return url;
  return url + (url.includes('?') ? '&' : '?') + query;
}
