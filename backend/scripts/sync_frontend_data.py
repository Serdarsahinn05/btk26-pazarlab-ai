"""Copy the data files the frontend also reads from backend/app/data (the only place to edit them).

The frontend and backend are built from separate contexts (Docker, Render rootDir, Vercel), so the
frontend keeps a byte-identical copy in frontend/data. Run after editing a backend data file:

    python backend/scripts/sync_frontend_data.py          # copy
    python backend/scripts/sync_frontend_data.py --check  # exit 1 if a copy is stale (tests do this)
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "backend" / "app" / "data"
TARGET = ROOT / "frontend" / "data"
FILES = ("personas.json", "category_rules.json")


def stale() -> list[str]:
    return [name for name in FILES if not (TARGET / name).exists() or (TARGET / name).read_bytes() != (SOURCE / name).read_bytes()]


if __name__ == "__main__":
    if "--check" in sys.argv:
        files = stale()
        print("stale: " + ", ".join(files) if files else "frontend/data is up to date")
        sys.exit(1 if files else 0)
    for name in FILES:
        shutil.copyfile(SOURCE / name, TARGET / name)
    print("copied: " + ", ".join(FILES))
