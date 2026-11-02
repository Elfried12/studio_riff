
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash : ne pas réécrire les chemins passés à Docker

cd "$(dirname "$0")"
# Charge .env en supprimant les fins de ligne Windows (\r)
if [[ -f .env ]]; then set -a; source <(tr -d '\r' < .env); set +a; fi

DB_USER="${POSTGRES_USER:-studio}"
DB_NAME="${POSTGRES_DB:-studio_riff}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$BACKUP_DIR/${DB_NAME}_${stamp}.dump"

echo "→ Sauvegarde de $DB_NAME vers $file"
# Écriture dans un fichier temporaire : un dump interrompu ne ressemble jamais à une sauvegarde valide
docker compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$file.part"
mv "$file.part" "$file"

# Vérification : le fichier doit être lisible par pg_restore
docker compose exec -T postgres pg_restore --list < "$file" > /dev/null
echo "✔ Sauvegarde valide ($(du -h "$file" | cut -f1))"

# Rétention : supprime les sauvegardes de plus de RETENTION_DAYS jours
deleted=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "✔ Rétention $RETENTION_DAYS jours : $deleted ancienne(s) sauvegarde(s) supprimée(s)"
