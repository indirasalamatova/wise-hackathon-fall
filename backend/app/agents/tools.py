"""
Tools the chat agent can call. Each tool validates its input, works only on the
calling user's data, and does all date / money / requirement logic in code
(app/agents/rules.py). Guideline content is returned only when the guideline is
current; otherwise the tool returns the "being updated" status and nothing else,
so the model can't repeat outdated rules.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Awaitable, Callable, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.agents import guidelines, rules
from app.models import CountryGuideline, Document, DocumentAnalysis, PrefilledForm, Task, User, VisaPlan

Purpose = Literal["tourism", "study", "work", "job_search", "family"]


def updating_message(destination: str, reason: str) -> dict[str, Any]:
    return {
        "status": "not_up_to_date",
        "reason": reason,
        "instruction": f"Tell the user that information about {destination} for this purpose is being updated and will be available soon. "
                       "Do not give requirements, fees or timelines for it from your own knowledge.",
    }


# ------------------------------------------------------------------ inputs

class In(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Trip(In):
    destination_code: str = Field(description="ISO 3166-1 alpha-2 code of the destination, e.g. HU")
    origin_code: str = Field(description="ISO alpha-2 code of the user's citizenship (passport country), e.g. RU")
    purpose: Purpose

    @field_validator("destination_code", "origin_code")
    @classmethod
    def iso2(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("use a 2-letter ISO country code")
        return v


class TripWithDates(Trip):
    travel_date: Optional[str] = Field(default=None, description="Planned entry date, YYYY-MM-DD, or null if unknown")
    stay_days: Optional[int] = Field(default=None, ge=1, le=3650, description="Length of stay in days, or null if unknown")

    @field_validator("travel_date")
    @classmethod
    def iso_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        r = rules.normalize_date(v)
        if not r.iso:
            raise ValueError(f"travel_date must be YYYY-MM-DD ({r.issue})")
        if r.iso < date.today().isoformat():
            raise ValueError("travel_date is in the past")
        return r.iso


class NoInput(In):
    pass


class PrefillInput(In):
    plan_id: str = Field(description="id of a plan from create_visa_plan or get_my_case")
    form_key: str = Field(description="key of a form listed in the plan's guideline")


class ProfileInput(In):
    citizenship: Optional[str] = Field(default=None, description="Country name, e.g. Russia")
    address: Optional[str] = None
    residence_status: Optional[str] = None
    studies: Optional[str] = Field(default=None, description="Studies or current occupation")


# --------------------------------------------------------------- helpers

async def _user_docs(session: AsyncSession, user: User) -> list[tuple[Document, Optional[DocumentAnalysis]]]:
    docs = (await session.exec(select(Document).where(Document.user_id == user.id))).all()
    analyses = {a.document_id: a for a in (await session.exec(select(DocumentAnalysis).where(DocumentAnalysis.user_id == user.id))).all()}
    return [(d, analyses.get(d.id)) for d in docs]


def _as_rule_docs(pairs) -> list[rules.UserDoc]:
    out = []
    for d, a in pairs:
        n = a.normalized if a and a.status == "done" else {}
        out.append(rules.UserDoc(
            id=d.id, title=d.title, category=d.category,
            kind=(a.document_kind if a and a.status == "done" else None),
            expiry_date=n.get("expiry_date") or (d.expires_on.isoformat() if d.expires_on else None),
            issue_date=n.get("issue_date"),
            issues=(a.issues if a else []),
            amount=n.get("amount"),
            currency=n.get("currency"),
        ))
    return out


def _guideline_view(g: CountryGuideline) -> dict[str, Any]:
    return {
        "status": "current",
        "verified": g.verified_at.date().isoformat() if g.verified_at else None,
        "destination": g.destination_name, "visa_type": g.visa_type, "summary": g.summary,
        "max_stay_days": g.max_stay_days,
        "processing_days": [g.processing_days_min, g.processing_days_max],
        "requirements": [{k: r.get(k) for k in ("key", "title", "description", "mandatory", "constraints")} for r in g.requirements],
        "fees": rules.sum_fees(g.fees),
        "steps": g.steps,
        "forms": [{"form_key": f["key"], "title": f["title"], "official_url": f.get("official_url")} for f in g.forms],
        "sources": g.sources,
    }


async def _current(session: AsyncSession, t: Trip) -> tuple[Optional[CountryGuideline], Optional[dict]]:
    look = await guidelines.find(session, t.destination_code, t.origin_code, t.purpose)
    if look.status != "current":
        name = look.guideline.destination_name if look.guideline else t.destination_code
        return None, updating_message(name, look.reason)
    return look.guideline, None


# ----------------------------------------------------------------- tools

async def live_plan(session: AsyncSession, user: User, plan: VisaPlan) -> dict:
    """A plan with its document check recomputed against today's documents, while its guideline is current."""
    g = await session.get(CountryGuideline, plan.guideline_id)
    status, reason = guidelines.freshness(g) if g else ("missing", "guideline removed")
    out = plan.model_dump(mode="json")
    out["guideline_status"], out["guideline_reason"] = status, reason
    if status == "current":
        out["gap"] = rules.check_requirements(g.requirements, _as_rule_docs(await _user_docs(session, user)), plan.travel_date, plan.stay_days)
        out["fees"] = rules.sum_fees(g.fees)
    return out


