# Mosta3lem / مستعلم

Marketplace for field investigations and collections in Egypt: banks and finance companies (requesters) send work to verified service providers (companies and individuals).

## Repository layout

| Folder | What it is |
|---|---|
| `app/` | The Mosta3lem mobile app (React Native with Expo). One app for providers and requesters; the login decides what each person sees. Provider side first. |
| `prototype/` | The clickable HTML prototype (all portals, no build step). It is the spec, and its engine powers the app's simulated backend until the real API exists. |
| `backend/` | The API and its PostgreSQL database. Step 1: the shared engine behind a real API. See [backend/README.md](backend/README.md). |
| `console/` | The internal web console for operations, finance, data, management, support, sales and legal. |

## Delivery pipeline

Claude Code → GitHub → local/dev → Docker → staging → testing, security and database migration → production. All data stays in Egypt.

## Quick start

- App: see [app/README.md](app/README.md). Testing on a phone: [docs/provider-phone-test.md](docs/provider-phone-test.md) (service providers) and [docs/client-phone-test.md](docs/client-phone-test.md) (organisations).
- App on the real server (API on your computer): [docs/server-phone-test.md](docs/server-phone-test.md).
- Internal console for the Mosta3lem team: see [console/README.md](console/README.md). Test checklist: [docs/console-test.md](docs/console-test.md).
- Prototype: open `prototype/index.html`, or run `node prototype/serve.js` and open http://localhost:3500. Tests: `node prototype/tests/run-node.js` and `node prototype/tests/scenarios.js`.
- Vercel (prototype site): set the project's Root Directory to `prototype`.
