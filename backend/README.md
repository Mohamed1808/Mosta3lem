# Mosta3lem API

The real backend, step 1: the shared engine (`prototype/js`) running on a server, behind an API, with its data in PostgreSQL.

## Run it

PowerShell, from this folder:

```
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm install
npm start
```

Then open http://localhost:4000/health. With no `DATABASE_URL`, the data lives in PGlite (PostgreSQL inside Node) under `.data/pglite`; the first start fills it with the demo data. Delete that folder to start over.

With Docker (from the repository root): `docker compose -f backend/docker-compose.yml up --build` runs the API with PostgreSQL 16.

Tests: `npm test`.

## How it works

| Piece | File |
|---|---|
| Loads the engine into its own sandbox; tells it who is calling | `src/engine.js` |
| PostgreSQL (or PGlite) and migrations | `src/db.js`, `migrations/` |
| Reads the data at start; after each request writes only what changed, in one transaction | `src/state.js` |
| Sign-in tokens (only a SHA-256 hash is stored) | `src/sessions.js` |
| The API | `src/server.js` |

- **One endpoint per service method**: `POST /api/v1/<service>/<method>` with `{ "args": [...] }`. The methods are exactly those in `prototype/js/services/contracts.js`, the contract the app and console already use; anything else is refused.
- **Answers**: `{ ok: true, result }` or `{ ok: false, error: { key, params } }` (key is a translation key). HTTP 401 not signed in, 403 not allowed for this team, 404 not found, 400 other refusals.
- **Sign-in**: signing in returns `session: { token, expiresAt }`; send it back as `Authorization: Bearer <token>`. Signing out deletes it. Deactivating a person or resetting their sign-in signs them out on every device.
- **Language**: send `X-Lang: ar` for Arabic.
- **Permissions and data hiding** are the engine's, unchanged: the server tells the engine who is calling and the engine decides.
- Requests are served one at a time, and each one's changes are saved before it is answered. If saving fails the server stops rather than answer from unsaved data.
- Every 30 seconds the server moves deadlines and offers on (the work the apps' timers do today).

## Limits of step 1

- **Demo mode only.** "Sign in as" any demo person is still how you sign in. Real sign-in (passwords, SMS and email codes, no "sign in as") is the next step, and the server refuses to start in live mode until then.
- **Records are stored as JSON** in one table per kind (`cases`, `users`, ...). Fields move into proper columns area by area later.
- **One server at a time.** Data is held in memory and saved on every change, so two copies of the server would not see each other's changes. Fine for staging and a pilot; scaling out comes with the columns work.
- Photos still travel inside requests as data until file storage arrives.
- The app and the console still use their simulated backend; connecting them to this API is a later step.
