"""
Reload the indicative visa matrix (replaces the visa_requirements table).

    python -m app.cli.import_visa_matrix
    python -m app.cli.import_visa_matrix path/to/passport-index-tidy-iso2.csv

After replacing the bundled CSV, update SOURCE["as_of"] in app/services/visa_matrix.py.
"""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from app.core.database import async_session_maker, init_db
from app.services.visa_matrix import DATA_FILE, import_csv


async def run(path: Path) -> None:
    await init_db()
    async with async_session_maker() as session:
        n = await import_csv(session, path)
    print(f"Imported {n} passport/destination pairs from {path}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("path", type=Path, nargs="?", default=DATA_FILE)
    asyncio.run(run(p.parse_args().path))


if __name__ == "__main__":
    main()
