// @ts-check
import { config } from '../config.js';
import * as httpBackend from './http-backend.js';
import * as localDb from './local-db.js';
import * as openLibrary from './openlibrary.js';

const useBackend = config.dataSource === 'backend';

/** Book metadata: search, detail, trending, subjects, ISBN lookup. */
export const catalog = useBackend
  ? httpBackend
  : {
      ...openLibrary,
      /** @type {typeof openLibrary.getBook} */
      getBook: (id, options) =>
        openLibrary.isWorkId(id) ? openLibrary.getBook(id, options) : localDb.getStoredBook(id),
    };

/** Everything the library itself owns: auth, users, bookings, inventory, reports. */
export const library = useBackend ? httpBackend : localDb;

/** Demo-data tools exist only while the app runs on local seed data. */
export const demo = useBackend ? null : { reset: localDb.resetDatabase, counts: localDb.getCounts };
