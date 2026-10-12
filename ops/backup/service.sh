#!/bin/sh
# The backup container's loop: once a day at BACKUP_HOUR (UTC, default 0 = 2:00 or 3:00 in
# Cairo), take a backup and then prove it restores. Checks the clock every 10 minutes.
set -u

hour=${BACKUP_HOUR:-0}
last=""
echo "backup service: daily at $hour:00 UTC into ${BACKUP_DIR:-/backups}"
while true; do
  today=$(date -u +%Y-%m-%d)
  now=$(date -u +%H | sed 's/^0//')
  if [ "${now:-0}" -ge "$hour" ] && [ "$last" != "$today" ]; then
    if sh /ops/backup.sh; then sh /ops/restore-test.sh || true; fi
    last=$today
  fi
  sleep 600
done
