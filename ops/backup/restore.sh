#!/bin/sh
# Restore a backup for real (after losing the database or the server). Stop every copy of the
# API first, restore into an EMPTY database, then start the API with the same FILES_KEY.
#
#   CONFIRM=yes DATABASE_URL=... FILES_DIR=/files sh restore.sh /backups/db-XXXX.dump [/backups/files-XXXX.tar.gz]
set -eu

db_file=${1:-}
files_file=${2:-}
[ -n "$db_file" ] || { echo "usage: restore.sh db-XXXX.dump [files-XXXX.tar.gz]" >&2; exit 2; }
[ "${CONFIRM:-}" = "yes" ] || { echo "Set CONFIRM=yes: this writes into $DATABASE_URL" >&2; exit 2; }

existing=$(psql "$DATABASE_URL" -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
if [ "$existing" != "0" ]; then
  echo "The target database is not empty ($existing tables). Restore into a new, empty database." >&2
  exit 1
fi

pg_restore --no-owner --exit-on-error --dbname="$DATABASE_URL" "$db_file"
echo "database restored from $(basename "$db_file")"

if [ -n "$files_file" ]; then
  mkdir -p "${FILES_DIR:-/files}"
  tar -xzf "$files_file" -C "${FILES_DIR:-/files}"
  echo "files restored from $(basename "$files_file") into ${FILES_DIR:-/files}"
fi
echo "Now start the API with the same FILES_KEY as when the backup was taken."
