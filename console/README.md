# Mosta3lem Console

The internal web console for the Mosta3lem team (Operations, Management, Finance, Quality, Legal, Customer support, Sales, Data and the Super admin). Organisations and service providers use the mobile app in `../app`.

Built with Next.js 16 (App Router, Turbopack) and Tailwind CSS 4. Read `AGENTS.md` before changing Next.js code: this version differs from older ones.

## Run it

```bash
cd console
npm install
npm run dev -- -p 3600
```

Open http://localhost:3600 and sign in with a staff email (the sign-in page lists one demo person per team). Every staff account uses the demo password shown on the page.

### With the real server

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` (for example `http://localhost:4000`, after starting the API in `../backend` with `npm start`). Restart `npm run dev`; the value is fixed when the console is built.

- Sign-in is real: email and password, then a code sent by email. On a test server nothing is really sent: the code is in the API's log. "Forgot your password?" emails a link.
- Invitation and reset links open `/set-password` here, where the person chooses a password.
- A server in demo mode still lists the demo staff accounts; a live server does not.
- The sign-in is kept for the browser tab only (sessionStorage): closing it signs the person out.

Without `NEXT_PUBLIC_API_URL` the console runs on its own demo data in the browser, as before.

## How it works

- **Backend:** the console loads the shared engine from `../prototype/js` (`src/backend/engine.ts`, script list in `src/backend/scripts.js`). With `NEXT_PUBLIC_API_URL` every service call goes to the API through `prototype/js/services/remote.js`; without it the engine runs in the browser on demo data kept in localStorage. Screens use `services()` either way. The bundler root is the repository (`next.config.ts`) so these files resolve.
- **Permissions:** the table of what each team may see and do is in the engine (`wf.PERMISSIONS` in `prototype/js/workflow/common.js`); services check it with `E.requirePermission`. Customer support and Data never receive customers' personal data. Fee changes need Finance and Management; dispute decisions need Legal and Management (`wf.DUAL_APPROVAL`).
- **Strings:** shared strings come from `prototype/js/i18n`; the console's own are in `src/i18n/strings.ts` (English and Arabic, right to left in Arabic).

## Checks

```bash
npx tsc --noEmit
npx eslint src
node scripts/i18n-check.js
```
