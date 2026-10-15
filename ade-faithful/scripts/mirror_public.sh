#!/usr/bin/env bash
# Mirror ade-faithful/ into the deployed public/ tree.
# public/proxy.php exists only in public/ — it must survive --delete.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
rsync -a --delete \
  --exclude proxy.php \
  --exclude temp_flask_server.py --exclude genconfig.py --exclude 'requirements*' \
  --exclude .venv --exclude tests --exclude scripts --exclude .gitignore --exclude README.md \
  --exclude config.js --exclude config.example.js --exclude __pycache__ --exclude .pytest_cache \
  "$here/" "$here/../public/"
test -f "$here/../public/proxy.php"