async def list_supported_destinations(session, user, _: NoInput):
    rows = await guidelines.coverage(session)
    return {"guidelines": rows, "note": "Only entries with status current can be used for advice."}


async def get_my_case(session, user: User, _: NoInput):
    pairs = await _user_docs(session, user)
    tasks = (await session.exec(select(Task).where(Task.user_id == user.id, Task.done == False))).all()  # noqa: E712
    plans = (await session.exec(select(VisaPlan).where(VisaPlan.user_id == user.id, VisaPlan.status == "active"))).all()
    return {
        "today": date.today().isoformat(),
        "profile": {
            "name": user.full_name, "citizenship": user.citizenship or None, "address": user.address or None,
            "residence_status": user.residence_status or None, "studies": user.studies or None,
            "journey_stage": user.journey_stage, "monthly_budget_eur": user.monthly_budget_eur, "savings_eur": user.savings_eur,
        },
        "documents": [{
            "title": d.title, "category": d.category, "uploaded": d.uploaded_at.date().isoformat(),
            "expires_on": d.expires_on.isoformat() if d.expires_on else None,
            "analysis": None if not a else {
                "status": a.status, "kind": a.document_kind, "summary": a.summary,
                "fields": {k: v for k, v in (a.normalized or {}).items() if v is not None},
                "issues": a.issues, "error": a.error,
            },
        } for d, a in pairs],
        "open_tasks": [{"title": t.title, "due": t.due_date.isoformat() if t.due_date else None, "category": t.category} for t in tasks],
        "active_plans": [{
            "plan_id": p.id, "destination": p.destination_name, "purpose": p.purpose, "visa_type": p.visa_type,
            "travel_date": p.travel_date.isoformat() if p.travel_date else None, "missing": p.gap.get("missing_or_problem", []),
        } for p in plans],
    }


async def get_country_guidelines(session, user, t: Trip):
    g, stale = await _current(session, t)
    return stale or _guideline_view(g)


async def check_my_documents(session, user, t: TripWithDates):
    g, stale = await _current(session, t)
    if stale:
        return stale
    gap = rules.check_requirements(
        g.requirements, _as_rule_docs(await _user_docs(session, user)),
        date.fromisoformat(t.travel_date) if t.travel_date else None, t.stay_days,
    )
    return {"status": "current", "visa_type": g.visa_type, "gap": gap, "fees": rules.sum_fees(g.fees)}


