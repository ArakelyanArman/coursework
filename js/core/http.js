// @ts-check
import { config } from '../config.js';
import { session } from './storage.js';

/**
 * The single error type thrown by the data layer. The UI shows `t(error.messageKey)`,
 * so backend errors are translatable too.
 */
export class ApiError extends Error {
  /**
   * @param {object} init
   * @param {string} init.code Machine-readable code, e.g. 'network', 'timeout', 'not_found'.
   * @param {number} [init.status] HTTP status, or 0 when no response was received.
   * @param {string} init.messageKey i18n key for the user-facing message.
   * @param {unknown} [init.cause]
   */
  constructor({ code, status = 0, messageKey, cause }) {
    super(code, { cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.messageKey = messageKey;
  }
}

/**
 * True when the request was cancelled by its caller (e.g. a newer search replaced it).
 * Callers should ignore these instead of showing an error.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAbort(error) {
  return error instanceof ApiError && error.code === 'aborted';
}

/**
 * @typedef {object} RequestOptions
 * @property {string} [method] Defaults to 'GET'.
 * @property {Record<string, string>} [headers]
 * @property {unknown} [body] Sent as JSON.
 * @property {AbortSignal} [signal] Cancels this caller's request.
 * @property {number} [timeoutMs] Defaults to `config.httpTimeoutMs`.
 * @property {number} [retries] Retries after a network failure. Defaults to 1.
 * @property {number} [cacheTtlMs] GET only: cache the response for this long (memory + sessionStorage).
 * @property {boolean} [dedupe] GET only: share one in-flight request per URL. Defaults to true.
 */

const RETRY_DELAY_MS = 400;
const CACHE_PREFIX = 'http:';

/** @type {Map<string, { expires: number, data: unknown }>} */
const memoryCache = new Map();

/**
 * One network request, possibly shared by several callers.
 * @typedef {{ promise: Promise<any>, controller: AbortController, subscribers: number }} Flight
 */

/** @type {Map<string, Flight>} */
const inFlight = new Map();

const aborted = () => new ApiError({ code: 'aborted', messageKey: 'errors.unknown' });

/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string} key
 * @returns {unknown} Cached data, or undefined on a miss.
 */
function readCache(key) {
  const now = Date.now();
  let entry = memoryCache.get(key);
  if (!entry) {
    entry = session.get(CACHE_PREFIX + key) ?? undefined;
    if (entry) memoryCache.set(key, entry);
  }
  if (!entry) return undefined;
  if (entry.expires <= now) {
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
  session.set(CACHE_PREFIX + key, entry); // Best effort: a full sessionStorage is not an error.
}

/** Drop every cached response (used by "Reset demo data"). */
export function clearHttpCache() {
  memoryCache.clear();
  for (const key of session.keys()) {
    if (key.startsWith(CACHE_PREFIX)) session.remove(key);
  }
}

/**
 * Build an ApiError from a non-2xx response. A backend may send
 * `{ "error": { "code": "...", "message_key": "..." } }` to choose the message.
 * @param {Response} response
 * @returns {Promise<ApiError>}
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

  return new ApiError({
    code: typeof body?.error?.code === 'string' ? body.error.code : code,
    status,
    messageKey: typeof body?.error?.message_key === 'string' ? body.error.message_key : messageKey,
  });
}

/**
 * One fetch attempt with a timeout.
 * @param {string} url
 * @param {RequestInit} init
 * @param {AbortSignal} signal Aborted when every caller has cancelled.
 * @param {number} timeoutMs
 */
async function attempt(url, init, signal, timeoutMs) {
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
    if (response.status === 204) return null;
    const text = await response.text();
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
 * Run a request, retrying once (by default) after a network failure.
 * @param {string} url
 * @param {RequestInit} init
 * @param {AbortSignal} signal
 * @param {number} timeoutMs
 * @param {number} retries
 */
async function execute(url, init, signal, timeoutMs, retries) {
  for (let tries = 0; ; tries += 1) {
    try {
      return await attempt(url, init, signal, timeoutMs);
    } catch (error) {
      const retryable = error instanceof ApiError && error.code === 'network';
      if (!retryable || tries >= retries) throw error;
      await delay(RETRY_DELAY_MS);
    }
  }
}

/**
 * Attach a caller to a flight. Each caller can cancel on its own; the network
 * request is only aborted once every caller has cancelled.
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
 * Fetch JSON. The only place in the app (with providers/) that touches the network.
 * Throws {@link ApiError}; check {@link isAbort} before showing an error.
 * @param {string} url
 * @param {RequestOptions} [options]
 * @returns {Promise<any>} Parsed JSON, or null for an empty response.
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
  } = options;

  const verb = method.toUpperCase();
  const isGet = verb === 'GET';
  const key = `${verb} ${url}`;

  if (signal?.aborted) return Promise.reject(aborted());

  if (isGet && cacheTtlMs > 0) {
    const cached = readCache(key);
    if (cached !== undefined) return Promise.resolve(cached);
  }

  // A flight whose callers all cancelled is already aborting: start a fresh one instead.
  const shared = isGet && dedupe ? inFlight.get(key) : undefined;
  if (shared && !shared.controller.signal.aborted) return subscribe(shared, signal);

  /** @type {RequestInit} */
  const init = { method: verb, headers: { Accept: 'application/json', ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json', ...init.headers };
  }

  const controller = new AbortController();
  /** @type {Flight} */
  const flight = { controller, subscribers: 0, promise: Promise.resolve() };
  flight.promise = execute(url, init, controller.signal, timeoutMs, retries)
    .then((data) => {
      if (isGet && cacheTtlMs > 0) writeCache(key, data, cacheTtlMs);
      return data;
    })
    .finally(() => {
      if (inFlight.get(key) === flight) inFlight.delete(key);
    });
  // Callers that cancelled no longer listen; keep their rejection from surfacing as unhandled.
  flight.promise.catch(() => {});

  if (isGet && dedupe) inFlight.set(key, flight);
  return subscribe(flight, signal);
}

/**
 * GET JSON.
 * @param {string} url
 * @param {Omit<RequestOptions, 'method' | 'body'>} [options]
 */
export function getJson(url, options = {}) {
  return request(url, { ...options, method: 'GET' });
}

/**
 * Send a JSON body with POST, PUT, PATCH or DELETE.
 * @param {'POST' | 'PUT' | 'PATCH' | 'DELETE'} method
 * @param {string} url
 * @param {unknown} [body]
 * @param {Omit<RequestOptions, 'method' | 'body'>} [options]
 */
export function sendJson(method, url, body, options = {}) {
  return request(url, { ...options, method, body });
}

/**
 * Append query parameters to a URL, skipping empty values.
 * @param {string} url
 * @param {Record<string, string | number | boolean | null | undefined>} params
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
