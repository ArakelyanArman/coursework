# FRONTEND_BRIEF.md — Library App

> **How to use this file:** Put it in the repo root. Then start Claude Code with:
> *"Read FRONTEND_BRIEF.md fully, then follow Part 1 step by step. Ask me before deviating from it."*
>
> Part 1 is the prompt (what to build and how). Part 2 is the design system (the source of truth for every visual decision). Part 3 is the page-by-page spec.

---

# PART 1 — Prompt for Claude Code

## Role & goal
You are a senior frontend engineer. Build the complete frontend for a **library book-booking web app**. Users browse a catalog and reserve books for a date range. Admins manage books and users and generate reports.

The original wireframes were grey and unstyled. This brief replaces their visual language with a new design system (Part 2). You MUST keep the **layout structure, page inventory, and user flow** of the wireframes (Part 3). Change the look, not the shape.

This is a university project with hard constraints (below). It must still look and behave like a **real, shippable product**.

## Hard constraints (from the university — never violate)
1. **Vanilla HTML, CSS, and JavaScript only.**
   - No UI frameworks or meta-frameworks: no React, Vue, Svelte, Angular, Alpine, jQuery, or htmx.
   - No CSS frameworks or preprocessors: no Tailwind, Bootstrap, Sass, or PostCSS.
   - No TypeScript. Use modern JavaScript (ES2022+) with native ES modules (`<script type="module">`) and JSDoc types.
   - No build step is required to run the app. It must run from any static file server (`npx serve .`, `python -m http.server`, VS Code Live Server). It will not work from `file://`; say so in the README.
   - **Allowed exceptions:** single-purpose JavaScript libraries such as Chart.js (Reports) or three.js. Vendor them into `assets/vendor/` at a pinned version. Do not load them from a CDN at runtime. Ask me before adding any library not listed here.
   - Dev-only tooling that never ships to the browser (Prettier, ESLint) is fine.
2. **No code file over 500 lines.** The only exceptions are `css/index.css` and shared component files. Even for those, split when it improves clarity. Data files (`translations.json`, seed JSON) are not code and are exempt.
3. **Internationalization: English and Armenian.** All user-facing text lives in **one file**, `i18n/translations.json`. There are no hard-coded user-facing strings in HTML or JS. See "i18n" below.
4. **Real product, real content.** No lorem ipsum, no "Book Title 1", no placeholder or stock images, no grey boxes. Book data and covers come from real APIs. Users and bookings come from realistic seed data. Any number shown in the UI (such as "128 books") must come from data; if no real number exists, don't show one.
5. **Frontend only, backend-ready.** A backend (PHP, Python, or Node.js) with PostgreSQL will replace the external APIs later. Swapping must only touch the provider layer and `js/config.js`. See "Data architecture".

## Project structure
Use a **multi-page app (MPA)**: one HTML file per page, each with its own small entry module. This works on any static server, keeps query strings as real URL state, and maps cleanly onto a future PHP/Python/Node backend.

```
/
├── index.html              # Home
├── catalog.html            # ?q=&category=&authors=&genres=&yearFrom=&yearTo=&sort=&page=
├── book.html               # ?id=OL45883W
├── login.html              # ?returnTo=
├── register.html
├── 404.html
├── design.html             # dev-only living style guide (not linked from the nav)
├── admin/
│   ├── index.html          # redirects to books.html
│   ├── books.html
│   ├── reports.html
│   └── users.html
├── assets/
│   ├── fonts/              # self-hosted woff2 (see Part 2 §2)
│   ├── icons/sprite.svg    # Lucide icons as <symbol>s, used via <svg><use href="…#name"/></svg>
│   ├── img/                # logo.svg, favicon.svg, apple-touch-icon.png, og-image.png (real, designed)
│   └── vendor/             # chart.umd.min.js (pinned)
├── css/
│   ├── index.css           # tokens, @font-face, reset, base, typography, layout, utilities; @imports the rest
│   ├── components/         # one file per component (button.css, field.css, calendar.css, …)
│   └── pages/              # page-specific layout only (catalog.css, book.css, …)
├── i18n/
│   └── translations.json   # ALL user-facing text, both languages
├── data/seed/
│   ├── inventory.json      # library holdings: Open Library work IDs + copies
│   ├── users.json          # 15+ realistic users (Armenian and international names)
│   └── bookings.json       # bookings referencing real inventory IDs and seed users
├── js/
│   ├── config.js           # data source switch, base URLs, feature flags
│   ├── theme-init.js       # classic (non-module) script in <head>; sets data-theme before paint
│   ├── types.js            # JSDoc @typedefs: Book, User, Booking, Category, ReportRow, ApiError
│   ├── core/               # dom.js (h() element helper), i18n.js, url-state.js, storage.js,
│   │                       # events.js, a11y.js (focus trap, roving tabindex), format.js (Intl),
│   │                       # date.js, validate.js, http.js (fetch wrapper: timeout, abort, retry, cache)
│   ├── components/         # UI components: render functions returning HTMLElements
│   ├── services/           # domain API the UI calls: books.js, bookings.js, auth.js, users.js, reports.js
│   ├── providers/          # adapters: openlibrary.js, local-db.js, http-backend.js
│   ├── mappers/            # raw API shapes → domain types (and back)
│   └── pages/              # one entry module per HTML page: home.js, catalog.js, book.js, …
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_CONTRACT.md     # REST contract the future backend must implement
└── README.md               # how to run, demo accounts, how to switch to the real backend
```

## Code conventions
- **Components** are plain functions that take props and return a DOM element, such as `BookCard({ book }) → HTMLElement`. Build DOM with a tiny `h(tag, attrs, ...children)` helper in `core/dom.js`. Do not use Shadow DOM; it would block the global tokens and utility classes.
- **Never put API or user data into `innerHTML`.** Use `textContent` or `h()`. Static SVG icon markup is the only place `innerHTML` is allowed. This prevents XSS now and after the backend lands.
- **No inline event handlers** (`onclick=""`) and no inline styles except CSS custom-property hooks like `style="--cover-hue: 210"`. Keep the app CSP-friendly.
- **Accessible patterns are hand-built**, following the WAI-ARIA Authoring Practices Guide:
  - Dialog: use native `<dialog>` with `showModal()`.
  - Use the APG patterns for Accordion, Tabs, Menu Button, Date Picker Dialog, and Toast (live region).
  - Put shared helpers (focus trap, focus return, roving tabindex, Esc handling) in `core/a11y.js`.
