# API contract

The REST API the future backend (PHP, Python or Node.js with PostgreSQL) must implement.
The frontend already speaks it: `js/providers/http-backend.js` calls exactly these endpoints.

## Conventions

- Base URL: `/api` (`backendBaseUrl` in `js/config.js`).
- JSON in, JSON out. Field names are `snake_case` and map 1:1 to database columns.
- IDs are strings. Calendar dates are `YYYY-MM-DD`; timestamps are ISO 8601 in UTC.
- Auth: `Authorization: Bearer <token>` on every request after login.
- Lists are paged:

```json
{ "items": [], "total": 128, "page": 1, "page_size": 20 }
```

### Errors

Any non-2xx response carries:

```json
{ "error": { "code": "conflict", "message_key": "booking.errors.unavailable", "params": {} } }
```

`message_key` is a key from `i18n/translations.json`, so the frontend shows the message in the
user's language. `params` fills its placeholders (for example `{ "count": 14 }`).

| Status | `code` | Default `message_key` |
|---|---|---|
| 400 | `invalid` | `errors.unknown` |
| 401 | `unauthorized` | `errors.unauthorized` |
| 403 | `forbidden` | `errors.forbidden` |
| 404 | `not_found` | `errors.notFound` |
| 409 | `conflict` | (specific key, see each endpoint) |
| 422 | `invalid` | (a `validation.*` or `booking.errors.*` key) |
| 5xx | `server` | `errors.server` |

## Objects

### Book

```json
{
  "id": "OL27482W",
  "title": "The Hobbit",
  "authors": ["J.R.R. Tolkien"],
  "author_ids": ["OL26320A"],
  "category": "fantasy",
  "genres": ["adventure"],
  "first_publish_year": 1937,
  "cover_id": 14627509,
  "cover_url": null,
  "description": "…",
  "subjects": ["Fantasy", "Hobbits"],
  "copies": 3,
  "available_copies": 2,
  "availability": "available",
  "created_at": "2026-03-01T13:32:00Z"
}
```

- `category`: one of `fiction`, `classics`, `mystery`, `fantasy`, `science-fiction`, `history`,
  `science`, `poetry`, `biography`, `armenian`, or `null`.
- `availability`: `available` | `few` (one copy left of several) | `unavailable`, for today.
- `cover_url` (set by an admin) wins over `cover_id` (an Open Library cover ID).

### User

```json
{ "id": "u_002", "full_name": "Anna Petrosyan", "email": "member@library.am", "role": "member", "created_at": "2026-01-25T11:30:00Z" }
```

`role` is `member` or `admin`. The password hash is never sent.

### Booking

```json
{ "id": "b_0051", "book_id": "OL27482W", "user_id": "u_002", "from_date": "2026-10-03", "to_date": "2026-10-09", "status": "active", "created_at": "2026-10-01T09:14:00Z" }
```

`status` is `active` | `returned` | `cancelled` | `overdue`. Both dates are inclusive.

## Auth

| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` | 401 `auth.errors.invalidCredentials` |
| POST | `/auth/register` | `{ email, full_name, password }` | `{ token, user }` (role `member`) | 409 `auth.errors.emailTaken`, 422 `validation.minLength` (`count: 8`) |
| POST | `/auth/logout` | none | 204 | |
| GET | `/auth/me` | none | User | 401 |

Emails are compared case-insensitively. Passwords must be stored with a salted, slow hash
(bcrypt or argon2); the SHA-256 in the frontend mock is for the demo only.

## Books (public)

### `GET /books`

| Query | Meaning |
|---|---|
| `q` | Free text: title, author, ISBN |
| `category` | A category id |
| `subject` | A raw subject key (used by the Home rails) |
| `authors` | Comma-separated author IDs; a book matches any of them |
| `genres` | Comma-separated genre ids; a book matches any of them |
| `year_from`, `year_to` | Inclusive range on `first_publish_year` |
| `sort` | `relevance` (default), `title`, `newest`, `trending` |
| `page`, `page_size` | Defaults 1 and 20 |

Response: a page of Books.

### `GET /books/:id`

Response: Book, with `description`. Errors: 404 `books.errors.notFound`.

### `GET /books/isbn/:isbn`

Looks a book up by ISBN-10 or ISBN-13 so the "Add book" form can be pre-filled.
Response: Book (not yet in the inventory, so `copies` is `null`) or `null`.

### `GET /books/:id/unavailable-dates?from=&to=`

Dates on which every copy is booked. Defaults: `from` today, `to` 180 days later.

```json
{ "dates": ["2026-10-02", "2026-10-03"] }
```

## Bookings (signed-in users)

### `POST /bookings`

Body: `{ book_id, from_date, to_date }`. Response: Booking with status `active`.

Rules, enforced by the server:

| Rule | Status | `message_key` |
|---|---|---|
| Dates valid and `to_date >= from_date` | 422 | `booking.errors.invalidRange` |
| `from_date` is today or later | 422 | `booking.errors.past` |
| At most 14 days, both ends included | 422 | `booking.errors.tooLong` (`count: 14`) |
| A copy is free on every day of the range | 409 | `booking.errors.unavailable` |

### `GET /bookings?book_id=&user_id=&status=&upcoming=`

Members get their own bookings; admins get everyone's and may filter by `user_id`.
`upcoming=true` keeps active bookings that end today or later. Response: a page of Bookings.

### `POST /bookings/:id/cancel`

The owner or an admin. Response: Booking with status `cancelled`.

## Admin (role `admin`, otherwise 403)

### Books

| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | `/admin/books?q=&category=&sort=&order=&page=&page_size=` | | Page of Books (the library's holdings) | |
| POST | `/admin/books` | Book fields; `id` optional (an Open Library work ID when imported) | Book | 409 `books.errors.exists` |
| PUT | `/admin/books/:id` | Any of `title`, `authors`, `category`, `genres`, `first_publish_year`, `copies`, `description`, `cover_url` | Book | 404 |
| DELETE | `/admin/books/:id` | | `{ "cancelled_bookings": 2 }` | 404 |

`sort` is one of `title`, `author`, `category`, `copies`, `created_at`; `order` is `asc` or `desc`.
Deleting a book cancels its upcoming bookings and reports how many.

### Users

| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | `/admin/users?q=&sort=&order=&page=&page_size=` | | Page of Users | |
| POST | `/admin/users` | `{ full_name, email, role, password }` | User | 409 `auth.errors.emailTaken` |
| PUT | `/admin/users/:id` | Any of `full_name`, `email`, `role` | User | 404 `users.errors.notFound`, 409 `auth.errors.emailTaken`, 409 `users.errors.selfDemote` |
| DELETE | `/admin/users/:id` | | `{ "cancelled_bookings": 0 }` | 404, 409 `users.errors.selfDelete` |

`sort` is one of `full_name`, `email`, `role`, `created_at`. An admin cannot delete or demote
their own account.

### Reports

`GET /reports/:type?from=&to=` where `:type` is `bookings-by-date`, `most-booked`,
`active-users` or `overdue`. Bookings are counted by their start date; cancelled ones are left out.

```json
{
  "type": "most-booked",
  "from": "2026-09-01",
  "to": "2026-09-30",
  "summary": { "total_bookings": 80, "unique_users": 15, "average_days": 8.7 },
  "rows": [{ "book_id": "OL893414W", "title": "Dune", "bookings": 5, "average_days": 9.4 }]
}
```

| Type | Row fields |
|---|---|
| `bookings-by-date` | `date`, `bookings` (one row per day in the range, zeros included) |
| `most-booked` | `book_id`, `title`, `bookings`, `average_days` (top 20) |
| `active-users` | `user_id`, `full_name`, `email`, `bookings`, `last_booking` (top 20) |
| `overdue` | `booking_id`, `title`, `full_name`, `to_date`, `days_overdue` |

Errors: 422 `booking.errors.invalidRange` for a bad date range.
