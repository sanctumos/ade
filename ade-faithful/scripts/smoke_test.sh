#!/usr/bin/env bash
# ade-faithful smoke — project venv + Playwright
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
python -m playwright install chromium

export ADE_SMOKE_BASE="${ADE_SMOKE_BASE:-http://127.0.0.1:5055}"
export ADE_FLASK_UPSTREAM="${ADE_FLASK_UPSTREAM:-http://127.0.0.1:8283}"

# Start flask if nothing is on 5055
STARTED_FLASK=0
if ! curl -fsS -m 2 "$ADE_SMOKE_BASE/" >/dev/null 2>&1; then
  python temp_flask_server.py >/tmp/ade-faithful-flask.log 2>&1 &
  FLASK_PID=$!
  STARTED_FLASK=1
  for _ in $(seq 1 30); do
    if curl -fsS -m 1 "$ADE_SMOKE_BASE/" >/dev/null 2>&1; then break; fi
    sleep 0.2
  done
fi

cleanup() {
  if [[ "$STARTED_FLASK" -eq 1 && -n "${FLASK_PID:-}" ]]; then
    kill "$FLASK_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pytest -q tests/
echo "ade-faithful smoke OK"