async def create_visa_plan(session, user: User, t: TripWithDates):
    g, stale = await _current(session, t)
    if stale:
        return stale
    travel = date.fromisoformat(t.travel_date) if t.travel_date else None
    gap = rules.check_requirements(g.requirements, _as_rule_docs(await _user_docs(session, user)), travel, t.stay_days)
    fees = rules.sum_fees(g.fees)

    # Replace the previous plan for the same trip, and only the tasks the agent created for it.
    old = (await session.exec(select(VisaPlan).where(
        VisaPlan.user_id == user.id, VisaPlan.status == "active",
        VisaPlan.destination_code == g.destination_code, VisaPlan.purpose == g.purpose,
    ))).all()
    for p in old:
        p.status = "archived"
        session.add(p)
        for task in (await session.exec(select(Task).where(Task.plan_id == p.id, Task.done == False))).all():  # noqa: E712
            await session.delete(task)

    plan = VisaPlan(
        user_id=user.id, guideline_id=g.id, guideline_version=g.version, origin_code=t.origin_code,
        destination_code=g.destination_code, destination_name=g.destination_name, purpose=g.purpose,
        visa_type=g.visa_type, travel_date=travel, stay_days=t.stay_days, gap=gap, fees=fees,
    )
    session.add(plan)
    await session.flush()

    def due(days_before: Optional[int]) -> Optional[date]:
        if travel is None or days_before is None:
            return None
        return max(date.today(), travel - timedelta(days=days_before))

    collect_offset = next((s.get("days_before_travel") for s in g.steps if s.get("category") == "Documents"), None)
    new_tasks = [
        Task(user_id=user.id, plan_id=plan.id, source="agent", category="Documents",
             title=f"{'Fix' if r['status'] == 'problem' else 'Get'}: {r['title']}", due_date=due(collect_offset))
        for r in gap["requirements"] if r["status"] != "satisfied" and r["mandatory"]
    ] + [
        Task(user_id=user.id, plan_id=plan.id, source="agent", category=s.get("category", "Journey"),
             title=s["title"], due_date=due(s.get("days_before_travel")))
        for s in g.steps
    ]
    session.add_all(new_tasks)
    await session.commit()
    return {
        "status": "created", "plan_id": plan.id, "visa_type": g.visa_type,
        "travel_date": t.travel_date, "trip_end": gap["trip_end"],
        "requirements": gap["requirements"], "fees": fees,
        "tasks_created": [{"title": x.title, "due": x.due_date.isoformat() if x.due_date else None} for x in new_tasks],
        "forms_available": [{"form_key": f["key"], "title": f["title"]} for f in g.forms],
        "replaced_plans": len(old),
    }


async def prefill_form(session, user: User, inp: PrefillInput):
    plan = await session.get(VisaPlan, inp.plan_id)
    if not plan or plan.user_id != user.id:
        return {"status": "error", "message": "No such plan for this user. Create a plan first."}
    g = await session.get(CountryGuideline, plan.guideline_id)
    status, reason = guidelines.freshness(g)
    if status != "current":
        return updating_message(g.destination_name, reason)
    template = next((f for f in g.forms if f["key"] == inp.form_key), None)
    if not template:
        return {"status": "error", "message": f"Unknown form_key. Available: {[f['key'] for f in g.forms]}"}

    passport = {}
    for d, a in await _user_docs(session, user):
        if a and a.status == "done" and a.document_kind == "passport":
            # Prefer an MRZ-verified passport, then the latest expiry.
            score = (bool(a.normalized.get("mrz_verified")), a.normalized.get("expiry_date") or "")
            if not passport or score > passport["_score"]:
                passport = {**a.normalized, "_score": score}
    name_parts = user.full_name.split()
    sources = {
        "profile": {
            "full_name": user.full_name, "first_name": user.first_name,
            "surname": name_parts[-1] if len(name_parts) > 1 else None,
            "email": user.email, "citizenship": user.citizenship, "address": user.address,
            "residence_status": user.residence_status, "studies": user.studies,
        },
        "passport": passport,
        "plan": {
            "destination_name": plan.destination_name, "purpose": plan.purpose, "visa_type": plan.visa_type,
            "travel_date": plan.travel_date.isoformat() if plan.travel_date else None,
            "stay_days": plan.stay_days,
            "departure_date": (plan.travel_date + timedelta(days=plan.stay_days)).isoformat() if plan.travel_date and plan.stay_days else None,
        },
    }
    fields = rules.fill_form(template, sources)
    form = PrefilledForm(user_id=user.id, plan_id=plan.id, form_key=template["key"], title=template["title"],
                         official_url=template.get("official_url"), fields=fields)
    session.add(form)
    await session.commit()
    missing = [f["label"] for f in fields if f["status"] == "missing"]
    return {
        "status": "created", "form_id": form.id, "url": f"/app/forms/{form.id}", "title": form.title,
        "filled": len(fields) - len(missing), "total": len(fields), "missing_fields": missing,
        "note": "Missing fields could not be filled from the profile or an analysed passport.",
    }


