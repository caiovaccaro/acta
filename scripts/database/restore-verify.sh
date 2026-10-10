#!/usr/bin/env bash
set -euo pipefail
set +x

: "${DIRECT_DATABASE_URL:?DIRECT_DATABASE_URL is required}"
: "${EXPECTED_TOPIC_ID:?EXPECTED_TOPIC_ID is required}"
: "${EXPECTED_QUESTION_ID:?EXPECTED_QUESTION_ID is required}"

readonly host_port="${POSTGRES_RESTORE_PORT:-55434}"
if [[ "$host_port" != "55434" ]]; then
  echo "Restore verification requires unique host port 55434." >&2
  exit 1
fi

readonly container="acta-cai-245-restore-$$"
readonly backup_dir="$(mktemp -d "${TMPDIR:-/tmp}/acta-cai-245.XXXXXX")"
chmod 700 "$backup_dir"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$backup_dir"
}
trap cleanup EXIT INT TERM

echo "Creating a private logical backup from the canonical database..."
docker run --rm \
  -e DIRECT_DATABASE_URL \
  -v "$backup_dir:/backup" \
  postgres:16 \
  sh -eu -c 'umask 077; pg_dump "$DIRECT_DATABASE_URL" --format=custom --no-owner --no-acl --file=/backup/acta.dump'

echo "Starting disposable PostgreSQL on host port 55434..."
docker run --detach --name "$container" \
  -e POSTGRES_USER=acta_restore \
  -e POSTGRES_PASSWORD=acta_restore_local_only \
  -e POSTGRES_DB=acta_restore \
  -p "127.0.0.1:${host_port}:5432" \
  postgres:16 >/dev/null

for _ in {1..30}; do
  if docker exec "$container" pg_isready -U acta_restore -d acta_restore >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$container" pg_isready -U acta_restore -d acta_restore >/dev/null

echo "Restoring the logical backup into disposable PostgreSQL..."
docker exec -i "$container" \
  pg_restore --username=acta_restore --dbname=acta_restore --no-owner --no-acl \
  <"$backup_dir/acta.dump"

echo "Running read-only integrity against the restored database..."
DATABASE_URL="postgresql://acta_restore:acta_restore_local_only@127.0.0.1:${host_port}/acta_restore" \
  EXPECTED_TOPIC_ID="$EXPECTED_TOPIC_ID" \
  EXPECTED_QUESTION_ID="$EXPECTED_QUESTION_ID" \
  node scripts/database/production-contract.mjs integrity

echo "Logical backup and disposable restore verification passed."
