"""
Load country guidelines into the database (upsert by destination + origin + purpose).

    python -m app.cli.import_guidelines data/guidelines/hu-from-ru.json
    python -m app.cli.import_guidelines data/guidelines/ --dry-run

Re-importing an entry bumps its version. verified_at is taken from the file: the
pipeline (or a reviewer) sets it only after checking the official sources.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from pydantic import ValidationError

from app.agents import guidelines
from app.agents.schema import GuidelineIn
from app.core.database import async_session_maker, init_db


def load(path: Path) -> list[GuidelineIn]:
    files = sorted(path.glob("*.json")) if path.is_dir() else [path]
    out = []
    for f in files:
        data = json.loads(f.read_text())
        for i, item in enumerate(data if isinstance(data, list) else [data]):
            try:
                out.append(GuidelineIn.model_validate(item))
            except ValidationError as e:
                sys.exit(f"{f} entry {i}: invalid\n{e}")
    return out


async def upsert_all(items: list[GuidelineIn]) -> None:
    await init_db()
    async with async_session_maker() as session:
        for g in items:
            _, action = await guidelines.upsert(session, g)
            state = "verified" if g.verified_at else "UNVERIFIED (agents will treat it as not up to date)"
            print(f"{g.destination_code} from {g.origin_code} / {g.purpose}: {action}, {state}")
        await session.commit()


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("path", type=Path)
    p.add_argument("--dry-run", action="store_true", help="validate only")
    args = p.parse_args()
    items = load(args.path)
    if args.dry_run:
        print(f"{len(items)} guideline(s) valid")
        return
    asyncio.run(upsert_all(items))


if __name__ == "__main__":
    main()
