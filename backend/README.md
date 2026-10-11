# Mosta3lem API

The real backend: the shared engine (`prototype/js`) running on a server, behind an API, with its data in PostgreSQL and real sign-in.

## Run it

PowerShell, from this folder:

```
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm install
npm start
```

Then open http://localhost:4000/health. With no `DATABASE_URL`, the data lives in PGlite (PostgreSQL inside Node) under `.data/pglite`; the first start fills it with the demo data. Delete that folder to start over. Settings: copy `.env.example` to `.env`.

With Docker (from the repository root): `docker compose -f backend/docker-compose.yml up --build` runs the API with PostgreSQL 16.

Tests: `npm test`.

## Two modes

| | demo (default) | live |
|---|---|---|
| Data on first start | the demo data | an empty platform with the default settings |
| "Sign in as" anyone, demo password, demo clock | yes | no (refused as unknown) |
| Real sign-in (below) | yes | the only way in |
| New provider sign-up | mobile code optional | mobile code required |

**Starting a live platform**: with the API stopped, add the first Super admin, who gets an email link to choose a password and then adds everyone else from the console:

```
$env:MOSTA3LEM_MODE = "live"
npm run create-admin -- --name "Full Name" --email name@company.com
```

Live mode refuses to start with the development messenger (codes would only be in the log) unless `ALLOW_DEV_MESSAGING=true`, for a closed staging server.

## Sign-in

| Who | How |
|---|---|
| Organisation users and platform staff | `POST /api/v1/session/password { email, password }`, then the code sent by email |
| Providers and field agents | `POST /api/v1/session/phone { phone }`, then the code sent by SMS |
| Either, with the code | `POST /api/v1/session/verify { challengeId, code }` returns `session: { token, expiresAt }` |
| New provider signing up | `POST /api/v1/session/phone { phone, purpose: "signup" }`, verify, then call `registration.submit` with the header `X-Phone-Proof: <phoneProof>` |
| Forgot password | `POST /api/v1/session/forgot { email }` emails a link |
| From an invitation or reset link | `POST /api/v1/session/set-password { token, password }` |

- **Passwords** are stored with scrypt and a random salt. At least 10 characters, with letters and numbers, not the email name.
- **Codes** are 6 digits, valid 10 minutes, 5 tries, at most 5 codes an hour to one mobile or email. Only hashes are stored.
- **5 wrong passwords** lock the account for 15 minutes; the console shows the lock, and Customer support's "Reset sign-in" lifts it and emails a link to choose a new password.
- **Invitations**: anyone added with an email (staff, an organisation's first Admin, organisation users) gets a link valid 72 hours. Reset links are valid 24 hours. A link works once.
- **No account fishing**: an unknown email or mobile gets exactly the same answer as a known one (no code is sent).
- **Rate limits** per address: 300 requests a minute, 10 a minute on the sign-in routes.
- Choosing a password signs the person out on every other device.

## Messages

`src/messaging.js` sends every SMS and email. The `dev` driver prints them in the log and keeps their text in the `outbox` table, so codes and links can be read while testing; nothing leaves the server. Real SMS and email providers plug in there once chosen.

## How it works

| Piece | File |
|---|---|
| Loads the engine into its own sandbox; tells it who is calling | `src/engine.js` |
| PostgreSQL (or PGlite) and migrations | `src/db.js`, `migrations/` |
| Reads the data at start; after each request writes only what changed, in one transaction | `src/state.js` |
| Session tokens (only a SHA-256 hash is stored) | `src/sessions.js` |
| Sign-in, codes, password links | `src/signin.js`, `src/passwords.js` |
| SMS and email | `src/messaging.js` |
| The API | `src/server.js` |

- **One endpoint per service method**: `POST /api/v1/<service>/<method>` with `{ "args": [...] }`. The methods are exactly those in `prototype/js/services/contracts.js`, the contract the app and console already use; anything else is refused.
- **Answers**: `{ ok: true, result }` or `{ ok: false, error: { key, params } }` (key is a translation key). HTTP 401 not signed in, 403 not allowed, 404 not found, 429 too many tries, 400 other refusals.
- Send the session token as `Authorization: Bearer <token>`. Signing out deletes it. Deactivating a person or resetting their sign-in signs them out on every device.
- **Language**: send `X-Lang: ar` for Arabic (messages are sent in that language too).
- **Permissions and data hiding** are the engine's, unchanged: the server tells the engine who is calling and the engine decides.
- Requests are served one at a time, and each one's changes are saved before it is answered. If saving fails the server stops rather than answer from unsaved data.
- Every 30 seconds the server moves deadlines and offers on (the work the apps' timers do today).

## Limits for now

- **No real SMS or email provider** yet (your decision); the `dev` driver stands in.
- **Records are stored as JSON** in one table per kind (`cases`, `users`, ...). Fields move into proper columns area by area later.
- **One server at a time.** Data is held in memory and saved on every change, so two copies of the server would not see each other's changes. Fine for staging and a pilot; scaling out comes with the columns work.
- Photos still travel inside requests as data until file storage arrives.
- The app and the console still use their simulated backend; connecting them to this API is a later step (including a "choose your password" page for the links).
