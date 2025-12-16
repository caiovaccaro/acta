#!/bin/bash
# Load environment variables from project root and run a command

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get project root (3 levels up from modules/db/scripts/)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

# Load .env from project root if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Run the command passed as arguments
exec "$@"