- **Validation:** a small schema-style validator in `core/validate.js` that returns i18n keys, not English sentences.
- **Dates:** a small helper module in `core/date.js`. Booking dates are calendar dates stored as ISO strings (`"2026-10-15"`), never timestamps, to avoid timezone bugs. Weeks start on Monday in both languages.
- **State:** each page owns its state. Shared state (session, theme, language) lives in `core/storage.js` and is broadcast with `CustomEvent`s on `document` (`auth:change`, `theme:change`, `lang:change`).
- **Formatting:** Prettier and ESLint (flat config) as dev dependencies. Use JSDoc on all exported functions. Add `// @ts-check` at the top of JS files so editors type-check against `types.js`.
- **Naming:** kebab-case file names, camelCase JS, BEM-like CSS classes (`.book-card__title`, `.btn--primary`).

## i18n
- `i18n/translations.json` holds both languages, nested by area:
  ```json
  {
    "en": {
      "nav": { "home": "Home", "catalog": "Catalog", "login": "Log in", "admin": "Admin" },
      "catalog": { "resultCount": { "one": "{count} book", "other": "{count} books" } }
    },
    "hy": {
      "nav": { "home": "Գլխավոր", "catalog": "Կատալոգ", "login": "Մուտք", "admin": "Ադմին" },
      "catalog": { "resultCount": { "one": "{count} գիրք", "other": "{count} գիրք" } }
    }
  }
  ```
- `core/i18n.js` exposes:
  - `t(key, params)` with `{name}` interpolation.
  - Plurals via `Intl.PluralRules`.
  - `setLanguage(lang)`.
  - `applyTranslations(root)`, which fills `[data-i18n]` text and `[data-i18n-attr="placeholder:key;aria-label:key"]` attributes.
- Static HTML contains keys, not text. Load translations before first render. Preload the JSON with `<link rel="preload" as="fetch" crossorigin>` so there's no flash of empty text.
- **Language choice:**
  - Default follows `navigator.language` (`hy*` → Armenian, otherwise English).
  - The choice persists in `localStorage`.
  - Set `<html lang="en|hy">`.
  - Switching re-renders in place via `lang:change`; no reload.
- **Formatting:** dates and numbers use `Intl.DateTimeFormat` / `Intl.NumberFormat` with `en-US` or `hy-AM`. Typed dates accept `MMM d, yyyy` in English and `DD.MM.YYYY` in Armenian.
- **Missing keys** fall back to English and log a dev-only warning. Add a dev check (in `design.html` or a tiny Node script) that fails when key sets differ between `en` and `hy`.
- **Translation scope:** translate all UI chrome, category names, error messages, emails in seed data are left as-is. Book titles, authors, and descriptions from APIs stay in their original language.
- **Layout robustness:** Armenian strings are often 20–40% longer. Never fix the width of buttons, tabs, or chips. Test every page in both languages at 360 px.

## Data architecture
```
UI (pages, components) → services/ → providers/ → network or local seed
                                     ↑ mappers/ normalize every response into types.js shapes
```
- UI code imports **only** from `services/`. Services never call `fetch` directly.
- `js/config.js` selects the provider:
  ```js
  export const config = {
    dataSource: 'external',          // 'external' now → 'backend' later
    backendBaseUrl: '/api',
    openLibraryBaseUrl: 'https://openlibrary.org',
    coversBaseUrl: 'https://covers.openlibrary.org',
    localLatencyMs: [300, 600],      // simulated latency for local-db only
  };
  ```
- **Providers for now:**
  - `providers/openlibrary.js` handles book search, book detail, trending, and subject rails (Open Library needs no API key and allows CORS):
    - Search: `/search.json` with `q`, `subject`, `author`, `page`, `limit`, `fields`, and `sort`.
    - Detail: `/works/{id}.json` and `/authors/{id}.json`.
    - Trending: `/trending/weekly.json`.
    - Classics and categories: `/subjects/{subject}.json`.
    - Covers: `covers.openlibrary.org/b/id/{cover_i}-M.jpg` (or `-L` on the detail page).
    - Verify each endpoint's response shape before writing its mapper.
  - `providers/local-db.js` handles everything no public API offers: auth, users, bookings, library inventory (copies per book), and admin edits. It is a `localStorage`-backed store seeded from `data/seed/*.json` on first run, with simulated latency and a "Reset demo data" action on `/design`.
  - **Combining them:** the book service merges Open Library metadata with local inventory (copies, availability). Inventory is keyed by Open Library work ID.
- **Provider for later:** `providers/http-backend.js` implements the same function signatures against the REST contract in `docs/API_CONTRACT.md`. Write the contract now. List every endpoint the UI needs, for example:
  - `GET /api/books?q=&category=&page=`
  - `GET /api/books/:id`
  - `GET /api/books/:id/unavailable-dates`
  - `POST /api/bookings`
  - `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me`
  - Admin CRUD for books and users
  - `GET /api/reports/:type?from=&to=`

  For each endpoint, document the request, response, and error shapes. Stub every function in this provider with a clear `TODO` and the endpoint it maps to.
- **Database-friendly shapes:**
  - IDs are strings.
  - Dates are ISO 8601.
  - Field names map 1:1 to future PostgreSQL columns: snake_case in the API, camelCase in JS, converted in `mappers/`.
  - Roles are `'member' | 'admin'`.
  - Booking `status` is `'active' | 'returned' | 'cancelled' | 'overdue'`.
- **Errors:** providers throw `ApiError { code, status, messageKey }`. The UI shows `t(messageKey)`, so backend errors are translatable too.
- **Network hygiene (`core/http.js`):**
  - Timeouts.
  - `AbortController`, so typing a new search cancels the stale request.
  - Deduplicate in-flight requests.
  - Memory plus `sessionStorage` cache with a 10-minute TTL for Open Library GETs.
  - One retry on network failure.
- **Auth in the mock:**
  - Session token stored in `localStorage`; passwords stored as SHA-256 via `crypto.subtle` (mock only).
  - Document demo accounts in the README, e.g. `admin@library.am` and `member@library.am`.
  - Client-side route guards are UX only. Note in `ARCHITECTURE.md` that the backend must enforce roles.
- **Seed data quality:**
  - `inventory.json`: 40+ real Open Library works, mixing world classics, contemporary titles, and Armenian literature (e.g. Raffi, Hovhannes Tumanyan, William Saroyan).
  - `users.json`: 15+ users with realistic Armenian and international names and plausible emails on `example.com`/`example.am` domains.
  - `bookings.json`: spans the past 3 months and the next month so Reports and booked dates have real content.

