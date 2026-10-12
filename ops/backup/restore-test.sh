#!/bin/sh
# Prove the newest backup can be restored: restore it into a scratch database on the same
# server, check the tables and that its data is consistent with the live database, then drop
# it. The result is recorded in ops_events (kind restore_test); a failure becomes an alert.
#
#   DATABASE_URL      the live database; its user may create databases (default setup does)
#   BACKUP_DIR        default /backups
#   RESTORE_TEST_DB   name of the scratch database (default mosta3lem_restore_test)
set -eu

dir=${BACKUP_DIR:-/backups}
name=${RESTORE_TEST_DB:-mosta3lem_restore_test}
base=${DATABASE_URL%%\?*}
target="${base%/*}/$name"

record() {
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 \
    -c "INSERT INTO ops_events (kind, ok, detail) VALUES ('restore_test', $1, '$2'::jsonb)" || true
}
fail() {
  record false "{\"step\":\"$1\"}"
  psql "$DATABASE_URL" -q -c "DROP DATABASE IF EXISTS $name" > /dev/null 2>&1 || true
  echo "restore test: failed at $1" >&2
  exit 1
}
count() { psql "$1" -tA -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM $2"; }

latest=$(ls -1t "$dir"/db-*.dump 2> /dev/null | head -n 1 || true)
[ -n "$latest" ] || fail "no_backup"

psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $name" || fail "drop"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE $name ENCODING 'UTF8' TEMPLATE template0" || fail "create"
pg_restore --no-owner --exit-on-error --dbname="$target" "$latest" || fail "restore"

# The same migrations, people and platform settings; never more records than live has now.
[ "$(count "$target" schema_migrations)" = "$(count "$DATABASE_URL" schema_migrations)" ] || fail "migrations"
[ "$(count "$target" users)" -gt 0 ] || fail "users"
[ "$(count "$target" platform_state)" -gt 0 ] || fail "platform_state"
for t in cases invoices files; do
  [ "$(count "$target" "$t")" -le "$(count "$DATABASE_URL" "$t")" ] || fail "$t"
done

restored_cases=$(count "$target" cases)
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c "DROP DATABASE $name" || fail "cleanup"
record true "{\"backup\":\"$(basename "$latest")\",\"cases\":$restored_cases}"
echo "restore test: $(basename "$latest") restored and checked ($restored_cases cases)"
