
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")"
if [[ -f .env ]]; then set -a; source <(tr -d '\r' < .env); set +a; fi

DB_USER="${POSTGRES_USER:-studio}"
SOURCE_DB="${POSTGRES_DB:-studio_riff}"
FILE="${1:?Usage : ./restore.sh <fichier.dump> [base_cible]}"
TARGET_DB="${2:-${SOURCE_DB}_restore}"

[[ -f "$FILE" ]] || { echo "✘ Fichier introuvable : $FILE" >&2; exit 1; }
if [[ "$TARGET_DB" == "$SOURCE_DB" ]]; then
  echo "✘ Refus : la restauration se fait dans une nouvelle base, pas dans $SOURCE_DB" >&2
  exit 1
fi

psql_count() { # $1 = base, $2 = table
  docker compose exec -T postgres psql -U "$DB_USER" -d "$1" -tAc "SELECT count(*) FROM $2"
}

SECONDS=0
echo "→ Création de la base $TARGET_DB"
docker compose exec -T postgres dropdb -U "$DB_USER" --if-exists "$TARGET_DB"
docker compose exec -T postgres createdb -U "$DB_USER" "$TARGET_DB"

echo "→ Restauration de $FILE"
docker compose exec -T postgres pg_restore -U "$DB_USER" -d "$TARGET_DB" --no-owner --exit-on-error < "$FILE"
echo "✔ Restauration terminée en ${SECONDS} s"

echo
printf "%-20s %12s %12s\n" "table" "$SOURCE_DB" "$TARGET_DB"
status=0
for table in rooms members bookings schema_migrations; do
  src=$(psql_count "$SOURCE_DB" "$table")
  dst=$(psql_count "$TARGET_DB" "$table")
  mark="✔"; [[ "$src" == "$dst" ]] || { mark="✘"; status=1; }
  printf "%-20s %12s %12s  %s\n" "$table" "$src" "$dst" "$mark"
done

# La contrainte d'exclusion fait partie de ce qu'il faut retrouver
constraint=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$TARGET_DB" -tAc \
  "SELECT count(*) FROM pg_constraint WHERE conname = 'bookings_no_overlap'")
[[ "$constraint" == "1" ]] && echo "✔ Contrainte bookings_no_overlap présente" \
                           || { echo "✘ Contrainte bookings_no_overlap absente"; status=1; }

exit $status
