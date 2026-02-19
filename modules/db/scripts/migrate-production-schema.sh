#!/bin/bash
set -euo pipefail

# Run Prisma migrations against production/Neon only.
# Priority:
#   1) PRODUCTION_DATABASE_URL
#   2) PROD_DATABASE_URL
# It intentionally does NOT use local DATABASE_URL as fallback.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

read_env_var() {
  local key="$1"
  local env_file="$2"

  awk -v key="$key" '
    {
      line = $0
      sub(/\r$/, "", line)
    }
    line ~ "^[[:space:]]*" key "[[:space:]]*=" {
      val = line
      sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "", val)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)

      if ((val ~ /^".*"$/) || (val ~ /^'\''.*'\''$/)) {
        val = substr(val, 2, length(val) - 2)
      }

      last = val
    }
    END {
      if (length(last) > 0) {
        print last
      }
    }
  ' "$env_file"
}

if [ -f "$PROJECT_ROOT/.env" ]; then
  if [ -z "${PRODUCTION_DATABASE_URL:-}" ]; then
    PRODUCTION_DATABASE_URL="$(read_env_var "PRODUCTION_DATABASE_URL" "$PROJECT_ROOT/.env" || true)"
  fi

  if [ -z "${PROD_DATABASE_URL:-}" ]; then
    PROD_DATABASE_URL="$(read_env_var "PROD_DATABASE_URL" "$PROJECT_ROOT/.env" || true)"
  fi
fi

TARGET_URL="${PRODUCTION_DATABASE_URL:-${PROD_DATABASE_URL:-}}"

if [ -z "${TARGET_URL}" ]; then
  echo "❌ Missing production database URL."
  echo "Set PRODUCTION_DATABASE_URL (or PROD_DATABASE_URL) to your Neon connection string."
  exit 1
fi

export DATABASE_URL="$TARGET_URL"

echo "🚀 Applying schema migrations to production database..."
npx prisma migrate deploy
echo "✅ Production schema migrations applied."
