# Smart Link Shortener — Backend

Bitly-style URL shortener backend with click analytics, rate limiting, and fast cached redirects — built for the MERN Stack Internship assignment (Assignment 01).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express (TypeScript, `strict: true`) |
| Database | MongoDB + Mongoose |
| Validation | Zod |
| Auth | JWT — Access Token (15m) + Refresh Token (7d) |
| Rate Limiting | `express-rate-limit`, per-user sliding window |
| Caching | `lru-cache` — in-memory, 500 entries, 5 min TTL |
| Analytics | `ua-parser-js` — browser/OS extraction |
| Testing | Jest + ts-jest + Supertest |

---

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── link.controller.ts
│   ├── dtos/
│   │   ├── auth.dto.ts
│   │   └── link.dto.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── rateLimiter.middleware.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Link.ts
│   │   └── ClickEvent.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   └── nanoid.test.ts
├── .env.example
├── .gitignore
├── tsconfig.json
└── package.json
```

---

## Getting Started

```bash
git clone <repo-url>
cd backend
npm install
cp .env.example .env   
npm run dev
```

Server runs on `http://localhost:5000` by default.

---

## Environment Variables (`.env.example`)

```
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
```

> Real values are sent separately (not committed). `.env` is already in `.gitignore`.

---

## API Reference (Frontend Integration)

### Auth — public

```
POST   /api/auth/register
Body:  { name, email, password }
201:   { accessToken, refreshToken, user: { id, name, email } }

POST   /api/auth/login
Body:  { email, password }
200:   { accessToken, refreshToken, user: { id, name, email } }

POST   /api/auth/refresh
Body:  { token: <refreshToken> }
200:   { accessToken }
```

### Links — protected, send `Authorization: Bearer <accessToken>`

```
POST   /api/links/create             # rate-limited: 5 per 15 min per user
Body:  { originalUrl, customAlias?, expiresAt? }
201:   { message, link }

GET    /api/links/my-links           # only the logged-in user's links
200:   { links: [...] }

PUT    /api/links/update/:id
Body:  { originalUrl, customAlias?, expiresAt? }
200:   { message, link }

DELETE /api/links/delete/:id
200:   { message }

GET    /api/links/analytics/:id
200:   { totalClicks, clicksOverTime, topReferrers, devices }
```

### Redirect — public, no token

```
GET    /api/links/:shortId
302 →  redirects to the original URL, logs a click event async
410 →  link expired, deactivated, or doesn't exist
```

---

## Data Models

**User** — `name, email, passwordHash` (bcrypt-hashed)

**Link** — `originalUrl, shortId (unique), customAlias? (unique, sparse), userId, clicks, isActive, expiresAt? (TTL index), createdAt, updatedAt`

**ClickEvent** — `linkId, timestamp, referrer, userAgent (parsed browser+OS string), ipHash (SHA-256, raw IP never stored), country?`

---

## Architecture Decisions & Tradeoffs

- **Express over NestJS** — lighter, faster to ship for a 2-day deadline.
- **Zod over class-validator** — runtime validation + inferred TS types from one schema, no decorators needed.
- **Nanoid collision retry** — random 8-char short codes retry up to 3 times on a duplicate-key error; a custom alias collision fails immediately instead of retrying, since that's the user's explicit choice.
- **Per-user rate limiting** — `keyGenerator` uses `req.user.id` (falls back to IP only if unauthenticated, which shouldn't occur since the route is protected).
- **In-memory LRU cache on redirect** — cuts DB roundtrips for hot short codes. Explicitly invalidated (`.delete()`) on both update and delete so edits/removals take effect immediately instead of waiting out the 5 min TTL.
- **IP hashing** — SHA-256 hash stored, never the raw IP, for click-analytics privacy.
- **Parsed user-agent for analytics** — raw UA strings are near-unique per request; `ua-parser-js` extracts browser + OS into one string so device breakdown groups meaningfully.
- **TTL index (`expireAfterSeconds: 0`) on `expiresAt`** — MongoDB auto-deletes expired links, no cron job needed. Tradeoff: deletion runs on MongoDB's background sweep (~60s interval), not instantly.
- **Fire-and-forget writes** — click-count increment and `ClickEvent` creation happen async so the redirect responds immediately.

---

## Milestones

- [x] M1 — Auth + create/list links
- [x] M2 — Redirect + click recording
- [x] M3 — Analytics dashboard (API)
- [x] M4 — Rate limiting + TTL + hot-link cache

---

## Testing

```bash
npm test
```

Currently covers: nanoid collision-retry logic (`tests/nanoid.test.ts`) — retry-on-duplicate-key, and immediate-fail on custom alias collision.

**Not yet covered:** rate limiter behavior — see below.

---

## What We'd Do With More Time

- Unit test for the per-user rate limiter
- Move cache + rate limiter to Redis for multi-instance scaling
- Geo-IP enrichment on click events
- CSV export of analytics
- QR code generation per link
- Password-protected links