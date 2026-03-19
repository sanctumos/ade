#!/bin/bash
# Run Letta ADE scraper with credentials from .env (repo root or this folder)
set -e
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
elif [ -f .env ]; then
  set -a
  # shellcheck disable=SC1090
  source .env
  set +a
fi
exec node scrape.js
