"""
Indicative visa requirements per passport, from the open Passport Index dataset.

The snapshot lives in data/visa-matrix/ (see its README for source, licence and date).
It covers short tourist visits only and is not checked by Unbound, so the explore map
always shows it with SOURCE and lets verified country_guidelines override it.

    python -m app.cli.import_visa_matrix            # reload the bundled snapshot
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Optional

from sqlalchemy import delete, func, insert
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import VisaRequirement, utcnow

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "visa-matrix" / "passport-index-tidy-iso2.csv"

# Update together with the CSV.
SOURCE = {
    "title": "Passport Index dataset",
    "url": "https://github.com/ilyankou/passport-index-dataset",
    "as_of": "2025-01-12",
    "licence": "MIT",
}

_TEXT = {
    "visa free": "visa_free",
    "visa on arrival": "visa_on_arrival",
    "e-visa": "evisa",
    "eta": "eta",
    "visa required": "visa_required",
    "no admission": "no_admission",
}


def parse_requirement(raw: str) -> Optional[tuple[str, Optional[int]]]:
    """Dataset value -> (category, visa-free days). None for "-1" (the passport's own country)."""
    value = raw.strip().lower()
    if value == "-1":
        return None
    if value.isdigit():
        return "visa_free", int(value)
    if value in _TEXT:
        return _TEXT[value], None
    raise ValueError(f"unknown requirement value {raw!r}")


def read_csv(path: Path = DATA_FILE) -> list[dict]:
    rows = []
    with path.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            parsed = parse_requirement(r["Requirement"])
            if parsed is None:
                continue
            category, days = parsed
            rows.append({
                "origin_code": r["Passport"].strip().upper(),
                "destination_code": r["Destination"].strip().upper(),
                "category": category,
                "stay_days": days,
                "raw": r["Requirement"].strip(),
            })
    return rows


async def import_csv(session: AsyncSession, path: Path = DATA_FILE) -> int:
    """Replaces the whole table with the file's contents."""
    rows = read_csv(path)
    now = utcnow()
    await session.execute(delete(VisaRequirement))
    for i in range(0, len(rows), 5000):
        chunk = [{**r, "id": f"{r['origin_code']}-{r['destination_code']}", "imported_at": now} for r in rows[i:i + 5000]]
        await session.execute(insert(VisaRequirement), chunk)
    await session.commit()
    return len(rows)


async def ensure_loaded(session: AsyncSession) -> None:
    """First start: load the bundled snapshot so the explore map works out of the box."""
    count = (await session.exec(select(func.count()).select_from(VisaRequirement))).one()
    if not count and DATA_FILE.exists():
        await import_csv(session)


async def for_origin(session: AsyncSession, origin: str) -> dict[str, VisaRequirement]:
    rows = (await session.exec(select(VisaRequirement).where(VisaRequirement.origin_code == origin))).all()
    return {r.destination_code: r for r in rows}


async def passports(session: AsyncSession) -> list[str]:
    return sorted((await session.exec(select(VisaRequirement.origin_code).distinct())).all())
