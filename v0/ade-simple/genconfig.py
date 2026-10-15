#!/usr/bin/env python3
"""Read .env (ADE_BASE, ADE_KEY) and write config.js. No Node required."""
import os

def main():
    base = 'http://localhost:8283'
    key = ''
    if os.path.isfile('.env'):
        with open('.env') as f:
            for line in f:
                line = line.strip()
                if line.startswith('ADE_BASE='):
                    base = line.split('=', 1)[1].strip().strip('"\'')
                elif line.startswith('ADE_KEY='):
                    key = line.split('=', 1)[1].strip().strip('"\'')
    out = '''// Generated from .env by genconfig.py
window.ADE_CONFIG = {
  base: %s,
  key: %s
};
''' % (repr(base), repr(key))
    with open('config.js', 'w') as f:
        f.write(out)
    print('Wrote config.js (base=%r, key=%s)' % (base, 'set' if key else 'empty'))

if __name__ == '__main__':
    main()