## Non-negotiable rules
1. **Tokens only.**
   - Never hard-code a hex value, px font size, shadow, or radius in component CSS or JS. Every visual value comes from the CSS custom properties in Part 2.
   - If you need a value that doesn't exist, add a token to `index.css` and tell me.
2. **Accessibility: WCAG 2.2 AA.**
   - Use semantic HTML and landmarks (`header`, `nav`, `main`).
   - Add a "Skip to content" link.
   - Show a visible `:focus-visible` ring on every interactive element.
   - Give every icon-only button an `aria-label` (translated).
   - Associate each form label with its input and link errors via `aria-describedby`.
   - Make the whole UI work by keyboard alone.
   - Hit targets must be at least 40×40 px (24×24 absolute minimum for dense admin icons, with spacing).
   - Respect `prefers-reduced-motion`.
3. **Responsive.** Build mobile-first. Everything must work from 360 px to 1920 px wide, in both languages. The wireframes are 1440 px desktop; Part 3 says how each page collapses.
4. **Every async view has four states:** loading (skeletons, not spinners, for content), empty, error (with retry), and success.
5. **URL is state.**
   - Catalog search, filters, category, sort, and page live in query params (`core/url-state.js`, using `history.replaceState`/`pushState` and `popstate`).
   - Admin sections are separate pages.
6. **Auth and roles.**
   - Guests see "Log in". Logged-in users see a user menu (name + Log out).
   - "Admin" appears in the nav **only for admins**.
   - Every `admin/*.html` entry module runs a role guard before rendering anything.
   - Booking requires login. Redirect to `login.html?returnTo=…` and come back after login. Only accept same-origin relative `returnTo` values.
7. **No placeholders.**
   - Covers come from Open Library. When a work has no cover, use `?default=false`, catch the 404, and render the designed typographic BookCover fallback (Part 2 §9). This is a design element, not a placeholder.
   - Avatars are initials.
   - The logo, favicon, and OG image are real designed SVG/PNG assets.
8. **Quality.**
   - Compose small modules. No code file over 500 lines (exceptions above).
   - No console errors.
   - Pass Prettier and ESLint.
   - `design.html` (dev only) renders every component in every state, in both languages and both themes, as a living style guide.
9. **Performance.**
   - Lazy-load cover images with explicit `width` and `height`.
   - Use `font-display: swap`.
   - Preload the two main fonts and `translations.json`.
   - Only Reports loads Chart.js.

## Build order (stop after each phase, summarize, and wait for my "continue")
1. **Foundation:**
   - Folder structure and README.
   - `index.css` with tokens (Part 2 §1–§7), `@font-face`, reset, base, typography, and utilities.
   - Theme init and switch: light is default, follows the system preference, and the choice persists.
   - `core/` helpers.
   - i18n engine plus the `translations.json` skeleton.
   - Icon sprite.
2. **Data layer:**
   - `types.js` and mappers.
   - The `openlibrary` and `local-db` providers with seed files.
   - Services.
   - The `http-backend` stub.
   - `docs/API_CONTRACT.md` and `docs/ARCHITECTURE.md`.
   - A quick console smoke test of every service.
3. **Primitives:** everything in Part 2 §9, plus `design.html`.
4. **Shell:** navbar (desktop + mobile drawer, language switch, theme toggle, user menu), footer, auth state, guards, toasts, 404.
5. **Public pages:** Home, Catalog, Book detail + booking.
6. **Auth pages:** Login, Register.
7. **Admin:** Books, Users, Reports (with Chart.js).
8. **Polish:**
   - Empty/error states.
   - Keyboard pass and contrast pass.
   - Lighthouse a11y ≥ 95.
   - Responsive pass at 360 / 768 / 1024 / 1440 in **both** languages.
   - Translation key parity check.

## Definition of done
- All pages in Part 3 exist and match their layout descriptions.
- The flow Home → Catalog → Book → Book it works end to end with real Open Library data.
- The flow Login → (admin) Admin → Books / Users / Reports works end to end.
- Switching EN ⇄ HY translates every visible string, including `aria-label`s, validation messages, toasts, dates, and numbers.
- No framework code anywhere. The only third-party code is in `assets/vendor/`.
- These checks pass:
  - `grep` for `#[0-9a-fA-F]{3,6}` and raw `px` font sizes in `css/components`, `css/pages`, and `js/` returns nothing.
  - `wc -l` shows no code file over 500 lines (except the stated exceptions).
  - `grep` for `innerHTML` finds only icon helpers.
  - No `fetch(` outside `core/http.js` and `providers/`.
- Setting `dataSource: 'backend'` in `config.js` routes every call through `http-backend.js` with zero changes elsewhere.
- No console errors; lint passes.

## Open questions — do NOT invent answers; implement the stated default and list it in your summary
- **Booking rules.** Default: max 14 days per booking, no past dates, and a book whose copies are all booked by others is unavailable for those dates (show them disabled in the picker).
- **Catalog scope.** Default: Catalog searches all of Open Library. Copies come from `inventory.json`. Works not in the inventory get a default of 1 copy the first time they are viewed, and that default is saved to local inventory. Flag this to me; the real backend will likely restrict the catalog to actual holdings.
- **Reports content.** There is no wireframe. Default spec is in Part 3 §8.
- **Categories vs. Genres filter overlap.** Default: chips = top-level categories (single select), Genres = multi-select within the sidebar. Flag this to me.
- **Authors facet.** Open Library search doesn't return facet counts. Default: the Authors list is built from the current result set plus a search-in-filter input. Flag this.
- **Armenian book metadata.** Default: book content shows in its original language, and only UI chrome and category names are translated.

---

# PART 2 — Design System: "Paper & Ink"

**Concept:** Warm paper neutrals, deep ink-blue for actions, a brass accent used sparingly (highlights like "Trending"), and a serif for book titles and headings. It keeps the wireframe's soft rounded panels, top navbar band, and pill tabs, but replaces flat grey fills and hard borders with layered paper surfaces and soft shadows.

All tokens are CSS custom properties defined in `css/index.css` (see §10).

## 1. Color tokens

All pairs below meet WCAG AA. Text pairs are ≥ 4.5:1. UI boundaries and focus rings are ≥ 3:1.

