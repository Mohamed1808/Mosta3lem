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

## How it works

- **Simulated backend:** the console runs the shared engine from `../prototype/js` in the browser (`src/backend/engine.ts`, script list in `src/backend/scripts.js`), exactly like the mobile app. Data lives in the browser's localStorage. The bundler root is the repository (`next.config.ts`) so these files resolve.
- **Permissions:** the table of what each team may see and do is in the engine (`wf.PERMISSIONS` in `prototype/js/workflow/common.js`); services check it with `E.requirePermission`. Customer support and Data never receive customers' personal data. Fee changes need Finance and Management; dispute decisions need Legal and Management (`wf.DUAL_APPROVAL`).
- **Strings:** shared strings come from `prototype/js/i18n`; the console's own are in `src/i18n/strings.ts` (English and Arabic, right to left in Arabic).

## Checks

```bash
npx tsc --noEmit
npx eslint src
node scripts/i18n-check.js
```
