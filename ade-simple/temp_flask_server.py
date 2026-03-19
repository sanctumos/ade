#!/usr/bin/env python3
"""
Moved: the local Flask test server now lives under ade-faithful/ (serves faithful UI).

  cd ../ade-faithful
  python3 temp_flask_server.py
"""
import sys

def main():
    print(
        "temp_flask_server.py for ade-simple was retired.\n"
        "Use:  cd ade-faithful && python3 temp_flask_server.py\n"
        "Same port (5055) and /api proxy behavior; static root is ade-faithful/.",
        file=sys.stderr,
    )
    sys.exit(1)


if __name__ == "__main__":
    main()