### Light theme (default)
| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FBFAF7` | Page background (warm paper) |
| `--color-surface` | `#FFFFFF` | Cards, inputs, dialogs |
| `--color-surface-muted` | `#F4F1EA` | Navbar band, filter sidebar, admin row hover, tab track |
| `--color-surface-sunken` | `#ECE8DF` | Book-cover fallback, skeletons |
| `--color-border` | `#E2DDD2` | Card and divider borders (decorative) |
| `--color-border-input` | `#8C8578` | Input, checkbox, and radio boundaries (3.6:1 on white) |
| `--color-text` | `#1C1A17` | Primary text (ink) |
| `--color-text-muted` | `#6B6458` | Secondary text, author names, placeholders (≈5.5:1) |
| `--color-primary` | `#2B3A67` | Primary buttons, links, active nav, selected states (≈11:1 vs white) |
| `--color-primary-hover` | `#22305A` | Hover |
| `--color-primary-active` | `#1A2547` | Pressed |
| `--color-on-primary` | `#FFFFFF` | Text on primary |
| `--color-primary-soft` | `#E6EAF5` | Selected chip, selected admin row, active-nav background |
| `--color-on-primary-soft` | `#22305A` | Text on primary-soft |
| `--color-focus` | `#4A5FA0` | Focus ring (≥3:1 on all surfaces) |
| `--color-accent` | `#A86A1C` | Brass: decorative accents, icons, underline on section titles |
| `--color-accent-soft` | `#F8EBD6` | "Trending" / "New" badges |
| `--color-on-accent-soft` | `#6E440D` | Text on accent-soft |
| `--color-success` / `-soft` | `#1F7A4D` / `#E5F3EA` | Available, booking confirmed |
| `--color-warning` / `-soft` | `#A15C07` / `#FEF4E2` | Few copies left, due soon |
| `--color-danger` | `#B42318` | Destructive buttons, errors |
| `--color-danger-hover` | `#912018` | |
| `--color-danger-soft` | `#FDECEA` | Error banners, delete-confirm background |
| `--color-on-danger` | `#FFFFFF` | Text on danger |
| `--color-overlay` | `rgb(28 26 23 / 0.45)` | Dialog and drawer scrim |

### Dark theme (`[data-theme="dark"]`)
| Token | Hex |
|---|---|
| `--color-bg` | `#161513` |
| `--color-surface` | `#1E1C19` |
| `--color-surface-muted` | `#262420` |
| `--color-surface-sunken` | `#2E2B27` |
| `--color-border` | `#38342F` |
| `--color-border-input` | `#7A7368` |
| `--color-text` | `#F2EFE8` |
| `--color-text-muted` | `#ADA696` |
| `--color-primary` | `#A9B8EA` |
| `--color-primary-hover` | `#BCC8F0` |
| `--color-primary-active` | `#93A5E0` |
| `--color-on-primary` | `#141B33` |
| `--color-primary-soft` | `#26304F` |
| `--color-on-primary-soft` | `#D3DBF5` |
| `--color-focus` | `#A9B8EA` |
| `--color-accent` | `#E0A55A` |
| `--color-accent-soft` | `#3A2C18` |
| `--color-on-accent-soft` | `#F3D3A5` |
| `--color-success` / `-soft` | `#6CC79A` / `#1B3326` |
| `--color-warning` / `-soft` | `#E9B25E` / `#3A2C14` |
| `--color-danger` | `#F2877C` |
| `--color-danger-hover` | `#F5A097` |
| `--color-danger-soft` | `#3D1F1C` |
| `--color-on-danger` | `#2A0F0C` |
| `--color-overlay` | `rgb(0 0 0 / 0.6)` |

### Color usage rules
- Use primary for **one** main action per view. Everything else is secondary or ghost.
- The accent is never used for text on light backgrounds except through `on-accent-soft` on `accent-soft`.
- Never convey state by color alone. Pair it with an icon or text (e.g. "Available" badge has a dot and a label).

## 2. Typography

Inter and Source Serif 4 have **no Armenian glyphs**, so each stack includes a Noto Armenian fallback. The browser picks it per glyph, so mixed EN/HY text renders correctly.

- **Sans (UI, body, labels):** `"Inter", "Noto Sans Armenian", system-ui, sans-serif`.
- **Serif (display, page titles, section titles, book titles):** `"Source Serif 4", "Noto Serif Armenian", Georgia, serif`.
- **Self-hosting:** put all four fonts as variable `woff2` files in `assets/fonts/`, each with its own `@font-face` and `font-display: swap`. All four are under the SIL Open Font License; keep the license files next to them. Give the Armenian faces `unicode-range: U+0530-058F, U+FB13-FB17` so they only download when Armenian text appears.
- Use `font-feature-settings: "cv11", "ss01"` on Inter for cleaner numerals. Use tabular numerals (`font-variant-numeric: tabular-nums`) in tables, dates, and counts.
- Do not use `text-transform: uppercase` on Armenian text in long labels; it hurts readability. Limit uppercase to short English-only meta, or drop it when `lang="hy"`.

| Token | Size / line-height | Font / weight | Used for |
|---|---|---|---|
| `display` | 36 / 44 px (`2.25rem`) | Serif 600, tracking −0.01em | Home hero heading |
| `h1` | 30 / 38 | Serif 600 | Page titles (Catalog, Admin) |
| `h2` | 24 / 32 | Serif 600 | Section titles (Trending, Classics), auth card title |
| `h3` | 20 / 28 | Serif 600 | Book title in list items and detail |
| `title-sm` | 16 / 22 | Serif 600 | Book title on small cards |
| `body-lg` | 18 / 28 | Sans 400 | Book description on detail page |
| `body` | 16 / 24 | Sans 400 | Default text |
| `body-sm` | 14 / 20 | Sans 400 | Author, descriptions in list cards, table cells |
| `label` | 14 / 20 | Sans 500 | Form labels, buttons, tabs, nav links |
| `caption` | 12 / 16 | Sans 500 | Badges, meta, helper text. **Never for paragraphs** |

Define these as tokens (e.g. `--text-h1-size`, `--text-h1-line`) and utility classes (`.t-h1`). The minimum font size for any body or paragraph text is 14 px. Keep reading line length to 65–75ch at most.

## 3. Spacing (4 px base)
`--space-0: 0` · `1: 4px` · `2: 8px` · `3: 12px` · `4: 16px` · `5: 20px` · `6: 24px` · `8: 32px` · `10: 40px` · `12: 48px` · `16: 64px` · `20: 80px`

- Card padding is `space-4` on mobile and `space-5` on desktop.
- Vertical gap between sections is `space-12`.
- Form field gap is `space-5`; the label-to-input gap is `space-2`.

