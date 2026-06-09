#!/usr/bin/env bash
# Backup diario de PostgreSQL (contenedor tasks-db) con retención de 14 días.
# Se ejecuta vía cron en el servidor: /etc/cron.d/pg-backup.
# Restore: gunzip -c backups/tasksdb-YYYY-MM-DD.sql.gz | docker exec -i tasks-db psql -U $DB_USER -d $DB_NAME
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Lee credenciales del mismo .env que usa docker compose.
set -a
# shellcheck source=/dev/null
source "${REPO_DIR}/.env"
set +a

mkdir -p "${BACKUP_DIR}"

OUT="${BACKUP_DIR}/tasksdb-$(date +%F).sql.gz"
docker exec tasks-db pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${OUT}"

# Un dump vacío comprimido pesa ~20 bytes: si pesa menos de 1KB algo falló.
if [ "$(stat -c%s "${OUT}")" -lt 100 ]; then
  echo "ERROR: backup sospechosamente pequeño: ${OUT}" >&2
  exit 1
fi

find "${BACKUP_DIR}" -name 'tasksdb-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "OK: ${OUT} ($(du -h "${OUT}" | cut -f1))"
