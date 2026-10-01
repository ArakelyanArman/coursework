# Library

A library book-booking web app. Readers browse a catalog and reserve books for a date range;
admins manage books and users and generate reports. English and Armenian, light and dark themes.

Built with **plain HTML, CSS and JavaScript**: no framework, no preprocessor, no build step.

## Run it

You need a modern browser (Chrome, Edge, Firefox or Safari) and an internet connection, because
book data and covers come from Open Library. **Nothing has to be installed on Windows.**

### Windows

1. Download or clone this folder to the computer.
2. Open the folder in File Explorer.
3. Double-click **`start.bat`**.
4. A black window opens and your browser opens the app at <http://localhost:3000>.
5. Keep the black window open while you use the app.
6. To stop, close that window (or press `Ctrl+C` in it).

If port 3000 is already used by another program, the script picks the next free port and prints
the address to open, for example `http://localhost:3001`. To choose a port yourself:

```bash
start.bat 8080
```

`start.bat` uses PowerShell, which is part of Windows. If Windows asks whether to allow it, choose
**Run**.

### macOS and Linux

1. Open a terminal in this folder.
2. Run:

```bash
sh start.sh
```

3. The browser opens <http://localhost:3000>. Press `Ctrl+C` in the terminal to stop.

The script uses whichever of Python, Ruby, PHP or Node.js is already on the computer.

### Other ways

Any static file server works. From this folder:

```bash
python -m http.server 3000
```

```bash
npx serve -l 3000 .
```

or right-click `design.html` in VS Code and choose **Open with Live Server**.

### Why a server is needed

Opening the HTML files by double-clicking them (`file://` addresses) does **not** work: browsers
block JavaScript modules and data files loaded that way. The start scripts above run a tiny local
server so the app is served from `http://localhost`, which is all it needs.

## Demo accounts

Users, bookings and the library's holdings are demo data kept in your browser.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@library.am` | `LibraryAdmin1` |
| Member | `member@library.am` | `LibraryMember1` |

The other seed users (see `data/seed/users.json`) share the member password.

To start over, open `design.html`, scroll to **Demo data** and press **Reset demo data**.

## What works today

| Part | Status |
|---|---|
| Design tokens, fonts, themes, language switch, core helpers | Done |
| Data layer: Open Library, local demo store, services, backend adapter | Done |
| Components: buttons, fields, chips, calendar, book cards, table, dialogs, toasts | Done |
| Navigation shell (navbar, footer, sign-in state, 404) | Next |
| Home, Catalog, Book page, Login, Register, Admin | After that |

Until the pages are built, the start scripts open `design.html`, the style guide. It shows every
component in every state; switch the language and the theme in its top bar.

## Project structure

```
start.bat, start.sh     start a local server on port 3000
design.html             style guide (not linked from the app navigation)
components/             one folder per component: Name.html, Name.css, Name.js
  Button/  TextField/  Select/  Checkbox/  SearchField/  Chip/  Tabs/  Badge/  Avatar/
  Calendar/  DateField/  FilterAccordion/  Pagination/  DataTable/  Dialog/  Toast/  Tooltip/
  Banner/  EmptyState/  Skeleton/  BookCover/  BookCard/  BookListItem/  Icon/
assets/
  fonts/                self-hosted variable fonts and their licenses
  icons/sprite.svg      Lucide icons
  img/                  logo and favicon
css/
  index.css             design tokens, fonts, reset, base, typography, utilities
  pages/                page-specific layout
i18n/translations.json  all user-facing text, English and Armenian
data/seed/              demo inventory, users and bookings
js/
  config.js             data source switch and base URLs
  types.js              data shapes: Book, User, Booking, Report
  core/                 dom, template, i18n, http, date, format, validate, storage, events, a11y
  services/             the data API the pages use: books, bookings, auth, users, reports
  providers/            openlibrary, local-db, http-backend
  mappers/              API shapes to app shapes and back
  pages/                one entry module per HTML page (design/ holds the style guide's sections)
docs/
  ARCHITECTURE.md       how the layers fit together
  API_CONTRACT.md       the REST API a real backend must implement
tools/server.ps1        the local server used by start.bat
```

## Switching to a real backend

The app currently reads books from Open Library and keeps everything else in the browser.
To use a real backend instead, change one line in `js/config.js`:

```js
dataSource: 'backend',
```

and set `backendBaseUrl`. The backend must implement [docs/API_CONTRACT.md](docs/API_CONTRACT.md).
No other file changes; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Conventions

- **Tokens only.** Styles never hard-code a colour, font size, shadow or radius; every value is a
  custom property from `css/index.css`.
- **No `innerHTML`.** Text always reaches the page as text, never as HTML.
- **No hard-coded text.** HTML carries `data-i18n` keys and JS calls `t('key')`. Every string is in
  both `en` and `hy` in `i18n/translations.json`; `design.html` reports any key missing from one.
- **Dates** are calendar dates stored as `"2026-10-15"`; weeks start on Monday.
- Pages talk to `js/services/` only. Network requests go through `js/core/http.js`.
- No code file is longer than 500 lines (`css/index.css` is the one exception).

## Optional developer tools

Prettier and ESLint check formatting and code quality. They are not needed to run the app and
never reach the browser. They need Node.js 20.19 or newer:

```bash
npm install
```

```bash
npm run lint
```

```bash
npm run format
```

## Third-party files

Everything third-party is stored in this repository at a fixed version; nothing is loaded from a
CDN while the app runs.

| What | Version | License |
|---|---|---|
| Inter (variable) | 4.1 | SIL OFL 1.1 |
| Source Serif 4 (variable) | 4.005 | SIL OFL 1.1 |
| Noto Sans Armenian, Noto Serif Armenian (variable) | Fontsource 5.3.0 | SIL OFL 1.1 |
| Lucide icons | 1.49.0 | ISC |

License texts sit next to the files in `assets/fonts/` and `assets/icons/`.
Book data and covers: [Open Library](https://openlibrary.org).
