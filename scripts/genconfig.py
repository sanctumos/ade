#!/usr/bin/env python3
"""Read repo-root .env (ADE_BASE, ADE_KEY) and write public/config.js."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"


def main():
    base = "http://localhost:8283"
    key = ""
    env = ROOT / ".env"
    if env.is_file():
        for line in env.read_text().splitlines():
            line = line.strip()
            if line.startswith("ADE_BASE="):
                base = line.split("=", 1)[1].strip().strip("\"'")
            elif line.startswith("ADE_KEY="):
                key = line.split("=", 1)[1].strip().strip("\"'")
    out = """// Generated from .env by scripts/genconfig.py
window.ADE_CONFIG = {
  base: %s,
  key: %s
};
""" % (repr(base), repr(key))
    (PUBLIC / "config.js").write_text(out)
    print("Wrote public/config.js (base=%r, key=%s)" % (base, "set" if key else "empty"))


if __name__ == "__main__":
    main()
