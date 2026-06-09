#!/usr/bin/env bash
# Backup diario de PostgreSQL (contenedor tasks-db) con retención de 14 días.
# Se ejecuta vía cron en el servidor: /etc/cron.d/pg-backup.
# Restore: gunzip -c backups/tasksdb-YYYY-MM-DD.sql.gz | docker exec -i tasks-db psql -U $DB_USER -d $DB_NAME
set -euo pipefail
# Los dumps contienen datos: que nazcan 600 aunque cron herede umask 022.
umask 077

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

# Detecta salidas vacías: si pg_dump no escribe nada, gzip deja ~20 bytes.
# (No se usa un umbral mayor: el dump gzip de una BD casi vacía puede bajar
# de 1KB y daría falsas alarmas; los fallos de pg_dump ya los corta pipefail.)
if [ "$(stat -c%s "${OUT}")" -lt 100 ]; then
  echo "ERROR: backup sospechosamente pequeño: ${OUT}" >&2
  exit 1
fi

find "${BACKUP_DIR}" -name 'tasksdb-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "OK: ${OUT} ($(du -h "${OUT}" | cut -f1))"