## 4. Radius
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Chips, checkboxes, badges, small icon buttons |
| `--radius-md` | 8px | Buttons, inputs, tabs |
| `--radius-lg` | 12px | Cards (book card, list item, admin rows) |
| `--radius-xl` | 16px | Auth card, book-detail panel, dialogs |
| `--radius-full` | 9999px | Avatars, pill tabs (the admin tab bar keeps the wireframe's pill shape) |

Book covers use `--radius-sm` so they read as physical books inside rounded cards.

## 5. Elevation
The wireframe's flat grey boxes with dark outlines become paper surfaces: a `--color-border` hairline plus a soft shadow.

| Token | Value |
|---|---|
| `--shadow-xs` | `0 1px 2px rgb(28 26 23 / 0.06)` |
| `--shadow-sm` | `0 1px 3px rgb(28 26 23 / 0.08), 0 1px 2px rgb(28 26 23 / 0.04)` |
| `--shadow-md` | `0 4px 12px -2px rgb(28 26 23 / 0.10), 0 2px 4px rgb(28 26 23 / 0.05)` |
| `--shadow-lg` | `0 16px 40px -8px rgb(28 26 23 / 0.20)` |
| `--shadow-cover` | `0 2px 4px rgb(28 26 23 / 0.12), 0 8px 16px -4px rgb(28 26 23 / 0.18)` |

- Resting cards use `shadow-xs`.
- Hovered or focused interactive cards use `shadow-md` and translate −2 px.
- Popovers and dropdowns use `shadow-md`.
- Dialogs use `shadow-lg`.
- Book covers always use `shadow-cover`.
- In dark mode, shadows use black at higher alpha and are subtle; rely on surface steps instead.

## 6. Layout & breakpoints
- **Breakpoints:** `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. Plain CSS custom properties can't be used in media queries, so document these in `index.css` and use the literal values in `@media` rules. This is the one allowed exception to "tokens only".
- **Container:** `max-width: 1280px`, centered. Side padding is 16 px below `md`, 24 px at `md`, and 32 px at `lg` and up.
- **Grid:** 12 columns with a 24 px gutter at `lg` and up (CSS Grid).
- **Navbar height:** 64 px. It is sticky with a `surface-muted` background and a bottom `border`. This replaces the wireframe's 110 px grey band.

## 7. Motion
- **Durations:** `--duration-fast: 120ms` for hover and color changes, `--duration-base: 200ms` for popovers, accordions, and tabs, `--duration-slow: 300ms` for drawers and dialogs.
- **Easing:** `--ease-out: cubic-bezier(0.2, 0, 0, 1)`.
- Under `prefers-reduced-motion: reduce`, remove transforms and keep only opacity changes.

## 8. Iconography
Use Lucide icons (ISC license), copied as SVG `<symbol>`s into `assets/icons/sprite.svg`. Include only the icons you use. Render them at 20 px with stroke 1.75 and `currentColor` through a single `Icon(name, size)` helper. Decorative icons get `aria-hidden="true"`.

| Wireframe icon | Replacement |
|---|---|
| Pen | `pencil` |
| Bin | `trash-2` |
| Eye toggle | `eye` / `eye-off` |
| Calendar | `calendar-days` |
| Dropdown arrow | `chevron-down` (rotates 180° when open) |
| "Explore >>" | `arrow-right` |

Other icons used: `book-open`, `search`, `shield`, `plus`, `x`, `check`, `circle-alert`, `info`, `inbox`, `chart-column`, `download`, `languages`, `sun`, `moon`, `menu`, `log-out`, `chevron-left`, `chevron-right`.

## 9. Components
Each component below must implement **all** listed states and appear in `design.html`. All text comes from `t()`.

### Button
- **Variants:**
  - `primary`: `primary` background, `on-primary` text.
  - `secondary`: `surface` background, `border-input` border, `text` color.
  - `ghost`: transparent; `surface-muted` background on hover.
  - `danger`: `danger` background, `on-danger` text.
  - `link`: `primary` text with underline on hover.
- **Sizes:** `sm` 32 px tall (only in dense admin rows) · `md` 40 px · `lg` 48 px. Horizontal padding: 12 / 16 / 20. Label style: `label`. Radius: `md`.
- **States:** hover, active (pressed), focus-visible, disabled (50% opacity, `not-allowed` cursor, `aria-disabled`), loading (spinner replaces the leading icon, label stays, `aria-busy`). Use `min-width` rather than a fixed width so the button never shrinks during loading but can grow for Armenian labels.
- **IconButton:** square, 40 px (32 px `sm`). It requires an `aria-label` and shows a tooltip on hover and focus.

### Focus ring (global)
`outline: 2px solid var(--color-focus); outline-offset: 2px;` on `:focus-visible` only.

### TextField (replaces the "Full name" and "Email" components)
- Label above, in `label` style and `text` color. The wireframe's bold tiny label becomes 14 px weight 500.
- The input is 44 px tall, with `surface` background, 1 px `border-input` border, `md` radius, `body` text, and `text-muted` placeholder.
- Optional helper text below in `caption` style and `text-muted` color.
- **States:**
  - Hover: border darkens to `text-muted`.
  - Focus: the focus ring appears and the border turns `primary`.
  - Error: `danger` border, error text in `danger` with a `circle-alert` icon, and `aria-invalid`.
  - Disabled: `surface-sunken` background.
- **PasswordField:** a TextField with a trailing IconButton that toggles `eye`/`eye-off`. Its `aria-label` switches between "Show password" and "Hide password" (translated), and it uses `aria-pressed`.

### Checkbox & Radio (replaces the "Round" / "Check Mark" components)
- Use native `<input type="checkbox|radio">` restyled with `appearance: none`.
- **Checkbox:** 20 px square with `sm` radius and `border-input` border. When checked it gets a `primary` fill and an `on-primary` check. It also has an indeterminate state for "select all".
- **Radio:** 20 px circle, used only for mutually exclusive options.
- The whole label row is clickable and has a minimum height of 40 px.

### FilterAccordion (replaces the "Filter" dropdown)
- Follow the APG Accordion pattern: a `<button aria-expanded aria-controls>` header and a `role="region"` panel. Multiple items can be open.
- The header row shows the label (`label` style), an optional count badge of selected items, and a `chevron-down` icon. It has `md` radius and a `surface-muted` background on hover.
- The panel lists Checkbox items (multi-select). If there are more than 8 items, it shows a "Show more" link and a small search input.

### DateField + Calendar popover (replaces "Calendar")
- Follow the APG Date Picker Dialog pattern.
- The trigger looks like a TextField with a `calendar-days` trailing icon. It displays dates via `Intl.DateTimeFormat` (e.g. "Mar 15, 2026" / "15 մարտ, 2026"). Typing a date is also allowed (formats in Part 1 i18n).
- The popover is a month grid with prev/next month buttons and 40 px day cells. Month and weekday names come from `Intl`; weeks start on Monday.
- **Day styles:**
  - Today: `primary` ring.
  - Selected: `primary` fill.
  - In-range: `primary-soft`.
  - Disabled or booked: `text-muted` with a strikethrough and `aria-disabled`.
- **Keyboard:** arrow keys move by day, PageUp/PageDown by month, Home/End to the start or end of the week, Esc closes and returns focus to the trigger.
- **DateRangeField** pairs "From" and "To". Picking From automatically opens To, and To cannot be earlier than From.

### Chip (category toggle)
- 32 px tall, `sm` radius, `label` text.
- Unselected: `surface` background with a `border` border.
- Selected: `primary-soft` background, `on-primary-soft` text, and a leading check icon.
- Implement chips as `<button aria-pressed>`.
- On narrow screens the chip row scrolls horizontally with fade edges (`mask-image`).

### Tabs (Admin section switcher; keeps the wireframe's pill style)
- The track is `surface-muted` with `full` radius and 4 px padding.
- Each tab is 36 px tall with `full` radius.
- The active tab is `primary` with `on-primary` text. This keeps the wireframe's dark active pill, now in ink blue.
- Inactive tabs show `text-muted` text; on hover the text becomes `text`.
- Each admin section is its own page, so render the tabs as a `<nav>` of links with `aria-current="page"` on the active one. This is the correct semantics for page navigation.

### Badge
- 22 px tall, `caption` text, `sm` radius.
- Tones: neutral, accent ("Trending"), success ("Available"), warning ("2 left"), danger ("Unavailable"), primary (role "Admin").
- An optional leading 6 px dot.

### BookCover
- Aspect ratio 2:3, `sm` radius, `shadow-cover`, `object-fit: cover`.
- An `<img loading="lazy" decoding="async">` with explicit width and height. The `alt` text is "Cover of {title}" (translated).
- **Fallback when there is no image or it fails to load:** a designed typographic cover:
  - The background hue is derived from a hash of the work ID (via a `--cover-hue` custom property), with a subtle gradient and a darker spine strip on the left.
  - The title is set in the serif font, the author in small caps, and a `book-open` icon is included.
  - It must look intentional. Never show an empty box or a broken-image icon.

### BookCard — vertical (Home rails; replaces "Book preview")
- Width 176 px on mobile and 200 px at `lg`.
- Layout: cover, then title (`title-sm`, 2-line clamp), then author (`body-sm`, `text-muted`, 1-line clamp), then an optional badge.
- The whole card is a single link to `book.html?id=…`. Hover: `shadow-md` and lift. Focus: focus ring.
- No outer box around the cover. The cover itself is the visual weight, which reads as a more refined version of the wireframe's grey-boxed card.

### BookListItem — horizontal (Catalog; replaces "Book container")
- A card (`surface`, `border`, `lg` radius, `shadow-xs`) with padding `space-5`.
- The cover is 120 px wide on the left.
- The right side contains: title (`h3`), author (`body-sm`, `text-muted`), an availability Badge, description (`body-sm`, 3-line clamp), and a footer row with a "View details" link-button.
- When Open Library returns no description, show the first subjects and the first-publish year instead. Never show an empty paragraph.
- Below `sm`, the cover shrinks to 88 px.
- The whole card is clickable via the title link with a stretched-link pattern. Don't nest interactive elements inside another link.

### AdminRow / DataTable (replaces "Admin component")
- Implement as a real `<table>` for semantics. Visually, rows keep the wireframe's rounded-row look: 56 px tall, a `border` bottom divider, and a `surface-muted` background on hover. A selected row gets a `primary-soft` background.
- Columns:
  - **Books:** Checkbox, Cover thumbnail (32×48), Title, Author, Category, Copies / Availability badge, Actions.
  - **Users:** Checkbox, Avatar (initials) + Full name, Email, Role badge, Joined, Actions.
- **Actions:** `pencil` IconButton ("Edit {name}") and `trash-2` IconButton ("Delete {name}", hovering turns it `danger`).
- The header row has a "select all" checkbox with an indeterminate state and sortable column headers (`aria-sort`, header `<button>`).
- When one or more rows are selected, a sticky **BulkActionBar** appears: "{n} selected · Delete · Clear". Its count is announced via `aria-live`.
- Below `md`, the table collapses to stacked cards with the same actions.

### Dialog
- Native `<dialog>` opened with `showModal()`. Width 480 px, `xl` radius, `shadow-lg`, and a `::backdrop` using `--color-overlay`.
- Focus moves into the dialog and returns to the trigger on close. Esc closes.
- **Variants:** form (Add/Edit Book, Add/Edit User) and confirm (destructive). The confirm variant uses a `danger` primary button, states exactly what will be deleted, and puts initial focus on Cancel.

### Toast
- Appears bottom-right on desktop and bottom-center on mobile. Auto-dismisses after 5 s and pauses on hover and focus.
- Tones: success, error, info. Each has a dismiss IconButton.
- Use a persistent `aria-live="polite"` region; error toasts use `role="alert"`.

### Skeleton
- `surface-sunken` background with a subtle shimmer (static under reduced motion).
- Must match the real component's dimensions to avoid layout shift.

### EmptyState
- Contains: an icon in a 48 px `surface-muted` circle, an `h3` title, `body-sm` muted text, and an optional action button.

### Pagination
- Prev / page numbers / Next, 40 px targets, with ellipsis for long ranges.
- The current page has a `primary-soft` background and `aria-current="page"`.
- Implement as links with real `?page=` URLs so they work with middle-click and open-in-new-tab.

### Navbar (replaces the wireframe navbar, same arrangement)
- **Left:** a logo mark (a 32 px rounded square with an ink `book-open` glyph, filling the wireframe's square placeholder) plus the wordmark "Library" / «Գրադարան» in the serif font. Then nav links **Home** and **Catalog** in `label` style. The active link has `text` color and a 2 px `primary` underline. Inactive links are `text-muted`.
- **Right:**
  - **Admin**: a secondary button with a `shield` icon, visible only to the admin role.
  - **Log in**: a primary button for guests. Logged-in users see an avatar menu button (APG Menu Button pattern) with name, email, and Log out.
  - **Language switch**: a ghost button with a `languages` icon showing "EN" / "ՀՅ". It toggles the language and its `aria-label` names the target language.
  - **Theme toggle**: an IconButton.
- **Mobile (< md):** logo on the left and a hamburger on the right that opens a drawer containing the same items. The drawer is a `<dialog>`, so focus trapping and Esc come for free.

### Footer
Minimal: `surface-muted` background, the wordmark, © year (computed), the language switch repeated, and `body-sm` muted text, including "Book data from Open Library" with a link (required attribution).

## 10. `css/index.css` starting point
```css
@import url("./components/button.css");
/* …one @import per component file, then page-agnostic utilities below… */

@font-face {
  font-family: "Inter";
  src: url("../assets/fonts/inter-var.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: "Noto Sans Armenian";
  src: url("../assets/fonts/noto-sans-armenian-var.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0530-058F, U+FB13-FB17;
}
/* + Source Serif 4 and Noto Serif Armenian the same way */

:root {
  color-scheme: light;
  --font-sans: "Inter", "Noto Sans Armenian", system-ui, sans-serif;
  --font-serif: "Source Serif 4", "Noto Serif Armenian", Georgia, serif;

  --color-bg: #FBFAF7;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F4F1EA;
  --color-surface-sunken: #ECE8DF;
  --color-border: #E2DDD2;
  --color-border-input: #8C8578;
  --color-text: #1C1A17;
  --color-text-muted: #6B6458;
  --color-primary: #2B3A67;
  --color-primary-hover: #22305A;
  --color-primary-active: #1A2547;
  --color-on-primary: #FFFFFF;
  --color-primary-soft: #E6EAF5;
  --color-on-primary-soft: #22305A;
  --color-focus: #4A5FA0;
  --color-accent: #A86A1C;
  --color-accent-soft: #F8EBD6;
  --color-on-accent-soft: #6E440D;
  --color-success: #1F7A4D;  --color-success-soft: #E5F3EA;
  --color-warning: #A15C07;  --color-warning-soft: #FEF4E2;
  --color-danger: #B42318;   --color-danger-hover: #912018;
  --color-danger-soft: #FDECEA; --color-on-danger: #FFFFFF;
  --color-overlay: rgb(28 26 23 / 0.45);

  --text-display-size: 2.25rem; --text-display-line: 2.75rem;
  --text-h1-size: 1.875rem;     --text-h1-line: 2.375rem;
  /* …h2, h3, title-sm, body-lg, body, body-sm, label, caption from §2… */

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px; --space-20: 80px;

  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-full: 9999px;

  --shadow-xs: 0 1px 2px rgb(28 26 23 / 0.06);
  --shadow-sm: 0 1px 3px rgb(28 26 23 / 0.08), 0 1px 2px rgb(28 26 23 / 0.04);
  --shadow-md: 0 4px 12px -2px rgb(28 26 23 / 0.10), 0 2px 4px rgb(28 26 23 / 0.05);
  --shadow-lg: 0 16px 40px -8px rgb(28 26 23 / 0.20);
  --shadow-cover: 0 2px 4px rgb(28 26 23 / 0.12), 0 8px 16px -4px rgb(28 26 23 / 0.18);

  --duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);

  --nav-height: 64px;
  --container-max: 1280px;
}

[data-theme="dark"] {
  color-scheme: dark;
  /* override every --color-* with the dark values from §1,
     and every --shadow-* with black-based equivalents */
}
```

---

# PART 3 — Pages, Routes & Flow

## Flow (unchanged from the FigJam board)
```
Home ──► Catalog ──► Book detail ──► Book it (requires login)
  │
  └──► Login ──┬──► (user)  Catalog ──► Book detail ──► Book it
               └──► (admin) Admin ──┬──► Book management
                                    ├──► Reports
                                    └──► User management
Login ◄──► Register (cross-linked)
```

## Page map
| File | Page | Access | Data source (now) |
|---|---|---|---|
| `index.html` | Home | public | Open Library trending + subjects |
| `catalog.html` | Catalog | public | Open Library search + local inventory |
| `book.html?id=` | Book detail + booking | public view; booking requires a user | Open Library work + local inventory/bookings |
| `login.html` | Login | guests only (logged-in users are redirected to `index.html`) | local-db |
| `register.html` | Register | guests only | local-db |
| `admin/index.html` | redirects to `admin/books.html` | admin | — |
| `admin/books.html` | Book management | admin | local inventory + Open Library metadata |
| `admin/reports.html` | Reports | admin | local bookings |
| `admin/users.html` | User management | admin | local-db |
| `design.html` | Component style guide | dev only | fixtures |
| `404.html` | Not found | public | — |

After login, admins go to `admin/books.html` and users go to `returnTo`, or to `catalog.html` if there is no `returnTo`. This matches the flow board.

Every page shares the same shell: skip link, navbar, `<main id="main">`, footer, and toast region. Each page's entry module calls one `mountShell()` function, so the shell markup is not duplicated across HTML files.

## §1 Home (`index.html`)
The wireframe has two horizontal rails: "Trending" and "Classic". Keep them.

1. **Compact hero (new, small):** a `display`-style serif headline ("Find your next read" / its Armenian translation) with a muted subline and a large search field. Submitting goes to `catalog.html?q=…`. The hero is about 240 px tall and sits on a `surface-muted` band. It gives Home a real entry into Catalog, the Home → Catalog edge in the flow.
2. **Section "Trending"** (Open Library weekly trending):
   - Header row: an `h2` with a short `accent` underline bar on the left, and an "Explore all" link with `arrow-right` on the right, going to `catalog.html?sort=trending`.
   - Rail: a horizontal scroll of BookCards with a 20 px gap and `scroll-snap`. Prev/next IconButtons appear at `md` and up. The rail is keyboard scrollable and every card is focusable.
   - Show "Trending" badges on the cards.
3. **Section "Classics"** (Open Library `classics` subject): the same pattern, linking to `catalog.html?category=classics`.
4. **Section "Armenian literature"** (new, optional; Open Library `armenian_literature` subject or curated inventory IDs): the same pattern. If the API returns fewer than 4 books with covers, hide the section instead of showing a thin rail.
5. **Loading:** 6 skeleton cards per rail. **Error:** an inline error message with a Retry button, per rail, so one failing rail doesn't break the page.

## §2 Catalog (`catalog.html`)
Keep the wireframe structure: a search bar and filters on the left, category chips above the results, and a vertical list of horizontal book cards.

- **Header:** an `h1` "Catalog" plus a result count from the API's real total (pluralized via `t()`, `body-sm` muted).
- **Left sidebar** (`lg` and up, 280 px wide, sticky):
  - A search field with a search button. The wireframe's "Type something…" + "Search" pair becomes a single field with a leading `search` icon and an attached "Search" button.
  - FilterAccordions:
    - **Authors** and **Genres**: multi-select checkboxes. Genres come from a curated subject list in `services/books.js`, with labels in `translations.json`.
    - **Years**: a from/to number pair (mapped to Open Library's `first_publish_year` range).
  - A "Clear all filters" link appears when any filter is active.
- **Results column:**
  - Chip row: "All" plus categories (single select), with each category mapped to an Open Library subject. On the right of the same row, a Sort dropdown (Relevance, Title A–Z, Newest, Trending). Map each option to a supported Open Library sort value; if one has no equivalent, flag it.
  - Active filters appear as removable chips under the chip row.
  - A BookListItem list with a 16 px gap and Pagination at the bottom (20 per page).
- **Below `lg`:** the sidebar becomes a "Filters (n)" button that opens a left drawer (`<dialog>`) with an "Apply" button.
- **States:** skeleton list items while loading; an EmptyState ("No books match your filters", with a "Clear filters" action); an error state with retry.
- All state lives in URL params: `q`, `category`, `authors`, `genres`, `yearFrom`, `yearTo`, `sort`, `page`. Back and forward restore the exact view.

## §3 Book detail + booking (`book.html?id=`)
Keep the wireframe's single large panel with the cover on the left and info on the right, with From/To and "Book" at the bottom right.

- **Breadcrumb:** Catalog / {Title}.
- **Panel:** `surface` background, `xl` radius, `shadow-sm`, padding `space-8`. Two columns at `md` and up: cover at 280 px, info filling the rest. Single column on mobile.
- **Info:**
  - Title (`h1`, serif) and author (`body-lg`, `text-muted`).
  - A meta row with badges: category, first-publish year, and availability from local inventory ("Available · 3 copies", "1 left", "Unavailable").
  - A description in `body-lg` limited to 70ch. Open Library descriptions can be a string or an object; the mapper normalizes them. Long descriptions get a "Read more" toggle.
  - Update the `<title>` and meta description per book.
- **Booking box:** a `surface-muted` card inside the panel, at the bottom of the info column, containing:
  - "Reserve this book" in `title-sm`.
  - A DateRangeField (From and To) with fully booked dates disabled.
  - A summary line ("7 days · Mar 15 – Mar 22", localized).
  - A primary "Book" button (`lg`).
- **Behavior:**
  - A guest clicking "Book" goes to the login redirect.
  - On success: a success toast plus an inline confirmation state in the box.
  - Validation errors appear inline under the fields.
- **States:** a skeleton panel while loading; a not-found state (with a link back to Catalog) if the ID doesn't exist or is missing.

## §4 Login (`login.html`)
Keep the wireframe's centered card.

- A card with max width 440 px, `xl` radius, `shadow-md`, and padding `space-8`, centered vertically in `main` on a `bg` background.
- Title "Log in" (`h2`, serif, centered), then an Email TextField and a PasswordField.
- Bottom row: the link "Don't have an account? **Register**" on the left and a primary "Log in" button on the right. Below `sm`, the button becomes full-width and sits above the link.
- **Errors:** field-level errors, plus a form-level `danger-soft` banner for invalid credentials. The button shows a loading state while submitting. Move focus to the first invalid field on submit.
- Use `autocomplete="email"` and `autocomplete="current-password"`.

## §5 Register (`register.html`)
The same card as Login, with fields **Email, Full name, Password** in the wireframe's order.

- The password field shows a helper text with its rules (min 8 characters).
- Reject duplicate emails with a field-level error.
- The link reads "Already have an account? **Log in**". The primary button is "Create account".
- Use `autocomplete="email"`, `autocomplete="name"`, and `autocomplete="new-password"`.

## §6 Admin — shared shell
Keep the wireframe's pill tab bar centered above a list.

- Header: `h1` "Admin", then the Tabs **Book management · Reports · User management**, in the wireframe's order, as links between the three admin pages.
- Content width: max 960 px, centered.
- The role guard runs before any admin content renders.

## §7 Admin — Book management (`admin/books.html`)
- **Toolbar:** a search field on the left; a primary "Add book" button with a `plus` icon on the right.
- **DataTable:** columns as in Part 2 §9, listing the library inventory.
  - "Add book" opens a Dialog with an **"Import by ISBN"** field that looks the book up on Open Library and pre-fills the form. All fields stay editable for manual entry.
  - Edit opens a Dialog with fields: title, author, category, genres, year, copies, description, and cover URL.
  - Delete opens a confirm dialog that names the book and states how many upcoming bookings it cancels.
  - BulkActionBar appears on selection.
  - Pagination at the bottom.
- **States:** skeleton rows while loading; EmptyState with an "Add your first book" action.

## §8 Admin — Reports (`admin/reports.html`) — *no wireframe exists; default spec*
- **Controls row:** a report type select (Bookings by date, Most-booked books, Active users, Overdue returns), a DateRangeField, and a primary "Generate" button.
- **Result:**
  - Three summary stat cards in a row (e.g. total bookings, unique users, average duration).
  - A **Chart.js** chart: a line chart for "Bookings by date" and a bar chart for the others. Chart colors are read from the CSS custom properties at render time and re-applied on `theme:change`. Labels come from `t()`. Lazy-load Chart.js from `assets/vendor/` only on this page.
  - A DataTable of the report rows.
  - An "Export CSV" secondary button that builds a UTF-8 CSV with a BOM so Armenian text opens correctly in Excel.
- **States:** an EmptyState before the first run ("Choose a report and date range"); skeleton while loading; an error state with retry.

## §9 Admin — User management (`admin/users.html`)
The same pattern as Books.

- **Toolbar:** search plus an "Add user" button.
- **DataTable:** columns as in Part 2 §9. Edit covers full name, email, and role.
- An admin cannot delete or demote themselves. Disable those controls and show a tooltip explaining why.

## What changed vs. the wireframe (and why)
| Wireframe | New | Reason |
|---|---|---|
| Flat grey fills + dark outlines | Paper surfaces, hairline borders, soft shadows | Visual hierarchy and a warmer, "library" feel |
| Inter only, ~8–12 px body text | Inter + Source Serif 4 (with Noto Armenian fallbacks), 14 px minimum | Readability; serif titles give a bookish identity; Armenian support |
| English only | English + Armenian, one translations file | Project requirement |
| Admin + Login always visible | Role-aware nav, user menu | Correctness and security |
| Radio-style filters | Checkbox multi-select | Users often want several authors or genres |
| Row list with icons only | Semantic table, labeled icon buttons, Add, bulk actions, confirm delete | Accessibility and admin efficiency |
| No Reports frame | Defined Reports page with charts | It's in the flow and the tabs |
| No states | Loading / empty / error everywhere | Real-world robustness |
| 110 px navbar | 64 px sticky navbar | More content above the fold |
| Grey placeholder boxes | Real covers from Open Library, designed typographic fallback | Real product, no placeholders |
