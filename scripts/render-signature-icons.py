#!/usr/bin/env python3
"""Render signature PNG icons via Node/sharp (96x96 retina sources)."""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
RENDER_SCRIPT = SCRIPT_DIR / "render-signature-icons.mjs"


def main() -> None:
    result = subprocess.run(
        ["node", str(RENDER_SCRIPT)],
        cwd=SCRIPT_DIR.parent,
        check=False,
    )
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
