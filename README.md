# Library

A library book-booking web app. Readers browse a catalog and reserve books for a date range;
admins manage books and users and generate reports. English and Armenian, light and dark themes.

Built with **vanilla HTML, CSS and JavaScript**: no framework, no preprocessor, no build step.
The full specification is in [FRONTEND_BRIEF.md](FRONTEND_BRIEF.md).

## Run it

The app is plain static files. Serve the repository root with any static file server:

```bash
python -m http.server 8000
```

```bash
npx serve .
```

or use the VS Code **Live Server** extension. Then open <http://localhost:8000/design.html>.

> **Opening the files directly (`file://`) does not work.** Browsers block ES modules, `fetch`
> and the SVG icon sprite on `file://` URLs, so a local server is required.

Note for `python -m http.server`: it serves `.woff2` as `application/octet-stream`. Browsers
still load the fonts; a production server should send `font/woff2`.

## Build status

The app is built in eight phases (see the brief, "Build order").

| # | Phase | Status |
|---|---|---|
| 1 | Foundation: tokens, fonts, theme, core helpers, i18n engine, icon sprite | Done |
| 2 | Data layer: types, mappers, providers, services, API contract | Not started |
| 3 | Primitives: every component, shown in `design.html` | Not started |
| 4 | Shell: navbar, footer, auth state, guards, toasts, 404 | Not started |
| 5 | Public pages: Home, Catalog, Book detail and booking | Not started |
| 6 | Auth pages: Login, Register | Not started |
| 7 | Admin: Books, Users, Reports | Not started |
| 8 | Polish: states, keyboard, contrast, responsive, key parity | Not started |

Right now the only page is `design.html`, the dev-only style guide (Foundations section).
Demo accounts and the steps for switching to the real backend are documented with Phase 2.

## Project structure

```
design.html            dev-only living style guide (not linked from the nav)
assets/
  fonts/               self-hosted variable woff2 + their OFL licenses
  icons/sprite.svg     Lucide icons as <symbol>s
  img/                 logo.svg, favicon.svg
css/
  index.css            tokens, @font-face, reset, base, typography, layout, utilities
  components/          one file per component
  pages/               page-specific layout only
i18n/translations.json ALL user-facing text, both languages
js/
  config.js            data source switch, base URLs, feature flags
  theme-init.js        classic script in <head>; sets data-theme before paint
  core/                dom, i18n, url-state, storage, events, a11y, format, date, validate, http, theme, paths
  components/          UI components: functions returning DOM elements
  pages/               one entry module per HTML page
```

## Conventions

- **Tokens only.** Component and page CSS never hard-code a colour, font size, shadow or radius;
  every value is a custom property from `css/index.css`.
- **No `innerHTML`.** DOM is built with `h()` from `js/core/dom.js`; text is always inserted as text.
- **No hard-coded text.** HTML carries `data-i18n` keys; JS calls `t('key')`. Add every string to
  both `en` and `hy` in `i18n/translations.json`. `design.html` reports any key missing from one
  language.
- **Dates** are calendar dates stored as ISO strings (`"2026-10-15"`); weeks start on Monday.
- **Network access** goes through `js/core/http.js`; UI code will only import from `js/services/`.
- No code file is longer than 500 lines (`css/index.css` is the one exception).

## Dev tooling (optional)

Prettier and ESLint are dev-only and never ship to the browser. They need Node.js 20.19 or newer:

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

Everything third-party is vendored at a pinned version; nothing is loaded from a CDN at runtime.

| What | Version | License |
|---|---|---|
| Inter (variable) | 4.1 | SIL OFL 1.1 |
| Source Serif 4 (variable) | 4.005 | SIL OFL 1.1 |
| Noto Sans Armenian, Noto Serif Armenian (variable) | Fontsource 5.3.0 | SIL OFL 1.1 |
| Lucide icons | 1.49.0 | ISC |

License texts sit next to the files in `assets/fonts/` and `assets/icons/`.
