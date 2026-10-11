#!/usr/bin/env bash
set -euo pipefail
set +x

readonly host_port=55434
readonly source_container="acta-cai-245-source-$$"
readonly restore_container="acta-cai-245-restored-$$"
readonly backup_file="$(mktemp "${TMPDIR:-/tmp}/acta-cai-245-integration.XXXXXX")"
readonly database_url="postgresql://acta_restore:acta_restore_local_only@127.0.0.1:${host_port}/acta_restore"
readonly topic_id="cai-245-topic"
readonly question_id="cai-245-question"

cleanup() {
  docker rm -f "$source_container" "$restore_container" >/dev/null 2>&1 || true
  rm -f "$backup_file"
}
trap cleanup EXIT INT TERM

start_postgres() {
  local name="$1"
  docker run --detach --name "$name" \
    -e POSTGRES_USER=acta_restore \
    -e POSTGRES_PASSWORD=acta_restore_local_only \
    -e POSTGRES_DB=acta_restore \
    -p "127.0.0.1:${host_port}:5432" \
    postgres:16 >/dev/null
  for _ in {1..30}; do
    if docker exec "$name" pg_isready -U acta_restore -d acta_restore >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  docker exec "$name" pg_isready -U acta_restore -d acta_restore >/dev/null
}

start_postgres "$source_container"
DATABASE_URL="$database_url" npx prisma db push --skip-generate --schema modules/db/prisma/schema.prisma
docker exec -i "$source_container" psql -v ON_ERROR_STOP=1 -U acta_restore -d acta_restore <<SQL
CREATE TABLE "_prisma_migrations" (
  id varchar(36) PRIMARY KEY,
  checksum varchar(64) NOT NULL,
  finished_at timestamptz,
  migration_name varchar(255) NOT NULL,
  logs text,
  rolled_back_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  applied_steps_count integer NOT NULL DEFAULT 0
);
INSERT INTO topics (id, name, "createdAt", "updatedAt")
VALUES ('$topic_id', 'CAI-245 fixture topic', now(), now());
INSERT INTO questions (id, "topicId", "questionText", "createdAt", "updatedAt")
VALUES ('$question_id', '$topic_id', 'CAI-245 fixture question?', now(), now());
SQL
for migration_path in modules/db/prisma/migrations/*/; do
  migration_name="$(basename "$migration_path")"
  docker exec "$source_container" psql -v ON_ERROR_STOP=1 -U acta_restore -d acta_restore \
    -c "INSERT INTO \"_prisma_migrations\" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (gen_random_uuid()::text, '', now(), '$migration_name', 1)" \
    >/dev/null
done
docker exec "$source_container" pg_dump -U acta_restore -d acta_restore \
  --format=custom --no-owner --no-acl >"$backup_file"

docker rm -f "$source_container" >/dev/null
start_postgres "$restore_container"
docker exec -i "$restore_container" pg_restore -U acta_restore -d acta_restore \
  --no-owner --no-acl <"$backup_file"

DATABASE_URL="$database_url" \
  EXPECTED_TOPIC_ID="$topic_id" \
  EXPECTED_QUESTION_ID="$question_id" \
  node scripts/database/production-contract.mjs integrity

echo "Disposable backup and restore integration passed on host port 55434."