async def update_my_profile(session, user: User, inp: ProfileInput):
    changed = {k: v.strip() for k, v in inp.model_dump(exclude_none=True).items() if v and v.strip()}
    for k, v in changed.items():
        setattr(user, k, v)
    session.add(user)
    await session.commit()
    return {"status": "saved", "updated": sorted(changed)}


# ------------------------------------------------------------ registry

Handler = Callable[[AsyncSession, User, Any], Awaitable[dict]]

TOOLS: dict[str, tuple[type[In], Handler, str, str, tuple[str, ...]]] = {
    # name: (input model, handler, description, progress label, data it changes)
    "get_my_case": (NoInput, get_my_case,
        "The user's profile, uploaded documents with their analysed fields and issues, open tasks and active visa plans. Call this first in a conversation about their case.",
        "Reading your case", ()),
    "list_supported_destinations": (NoInput, list_supported_destinations,
        "Which destination / citizenship / purpose combinations the platform has guidelines for, and whether each is up to date.",
        "Checking supported countries", ()),
    "get_country_guidelines": (Trip, get_country_guidelines,
        "Official requirements, fees, steps and forms for a destination, citizenship and purpose, from the platform's curated guidelines database. "
        "The only allowed source for immigration rules.",
        "Looking up guidelines", ()),
    "check_my_documents": (TripWithDates, check_my_documents,
        "Compare the user's uploaded documents with the requirements for a trip: what is satisfied, what has a problem (with the exact reason) and what is missing, plus fee totals.",
        "Checking your documents", ()),
    "create_visa_plan": (TripWithDates, create_visa_plan,
        "Create (or replace) the user's visa plan for a trip and add to-do tasks with due dates for every missing document and application step. "
        "Use when the user wants a plan; confirm destination, citizenship, purpose and, if they know it, the travel date first.",
        "Building your plan", ("tasks", "plans")),
    "prefill_form": (PrefillInput, prefill_form,
        "Prefill an application form for a plan from the user's profile, analysed passport and plan. Returns a link the user can open, plus which fields are still empty.",
        "Prefilling the form", ("forms",)),
    "update_my_profile": (ProfileInput, update_my_profile,
        "Save details the user told you about themselves (citizenship, address, status, studies or occupation) to their profile.",
        "Saving to your profile", ("profile",)),
}


def definitions() -> list[dict]:
    """Tool definitions in a fixed order (stable prefix for prompt caching)."""
    out = []
    for name, (model, _, description, _, _) in TOOLS.items():
        schema = model.model_json_schema()
        schema.pop("title", None)
        out.append({"name": name, "description": description, "input_schema": schema, "eager_input_streaming": True})
    return out


async def run(session: AsyncSession, user: User, name: str, raw_input: Any) -> tuple[dict, bool]:
    """Returns (result, is_error)."""
    entry = TOOLS.get(name)
    if not entry:
        return {"error": f"unknown tool {name}"}, True
    model, handler = entry[0], entry[1]
    try:
        inp = model.model_validate(raw_input if isinstance(raw_input, dict) else {})
    except ValidationError as e:
        # Also catches inputs cut short by eager streaming: the call never runs.
        return {"error": "INVALID_INPUT", "details": e.errors(include_url=False, include_context=False)}, True
    return await handler(session, user, inp), False
