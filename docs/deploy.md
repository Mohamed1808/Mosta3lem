# Deploying Mosta3lem

One page for whoever puts Mosta3lem on a server. Everything runs in Docker, so any cloud works: a virtual machine in Egypt is enough to start. The security checklist is in `SECURITY.md` ("Going live").

## What runs

| Part | What it is |
|---|---|
| `proxy` | Caddy: HTTPS for both domains, certificates renewed automatically |
| `console` | The staff console (Next.js) |
| `api` | Two copies of the API, sharing the database and files |
| `db` | PostgreSQL 16 (or the cloud's managed PostgreSQL instead) |
| `backup` | The daily backup and restore test |

The mobile app is published to the stores separately (EAS) and points at the API domain.

## First start

1. **A server in Egypt** with Docker installed. Ports 80 and 443 should be open; nothing else.
2. **Two domains** pointing at the server, for example `console.mosta3lem.eg` and `api.mosta3lem.eg`.
3. **The code:** `git clone` the repository on the server.
4. **Settings:** copy `ops/.env.example` to `ops/.env` and fill it in. `POSTGRES_PASSWORD` and `FILES_KEY` are long random values; keep a copy of both in the cloud's secret store, and `FILES_KEY` in a second safe place too.
5. **Start:**
   ```
   docker compose -f ops/docker-compose.yml --env-file ops/.env up -d --build
   ```
6. **Check:** `https://<api domain>/health/ready` answers `"ok": true` once the first backup has run. Before that it reports the backup as missing.
7. **The first Super admin:**
   ```
   docker compose -f ops/docker-compose.yml --env-file ops/.env run --rm api node src/create-admin.js --name "Full Name" --email name@company.eg
   ```
   They get an email to choose a password, set up their authenticator app at the first sign-in, then invite everyone else from the console.

A live server refuses to start until real SMS and email providers are set (`MESSAGING_DRIVER`). For a closed test server, `ALLOW_DEV_MESSAGING=true` puts codes in the log instead.

## Staging

Staging is the same setup with its own settings, data and keys. Use it to try every change before production.
```
cp ops/staging.env.example ops/staging.env
docker compose -f ops/docker-compose.yml --env-file ops/staging.env -p mosta3lem-staging up -d --build
```
On one machine, staging needs its own ports or its own server. A second small server is simpler.

## Updating

```
git pull
docker compose -f ops/docker-compose.yml --env-file ops/.env up -d --build
```
- Database changes (`backend/migrations`) run by themselves when the API starts.
- With two copies, one keeps answering while the other restarts.
- Merge to `main` only when the GitHub checks are green, and try it on staging first.

## Backups

- **What and when:** the database and the files, every day at `BACKUP_HOUR` (UTC), into `BACKUP_PATH`. Kept `BACKUP_KEEP_DAYS` days.
- **Restore test:** right after each backup, it is restored into a scratch database and checked.
- **Where results show:** both results are recorded in the database. `/health/ready` and the alert emails report a missing or failed backup.
- **Copy them off the server** every day, to the cloud's storage in Egypt. A backup on the same disk does not survive losing the server.
- **`FILES_KEY` is not in the backups.** Without it the files cannot be read, so keep it apart.
- **To restore after a loss:**
  1. Stop the API.
  2. Create an empty database.
  3. Restore into it:
     ```
     CONFIRM=yes DATABASE_URL=... FILES_DIR=... sh ops/backup/restore.sh db-XXXX.dump files-XXXX.tar.gz
     ```
  4. Start the API with the same `FILES_KEY`.

## Watching it

- **Uptime monitor:** point any uptime monitor (the cloud's own, or an external one) at `https://<api domain>/health/ready` every minute. A 503 means:
  - the database does not answer;
  - the background clock stopped;
  - or there is no recent backup.
- **Alert emails:** `ALERT_EMAILS` get an email when one of these needs a person, at most once every 6 hours per problem:
  - the clock failed 3 times;
  - notifications could not be delivered;
  - a backup is missing or failed;
  - a restore test failed.
- **Logs:** `docker compose logs -f api` shows the logs, without passwords, codes or tokens. The console's **Security log** shows sign-in trouble.

## Changing the encryption key (`FILES_KEY`)

Do this if the key may have leaked, or once a year.
1. Make a new key:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Take a backup.
3. Stop the API.
4. Re-encrypt every file and authenticator secret with the new key:
   ```
   docker compose -f ops/docker-compose.yml --env-file ops/.env run --rm api node src/rotate-files-key.js --new-key <new key>
   ```
   If it stops half-way, run it again; whatever is already done is skipped.
5. Put the new key in `ops/.env` and the secret store.
6. Start the API, and check that photos open in the console.
7. Only then destroy the old key.

## A lost phone (Super admin or Finance)

Another Super admin uses **Reset sign-in** on the person in the console. If there is none:
```
docker compose -f ops/docker-compose.yml --env-file ops/.env run --rm api node src/reset-authenticator.js --email name@company.eg
```
