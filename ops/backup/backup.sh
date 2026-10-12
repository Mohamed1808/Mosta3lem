#!/bin/sh
# Daily backup of Mosta3lem: the database (pg_dump, custom format) and the files folder
# (already encrypted with FILES_KEY). Each result is recorded in ops_events, where the API
# reads it for /health/ready and for alerts. Old backups are removed after BACKUP_KEEP_DAYS.
#
#   DATABASE_URL      the live database (required)
#   BACKUP_DIR        where backups go (default /backups); copy it off the server too
#   FILES_DIR         the API's files folder, mounted read-only (default /files; skipped if absent)
#   BACKUP_KEEP_DAYS  default 30
#
# FILES_KEY is not in the backup on purpose: keep it in the secret store, separately.
set -eu

dir=${BACKUP_DIR:-/backups}
files=${FILES_DIR:-/files}
keep=${BACKUP_KEEP_DAYS:-30}
stamp=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$dir"

record() {
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 \
    -c "INSERT INTO ops_events (kind, ok, detail) VALUES ('backup', $1, '$2'::jsonb)" || true
}

db_file="$dir/db-$stamp.dump"
if ! pg_dump --format=custom --no-owner --file="$db_file.part" "$DATABASE_URL"; then
  rm -f "$db_file.part"
  record false '{"step":"pg_dump"}'
  echo "backup: pg_dump failed" >&2
  exit 1
fi
mv "$db_file.part" "$db_file"

# A dump that pg_restore cannot list is not a backup.
if ! pg_restore --list "$db_file" > /dev/null; then
  record false '{"step":"check"}'
  echo "backup: the dump cannot be read" >&2
  exit 1
fi

files_name=""
if [ -d "$files" ]; then
  files_name="files-$stamp.tar.gz"
  if ! tar -czf "$dir/$files_name.part" -C "$files" .; then
    rm -f "$dir/$files_name.part"
    record false '{"step":"files"}'
    echo "backup: the files archive failed" >&2
    exit 1
  fi
  mv "$dir/$files_name.part" "$dir/$files_name"
fi

kb=$(du -k "$db_file" | cut -f1)
record true "{\"db\":\"db-$stamp.dump\",\"files\":\"$files_name\",\"kb\":$kb}"

find "$dir" -name 'db-*.dump' -mtime +"$keep" -delete
find "$dir" -name 'files-*.tar.gz' -mtime +"$keep" -delete
echo "backup: db-$stamp.dump ($kb KB)${files_name:+ and $files_name}"
