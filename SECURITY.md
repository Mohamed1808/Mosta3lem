# Security

How Mosta3lem protects its data, what has to be done when it goes live, and what is still open. Keep this page up to date when security work lands.

## Reporting a problem

Tell the Mosta3lem team directly (not in a public GitHub issue): what you found, how to reproduce it, and what it exposes. Do not test against the live platform without written permission.

## What is in place

### Who can see and do what
- **Permissions are checked on the server** for every request, by the shared engine: each team's permissions (`wf.PERMISSIONS`), the two-team approvals (fees, disputes, provider sign-off), and the data hiding rules.
- **Only listed functions work without signing in**: who am I, sign out, the settings lists, the clock, and a new provider's sign-up. Every other function needs a sign-in. A function added later stays private unless someone adds it to that list.
- **Organisations never see another organisation's work, and providers never see another provider's.** Organisations never see provider staff names, field agents never see money, and Customer support and Data never see customers' national ID, phone or address. The API tests check each of these.
- **Demo controls are locked down.** Resetting the data and moving the clock are for the Super admin only, even on a demo server. On a live server they do not exist.

### Sign-in
- **Every sign-in ends with a one-time code**, sent by SMS to providers and by email to organisations and staff. Codes have 6 digits, last 10 minutes and allow 5 tries. At most 5 codes an hour go to one mobile or email.
- **Passwords** are stored with scrypt and a random salt, never as typed. They need at least 10 characters, letters and numbers, and must not contain the email name. Five wrong passwords lock the account for 15 minutes.
- **No account fishing.** An unknown email or mobile gets exactly the same answer as a real account; a wrong email takes as long to check as a wrong password.
- **Password links** (invitations and resets) work once and expire after 72 and 24 hours. Choosing a password signs the person out everywhere else.
- **Sign-in tokens** are random 256-bit values. The database keeps only their SHA-256 hash.
  - A sign-in expires after 7 days.
  - It ends sooner if unused: after **8 hours for platform staff**, whose accounts reach everyone's data, and after 3 days for everyone else.
  - Deactivating a person or resetting their sign-in ends all their sign-ins and stops push to their phones.
- **Rate limits.** Each address gets at most 300 requests a minute, and 10 a minute on the sign-in routes. Behind a proxy, only the configured proxy (`TRUST_PROXY`) is believed about the caller's address, so a forged address cannot get around the limits.

### Data
- **Files** (ID cards, documents, visit photos):
  - Only JPEG, PNG, WebP and PDF are accepted, judged by their content rather than their name. The limit is 8 MB.
  - Files are encrypted at rest with AES-256-GCM, using a key derived from `FILES_KEY`.
  - Screens get links that are signed and last 15 minutes. Files are served so that they can never run as a page.
  - Files nothing points to any more are deleted after a day.
- **The database must be UTF8**, since Arabic text needs it. The server refuses any other encoding.
- **Every change is saved before the answer goes back**, in one transaction. If saving fails, the server stops instead of serving unsaved data.
- **Push notifications carry no names**, because push services are outside Egypt. Email and SMS will go through providers chosen in Egypt.

### Requests and answers
- **Headers on every answer:** `nosniff`, `X-Frame-Options: DENY`, a `Content-Security-Policy` that allows nothing to run, `no-store` caching, no referrer, a strict `Permissions-Policy`, and HSTS over https.
- **Request size:** without a sign-in, requests are limited to 64 KB (a provider's sign-up may carry documents). Signed-in requests can be up to 15 MB.
- **Errors** return a translation key, never internal details.
- **Allowed web pages (CORS):** only the listed pages may call the API. A live server allows none until they are listed.

### Records
- **The activity log** (business actions) is in the engine and visible to Legal, Management and the Super admin.
- **The security log** (`security_events` table) records sign-ins, failed passwords and codes, lockouts, password requests and changes, and sign-outs everywhere. Each entry has the address and device it came from, and never a password, code or token.
- **The server log** never contains sign-in tokens, mobile proofs or the signatures of file links.

### Checks on every pull request
GitHub runs:
- all the tests (engine, scenarios, API, security and a real PostgreSQL server);
- the type checks and builds;
- `npm audit` on the API and the console, failing on any high-severity known vulnerability.

The mobile app's audit lists warnings in Expo's build tools (Metro, the Expo command line, file-matching libraries). These are not in the app that runs on phones. npm's suggested fix would downgrade Expo by many major versions, so we follow Expo's SDK updates instead.

## Going live: checklist

For whoever deploys the live platform.

- [ ] **Hosting in Egypt:** the server, the database, the files and the backups all stay inside Egypt.
- [ ] `MOSTA3LEM_MODE=live`.
- [ ] **PostgreSQL 16 or later**, created with `ENCODING 'UTF8'`, and reachable only from the API server, never from the internet.
- [ ] **`FILES_KEY`:** 32 random bytes, kept in a secret store, not in the code or a shared document. **Back it up separately from the database**, because without it the files cannot be read.
- [ ] **Real SMS and email providers** (`MESSAGING_DRIVER`), and `ALLOW_DEV_MESSAGING` left unset.
- [ ] **HTTPS only,** with a proxy or load balancer in front:
  - set `TRUST_PROXY` to its address;
  - set `PUBLIC_URL` (the console) and `PUBLIC_API_URL`;
  - set `CORS_ORIGINS` to the console's https address only.
- [ ] **The first Super admin** is added with `npm run create-admin`. Everyone else is invited from the console.
- [ ] **Backups** every day, kept for at least 30 days, tested by restoring them:
  - the database (`pg_dump`);
  - the files folder or bucket;
  - `FILES_KEY`, kept separately.
- [ ] **Monitoring:**
  - watch `/health`;
  - alert on errors in the log and on many `signin.locked` or `signin.code_failed` events in `security_events`.
- [ ] **One copy of the API at a time**, for now (see `backend/README.md`).
- [ ] **Server updates:** keep the operating system, Node.js and PostgreSQL updated, and merge dependency updates once the checks are green.

## Still open

- **Outside penetration test** before launch, by a security company.
- **Legal review against Egypt's Personal Data Protection Law (Law 151 of 2020).** It covers:
  - consent;
  - how long data is kept (the engine hides personal data after the retention period, but the stored files and records still need a deletion policy);
  - the rights of the people investigated;
  - registering with the data protection centre.
- **Choice of providers:** SMS, email, OCR, maps and cloud, each checked for keeping data in Egypt.
- **Staff second factor:** staff already need an email code. Consider a phone authenticator app for the Super admin and Finance.
- **Rotating `FILES_KEY`:** the procedure (re-encrypting the files) is not written yet.
- **More than one API server:** this needs the data in proper columns (planned) before the API can run as several copies behind a load balancer.
- **Screens for the security log in the console,** for Legal and the Super admin.
