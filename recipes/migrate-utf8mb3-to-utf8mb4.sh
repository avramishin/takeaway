#!/usr/bin/env bash
#
# Migrates MySQL tables whose table-level collation is not utf8mb4_general_ci
# to utf8mb4 COLLATE utf8mb4_general_ci using pt-online-schema-change.
# Large tables: OSC creates a shadow table and copies in chunks — plan maintenance windows
# and monitor replica lag if applicable.
#
# Usage:
#   export MYSQL_HOST=...
#   export MYSQL_DATABASE=...
#   export MYSQL_USER=...
#   export MYSQL_PASSWORD=...   # or rely on ~/.my.cnf
#   ./migrate-utf8mb3-to-utf8mb4.sh [--dry-run] [--list-only]
#
# Dependencies (Debian/Ubuntu):
#   sudo apt install mysql-client
#   sudo apt-get install percona-toolkit
#
# Optional env:
#   MYSQL_PORT=3306
#   PTOSC_BIN=pt-online-schema-change
#   PTOSC_EXTRA_ARGS="--max-load Threads_running=50 --critical-load Threads_running=100"
#
# If pt-online-schema-change fails on one table (e.g. no PK for --preserve-triggers),
# the script logs a warning and continues with the remaining tables. Exit status is 1
# if any table failed.

set -euo pipefail

DRY_RUN=0
LIST_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --list-only) LIST_ONLY=1 ;;
    -h|--help)
      sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

MYSQL_HOST="${MYSQL_HOST:-}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-}"
MYSQL_USER="${MYSQL_USER:-}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
PTOSC_BIN="${PTOSC_BIN:-pt-online-schema-change}"
PTOSC_EXTRA_ARGS="${PTOSC_EXTRA_ARGS:-}"

# Target is fixed: charset utf8mb4, collation utf8mb4_general_ci (list filter + ALTER).
TARGET_TABLE_COLLATION='utf8mb4_general_ci'

if [[ -z "$MYSQL_DATABASE" ]]; then
  echo "MYSQL_DATABASE is required." >&2
  exit 1
fi

mysql_exec() {
  local args=()
  [[ -n "$MYSQL_HOST" ]] && args+=(-h"$MYSQL_HOST")
  args+=(-P"$MYSQL_PORT" -N -B -D"$MYSQL_DATABASE")
  [[ -n "$MYSQL_USER" ]] && args+=(-u"$MYSQL_USER")
  if [[ -n "$MYSQL_PASSWORD" ]]; then
    MYSQL_PWD="$MYSQL_PASSWORD" mysql "${args[@]}" "$@"
  else
    mysql "${args[@]}" "$@"
  fi
}

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client not found in PATH." >&2
  exit 1
fi

if [[ "$LIST_ONLY" -eq 0 ]] && ! command -v "$PTOSC_BIN" >/dev/null 2>&1; then
  echo "Percona Toolkit not found: $PTOSC_BIN" >&2
  exit 1
fi

# Tables whose TABLE_COLLATION is not utf8mb4_general_ci (table-level; includes NULL).
# Uses DATABASE() so the schema name is not interpolated into SQL.
# Skips instruments_prices_history_* (LIKE treats _ as wildcard; REGEXP matches literal names).
mapfile -t TABLES < <(mysql_exec -e "
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_TYPE = 'BASE TABLE'
    AND (TABLE_COLLATION IS NULL OR TABLE_COLLATION <> '${TARGET_TABLE_COLLATION}')
    AND TABLE_NAME NOT REGEXP '^instruments_prices_history_'
  ORDER BY TABLE_NAME;
" || true)

if [[ ${#TABLES[@]} -eq 0 ]]; then
  echo "No BASE TABLE found in '$MYSQL_DATABASE' whose collation differs from '${TARGET_TABLE_COLLATION}'."
  exit 0
fi

echo "Found ${#TABLES[@]} table(s) not using table collation '${TARGET_TABLE_COLLATION}' (will CONVERT to utf8mb4 / ${TARGET_TABLE_COLLATION}):"
printf '  %s\n' "${TABLES[@]}"

if [[ "$LIST_ONLY" -eq 1 ]]; then
  exit 0
fi

build_ptosc_dsn() {
  local h="$MYSQL_HOST" port="$MYSQL_PORT" D="$MYSQL_DATABASE" t="$1" u="$MYSQL_USER"
  local dsn="h=${h},P=${port},D=${D},t=${t}"
  [[ -n "$u" ]] && dsn+=",u=${u}"
  echo "$dsn"
}

run_ptosc() {
  local table="$1"
  local dsn alter ptosc_pass=()
  dsn="$(build_ptosc_dsn "$table")"
  alter="CONVERT TO CHARACTER SET utf8mb4 COLLATE ${TARGET_TABLE_COLLATION}"
  [[ -n "$MYSQL_PASSWORD" ]] && ptosc_pass+=(--password="$MYSQL_PASSWORD")

  # shellcheck disable=SC2086
  if [[ "$DRY_RUN" -eq 1 ]]; then
    local pass_hint=""
    [[ -n "$MYSQL_PASSWORD" ]] && pass_hint=" --password='***'"
    echo "$PTOSC_BIN${pass_hint} --execute --preserve-triggers --alter \"$alter\" \"$dsn\" ${PTOSC_EXTRA_ARGS}"
    return 0
  fi

  echo "---- Migrating: $table ----"
  # shellcheck disable=SC2086
  "$PTOSC_BIN" \
    "${ptosc_pass[@]}" \
    --execute \
    --preserve-triggers \
    --alter "$alter" \
    "$dsn" \
    ${PTOSC_EXTRA_ARGS}
}

FAILED_TABLES=()
for table in "${TABLES[@]}"; do
  [[ -z "$table" ]] && continue
  if ! run_ptosc "$table"; then
    FAILED_TABLES+=("$table")
    echo "WARNING: skipped '$table' after pt-online-schema-change failure; continuing." >&2
  fi
done

if [[ ${#FAILED_TABLES[@]} -gt 0 ]]; then
  echo "Done with errors. Failed (${#FAILED_TABLES[@]}): ${FAILED_TABLES[*]}" >&2
  exit 1
fi

echo "Done."
