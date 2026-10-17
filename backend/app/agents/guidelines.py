"""
Country guidelines: the only source of immigration facts the agents may use.

Freshness is decided here, in code. A guideline is `current` only when it has been
verified, the verification is younger than GUIDELINE_MAX_AGE_DAYS, and it has not
passed its own `valid_until`. Anything else is `stale` or `missing`, and the agent
must tell the user the country's information is being updated.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from typing import Literal, Optional

from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import CountryGuideline, utcnow

GUIDELINE_MAX_AGE_DAYS = int(os.getenv("GUIDELINE_MAX_AGE_DAYS", "90"))
PURPOSES = ("tourism", "study", "work", "job_search", "family")

Freshness = Literal["current", "stale", "missing"]


@dataclass
class Lookup:
    status: Freshness
    guideline: Optional[CountryGuideline]
    reason: str


def freshness(g: CountryGuideline, today: Optional[date] = None) -> tuple[Freshness, str]:
    today = today or date.today()
    if g.verified_at is None:
        return "stale", "not verified yet"
    age = (utcnow() - g.verified_at).days
    if age > GUIDELINE_MAX_AGE_DAYS:
        return "stale", f"last verified {age} days ago (limit {GUIDELINE_MAX_AGE_DAYS})"
    if g.valid_until and g.valid_until < today:
        return "stale", f"valid only until {g.valid_until.isoformat()}"
    return "current", f"verified {g.verified_at.date().isoformat()}"


async def find(session: AsyncSession, destination: str, origin: str, purpose: str) -> Lookup:
    """Exact citizenship match first, then the "*" (any citizenship) entry."""
    destination, origin = destination.upper(), origin.upper()
    rows = (
        await session.exec(
            select(CountryGuideline).where(
                CountryGuideline.destination_code == destination,
                CountryGuideline.purpose == purpose,
                or_(CountryGuideline.origin_code == origin, CountryGuideline.origin_code == "*"),
            )
        )
    ).all()
    if not rows:
        return Lookup("missing", None, f"no guideline for {destination}, purpose {purpose}, citizenship {origin}")
    g = sorted(rows, key=lambda r: r.origin_code == "*")[0]
    status, reason = freshness(g)
    return Lookup(status, g, reason)


async def coverage(session: AsyncSession) -> list[dict]:
    """What the platform can currently answer about, for the agent's orientation."""
    rows = (await session.exec(select(CountryGuideline))).all()
    out = []
    for g in rows:
        status, reason = freshness(g)
        out.append({
            "destination": g.destination_code, "destination_name": g.destination_name, "origin": g.origin_code,
            "purpose": g.purpose, "visa_type": g.visa_type, "status": status, "reason": reason,
        })
    return sorted(out, key=lambda r: (r["destination"], r["purpose"], r["origin"]))
