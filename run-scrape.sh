#!/bin/bash
# Run Letta ADE scraper with credentials from .env (if present)
set -e
cd "$(dirname "$0")"
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
exec node scrape.js
