# Architecture

A multi-page app in plain HTML, CSS and JavaScript. Each page is one HTML file with one small
entry module. Nothing is compiled or bundled: what is in the repository is what the browser runs.

## Layers

```
pages, components   →   services   →   providers   →   network or local seed data
                                          ↑
                              mappers turn every response into the shapes in js/types.js
```

| Layer | Folder | Rule |
|---|---|---|
| Pages | `js/pages/` | One entry module per HTML page. Owns that page's state. |
| Components | `components/<Name>/` | `Name.html` (markup), `Name.css` (styles), `Name.js` (behaviour). |
| Services | `js/services/` | The only data API the UI may import. Never calls `fetch`. |
| Providers | `js/providers/` | Adapters to a data source. The only code that knows where data lives. |
| Mappers | `js/mappers/` | Raw API shapes to domain types and back (`snake_case` ↔ `camelCase`). |
| Core | `js/core/` | Shared helpers: DOM, templates, i18n, HTTP, dates, validation, storage, a11y. |

## Data sources

`dataSource` in `js/config.js` picks the providers (`js/providers/index.js`):

| `dataSource` | Book metadata (`catalog`) | Library data (`library`) |
|---|---|---|
| `'external'` (now) | `openlibrary.js`: Open Library search, works, trending, subjects, covers | `local-db.js`: auth, users, bookings, inventory, reports in `localStorage` |
| `'backend'` (later) | `http-backend.js` | `http-backend.js` |

All three providers export the same function names with the same return types, so the services
do not change when the source does.

**Switching to the real backend:** set `dataSource: 'backend'` and `backendBaseUrl` in
`js/config.js`. The backend must implement [API_CONTRACT.md](API_CONTRACT.md). No other file changes.

### What the Catalog searches

Open Library has no "all books" query, and a search that only names a year range times out.
So a Catalog view without a search text, category, genre or author starts from the books that
are trending this week; anything that narrows the search runs against all of Open Library.
Paging stops after 500 pages (10,000 results), which is as far as Open Library pages reliably.

| Sort option | Open Library `sort` |
|---|---|
| Relevance | none (its default ranking) |
| Title A–Z | `title` |
| Newest | `new` |
| Trending | `trending` |

The Authors filter has no list of its own, because Open Library returns no facet counts: it
offers the authors of the books found so far for the current search.

### How a book gets its availability

Open Library knows a book's metadata; only the library knows how many copies it holds.
`services/books.js` asks the catalog provider for books, then passes them to
`library.withAvailability()`, which adds `copies`, `availableCopies` and `availability`. Values an
admin has edited in the inventory win over Open Library's. With the backend, the API already
returns these fields, so `withAvailability()` there returns the books unchanged.

### The local store

`js/providers/local/` plays the part of the server and its database while there is no backend:

- One `localStorage` entry (`library:db`) holds the `books`, `users`, `bookings` and `sessions`
  tables. Rows are `snake_case`, exactly as the backend will store them.
- First run seeds it from `data/seed/*.json`. Booking dates in the seed are relative to an anchor
  date and are moved to "today", so the demo always has past, current and upcoming bookings.
- It enforces the same rules the backend will: booking limits, unique emails, role checks.
- "Reset demo data" on `design.html` restores the seed.

## Security notes for the backend

- **The frontend's role checks are for user experience only.** Hiding the Admin link and guarding
  `admin/*.html` in the browser stops nobody who edits `localStorage`. The backend must check the
  session and the role on every request, and must enforce every booking rule itself.
- Passwords: the mock stores an unsalted SHA-256. A real backend must use bcrypt or argon2.
- All API and user text reaches the page as text nodes (`textContent`, `h()`), never as HTML.
- `returnTo` after login only accepts same-origin relative paths (`safeReturnTo` in
  `js/core/url-state.js`).

## Components

A component is a folder:

```
components/Icon/
  Icon.html   the markup, with data-i18n keys instead of text
  Icon.css    the styles, tokens only
  Icon.js     loads Icon.html once, returns a fresh copy per call, adds behaviour
```

`Name.js` loads its HTML file through `loadTemplate()` (`js/core/template.js`) and exports a
function that returns a DOM element. `css/index.css` imports every component stylesheet.

Text is passed to components either as a final string (a book title) or as a translation key:
`{ key: 'common.save' }`. A key stays bound to its element (`data-i18n`), so switching the
language re-translates every component on the page without re-rendering it.

`LanguageSwitch` and `ThemeToggle` have no markup or styles of their own (they are built from
`Button`), so their folders hold only a `.js` file.

## The page shell

Every page's HTML holds only its own `<main id="main">`. Its entry module starts with

```js
await mountShell({ page: 'catalog', access: 'public' });
```

`mountShell()` (`js/shell.js`) does the following, in this order:

1. Applies the theme.
2. Checks access (`js/guards.js`). A visitor who may not see the page is redirected before
   anything is rendered, and the call never returns.
3. Loads the translations.
4. Puts the skip link, `Navbar`, `Footer` and the toast region around `<main>`.
5. Shows a message the previous page left behind (`js/core/flash.js`), for example
   "You've been logged out" after a redirect.
6. Asks the server whether the stored session is still valid (`refreshSession()`).

It then keeps listening to `auth:change`: the navbar follows the session, and the access check
runs again, so logging out in one tab also leaves a protected page in the others.

| `access` | Who may open the page | Everyone else goes to |
|---|---|---|
| `public` | anyone | – |
| `guest` | visitors who are not logged in (Login, Register) | Home |
| `user` | any logged-in user | Login, which returns here afterwards |
| `admin` | admins | guests to Login; members to Home with a "no permission" message |

`requireLogin()` does the same for a single action, such as booking a book.

## State in the address

What a page shows is decided by its query string, so a view can be reloaded, bookmarked and
shared, and Back and Forward restore it exactly (`js/core/url-state.js`).

- **Catalog:** `q`, `category`, `authors`, `genres`, `yearFrom`, `yearTo`, `sort`, `page`.
  Every change writes the address first and loads the results from it
  (`js/pages/catalog/state.js`).
- **Book:** `id`, plus `from` and `to` while dates are chosen. That is how the dates survive the
  trip to the login page and back.

## Shared state

Session, theme and language live in `localStorage` (`js/core/storage.js`) and are announced with
`CustomEvent`s on `document`: `auth:change`, `theme:change`, `lang:change`. A change made in
another tab is re-announced, so open tabs stay in sync.

## Internationalization

All user-facing text is in `i18n/translations.json`. HTML carries `data-i18n` keys; JS calls
`t('key')`. Errors travel as keys too (`ApiError.messageKey`), so backend errors are translated
the same way. Chromium has no `Intl` date and number data for Armenian, so `js/core/format.js`
falls back to the month names and patterns in the translations file there.

## Network

Every request goes through `js/core/http.js`: timeout, cancellation with `AbortController`,
one retry after a network failure, de-duplication of identical in-flight GETs, and a
10-minute cache for Open Library responses.
