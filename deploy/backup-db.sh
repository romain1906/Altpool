#!/usr/bin/env bash
# =====================================================================
# Backup quotidien de la base Postgres + uploads
# À cron-er sur le serveur :   0 3 * * * /opt/altpool/deploy/backup-db.sh
# =====================================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/altpool}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
ts=$(date +%Y%m%d-%H%M%S)

echo "▶ Dump Postgres → $BACKUP_DIR/db-$ts.sql.gz"
docker exec altpool-db pg_dump -U "${DB_USER:-altpool}" "${DB_NAME:-altpool}" | gzip > "$BACKUP_DIR/db-$ts.sql.gz"

echo "▶ Tarball uploads → $BACKUP_DIR/uploads-$ts.tar.gz"
docker run --rm \
  -v altpool_altpool-uploads:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads-$ts.tar.gz" -C /data .

echo "▶ Purge des backups > $RETENTION_DAYS jours"
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "✓ Backup OK"
