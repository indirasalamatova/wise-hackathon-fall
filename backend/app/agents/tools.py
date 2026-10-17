"""
Tools the chat agent can call. Each tool validates its input, works only on the
calling user's data, and does all date / money / requirement logic in code
(app/agents/rules.py, app/agents/journeys.py). Guideline content is returned only
when the guideline is current; otherwise the tool returns the "being updated" status
and nothing else, so the model can't repeat outdated rules.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Awaitable, Callable, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app import explore
from app.agents import guidelines, journeys, rules
from app.forms.templates import pdf_spec
from app.models import CountryGuideline, Document, DocumentAnalysis, Journey, Task, User, utcnow

Purpose = Literal["tourism", "study", "work", "job_search", "family"]


@dataclass
class Context:
    """Who is calling and from which conversation."""
    chat_id: Optional[str] = None
    journey_id: Optional[str] = None  # the journey the conversation is about, if any


def updating_message(destination: str, reason: str) -> dict[str, Any]:
    return {
        "status": "not_up_to_date",
        "reason": reason,
        "instruction": f"Tell the user that information about {destination} for this purpose is being updated and will be available soon. "
                       "Do not give requirements, fees or timelines for it from your own knowledge.",
    }


def _jsonable(v: Any) -> Any:
    if isinstance(v, dict):
        return {k: _jsonable(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_jsonable(x) for x in v]
    return v.isoformat() if hasattr(v, "isoformat") else v


# ------------------------------------------------------------------ inputs

class In(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _iso2(v: str) -> str:
    v = v.strip().upper()
    if len(v) != 2 or not v.isalpha():
        raise ValueError("use a 2-letter ISO country code")
    return v


def _future_date(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    r = rules.normalize_date(v)
    if not r.iso:
        raise ValueError(f"travel_date must be YYYY-MM-DD ({r.issue})")
    if r.iso < date.today().isoformat():
        raise ValueError("travel_date is in the past")
    return r.iso


class Trip(In):
    destination_code: str = Field(description="ISO 3166-1 alpha-2 code of the destination, e.g. HU")
    origin_code: str = Field(description="ISO alpha-2 code of the user's citizenship (passport country), e.g. RU")
    purpose: Purpose

    _iso = field_validator("destination_code", "origin_code")(classmethod(lambda cls, v: _iso2(v)))


class TripWithDates(Trip):
    travel_date: Optional[str] = Field(default=None, description="Planned entry date, YYYY-MM-DD, or null if unknown")
    stay_days: Optional[int] = Field(default=None, ge=1, le=3650, description="Length of stay in days, or null if unknown")

    _date = field_validator("travel_date")(classmethod(lambda cls, v: _future_date(v)))


class NewJourney(TripWithDates):
    title: Optional[str] = Field(default=None, description="Short name, e.g. 'Master's in Budapest'; null for a default")
    continues_journey_id: Optional[str] = Field(default=None, description="id of a journey this one continues (next leg), or null")


class JourneyRef(In):
    journey_id: str


class JourneyUpdate(In):
    journey_id: str
    status: Optional[Literal["planning", "active", "completed", "archived"]] = None
    travel_date: Optional[str] = Field(default=None, description="New entry date, YYYY-MM-DD")
    stay_days: Optional[int] = Field(default=None, ge=1, le=3650)
    summary: Optional[str] = Field(default=None, description="One or two sentences on where the user stands, for later")

    _date = field_validator("travel_date")(classmethod(lambda cls, v: _future_date(v)))


class StepUpdate(In):
    journey_id: str
    step_id: str = Field(description="id of a step from get_journey")
    done: bool


class PrefillInput(In):
    journey_id: str
    form_key: str = Field(description="key of a form listed in get_journey's automation")


class NoInput(In):
    pass


class DestinationSearch(In):
    near_code: Optional[str] = Field(default=None, description="ISO alpha-2 of a country the user wanted but may not easily enter; "
                                     "alternatives are ranked near it. Null for the easiest destinations anywhere.")
    region: Optional[Literal["Africa", "Americas", "Asia", "Europe", "Oceania"]] = Field(default=None, description="Limit to one region, or null")
    purpose: Optional[Purpose] = Field(default=None, description="Null for the purpose saved on the user's profile")

    _iso = field_validator("near_code")(classmethod(lambda cls, v: _iso2(v) if v else None))


class ProfileInput(In):
    citizenship: Optional[str] = Field(default=None, description="Country name, e.g. Russia")
    address: Optional[str] = None
    residence_status: Optional[str] = None
    studies: Optional[str] = Field(default=None, description="Studies or current occupation")


# --------------------------------------------------------------- helpers

async def _current(session: AsyncSession, t: Trip) -> tuple[Optional[CountryGuideline], Optional[dict]]:
    look = await guidelines.find(session, t.destination_code, t.origin_code, t.purpose)
    if look.status != "current":
        name = look.guideline.destination_name if look.guideline else t.destination_code
        return None, updating_message(name, look.reason)
    return look.guideline, None


async def _own_journey(session: AsyncSession, user: User, journey_id: str) -> Optional[Journey]:
    j = await session.get(Journey, journey_id)
    return j if j and j.user_id == user.id else None


def _guideline_view(g: CountryGuideline) -> dict[str, Any]:
    def cite(item):
        ev = item.get("evidence") or {}
        return ev.get("url")

    return {
        "status": "current",
        "verified": g.verified_at.date().isoformat() if g.verified_at else None,
        "destination": g.destination_name, "visa_type": g.visa_type, "summary": g.summary,
        "max_stay_days": g.max_stay_days, "processing_days_max": g.processing_days_max,
        "requirements": [{**{k: r.get(k) for k in ("key", "title", "description", "mandatory", "constraints")}, "source": cite(r)} for r in g.requirements],
        "fees": rules.sum_fees(g.fees),
        "steps": [{**{k: s.get(k) for k in ("key", "title", "description", "days_before_travel")}, "source": cite(s)} for s in g.steps],
        "forms": [{"form_key": f["key"], "title": f["title"]} for f in g.forms],
        "sources": g.sources,
    }


def _journey_for_agent(view: dict, guideline_current: bool) -> dict:
    """The journey as the agent sees it; rules from an out-of-date guideline are withheld."""
    out = {k: view[k] for k in ("id", "title", "status", "summary", "destination_name", "purpose", "visa_type",
                                "travel_date", "stay_days", "trip_end", "progress", "steps", "parent", "continuations")}
    out["url"] = f"/app/journeys/{view['id']}"
    # "status" is reserved for the tool's own outcome (created / error / not_up_to_date).
    out["journey_status"] = out.pop("status")
    if guideline_current:
        out.update(requirements=view["requirements"], finances=view["finances"], automation=view["automation"], forms=view["forms"])
    else:
        out["rules"] = updating_message(view["destination_name"], view["guideline"]["reason"])
    return _jsonable(out)


# ----------------------------------------------------------------- tools

async def get_my_case(session, user: User, _: NoInput, ctx: Context):
    docs = (await session.exec(select(Document).where(Document.user_id == user.id))).all()
    analyses = {a.document_id: a for a in (await session.exec(select(DocumentAnalysis).where(DocumentAnalysis.user_id == user.id))).all()}
    personal = (await session.exec(select(Task).where(Task.user_id == user.id, Task.done == False, Task.journey_id == None))).all()  # noqa: E711,E712
    js = (await session.exec(select(Journey).where(Journey.user_id == user.id, Journey.status != "archived").order_by(Journey.updated_at.desc()))).all()
    return _jsonable({
        "today": date.today().isoformat(),
        "current_journey_id": ctx.journey_id,
        "profile": {
            "name": user.full_name, "citizenship": user.citizenship or None, "address": user.address or None,
            "residence_status": user.residence_status or None, "studies": user.studies or None,
            "monthly_budget_eur": user.monthly_budget_eur, "savings_eur": user.savings_eur,
        },
        "documents": [{
            "title": d.title, "category": d.category, "expires_on": d.expires_on,
            "analysis": None if not (a := analyses.get(d.id)) else {
                "status": a.status, "kind": a.document_kind, "summary": a.summary,
                "fields": {k: v for k, v in (a.normalized or {}).items() if v is not None}, "issues": a.issues,
            },
        } for d in docs],
        "journeys": [await journeys.summary(session, j) for j in js],
        "personal_tasks": [{"title": t.title, "due": t.due_date} for t in personal],
    })


async def list_supported_destinations(session, user, _: NoInput, ctx: Context):
    return {"guidelines": await guidelines.coverage(session), "note": "Only entries with status current can be used for advice."}


async def get_country_guidelines(session, user, t: Trip, ctx: Context):
    g, stale = await _current(session, t)
    return stale or _guideline_view(g)


async def check_my_documents(session, user, t: TripWithDates, ctx: Context):
    g, stale = await _current(session, t)
    if stale:
        return stale
    gap = rules.check_requirements(g.requirements, await journeys.user_docs(session, user),
                                   date.fromisoformat(t.travel_date) if t.travel_date else None, t.stay_days)
    return {"status": "current", "visa_type": g.visa_type, "gap": gap, "fees": rules.sum_fees(g.fees)}


async def create_journey(session, user: User, t: NewJourney, ctx: Context):
    g, stale = await _current(session, t)
    if stale:
        return stale
    if t.continues_journey_id and not await _own_journey(session, user, t.continues_journey_id):
        return {"status": "error", "message": "continues_journey_id is not one of this user's journeys"}
    j = await journeys.create(
        session, user, g, t.origin_code, date.fromisoformat(t.travel_date) if t.travel_date else None, t.stay_days,
        title=t.title, parent_id=t.continues_journey_id, chat_id=ctx.chat_id,
    )
    ctx.journey_id = ctx.journey_id or j.id
    view = await journeys.view(session, user, j)
    return {"status": "created", **_journey_for_agent(view, True)}


async def get_journey(session, user: User, inp: JourneyRef, ctx: Context):
    j = await _own_journey(session, user, inp.journey_id)
    if not j:
        return {"status": "error", "message": "No such journey for this user."}
    view = await journeys.view(session, user, j)
    return _journey_for_agent(view, view["guideline"]["status"] == "current")


async def update_journey(session, user: User, inp: JourneyUpdate, ctx: Context):
    j = await _own_journey(session, user, inp.journey_id)
    if not j:
        return {"status": "error", "message": "No such journey for this user."}
    if inp.status:
        journeys.set_status(j, inp.status)
    if inp.summary:
        j.summary = inp.summary.strip()
    if inp.travel_date or inp.stay_days:
        if inp.travel_date:
            j.travel_date = date.fromisoformat(inp.travel_date)
        if inp.stay_days:
            j.stay_days = inp.stay_days
        await journeys.reschedule(session, j)
    j.updated_at = utcnow()
    session.add(j)
    await session.commit()
    return {"status": "saved", "journey": await journeys.summary(session, j)}


async def set_step_done(session, user: User, inp: StepUpdate, ctx: Context):
    j = await _own_journey(session, user, inp.journey_id)
    t = await session.get(Task, inp.step_id)
    if not j or not t or t.journey_id != j.id:
        return {"status": "error", "message": "No such step in this journey."}
    t.done, t.done_at = inp.done, (utcnow() if inp.done else None)
    j.updated_at = utcnow()
    session.add_all([t, j])
    await session.commit()
    return {"status": "saved", "step": t.title, "done": t.done, "journey": await journeys.summary(session, j)}


async def prefill_form(session, user: User, inp: PrefillInput, ctx: Context):
    j = await _own_journey(session, user, inp.journey_id)
    if not j:
        return {"status": "error", "message": "No such journey for this user."}
    form, error = await journeys.prefill_form(session, user, j, inp.form_key)
    if error:
        return {"status": "error", "message": error}
    missing = [f["label"] for f in form.fields if f["status"] == "missing"]
    return {
        "status": "created", "form_id": form.id, "url": f"/app/forms/{form.id}", "title": form.title,
        "filled": len(form.fields) - len(missing), "total": len(form.fields), "missing_fields": missing,
        "official_pdf": pdf_spec(form.form_key) is not None,
        "note": "Missing fields couldn't be filled from the user's documents, profile or journey. On the form page the user can "
                "correct values and download " + ("the official form with the values written in (to print and sign)"
                if pdf_spec(form.form_key) else "a data sheet to copy into the online application") + ".",
    }


def _country_name(code: str) -> str:
    c = explore.pycountry.countries.get(alpha_2=code)
    return getattr(c, "common_name", None) or (c.name if c else code)


async def find_destinations(session, user: User, inp: DestinationSearch, ctx: Context):
    profile = await explore.travel_profile(session, user, None, None, inp.purpose)
    if not profile["origin"]:
        return {"status": "no_passport", "message": "The user's passport country is unknown. Ask which passport they travel on, "
                                                    "or suggest setting it on the map (/app/explore)."}
    decisions = await explore.decide_all(session, profile)

    def view(o: dict) -> dict:
        return {**o, "name": _country_name(o["code"]), "map_url": f"/app/explore?country={o['code']}",
                "verified": o["basis"] in ("rule", "verified")}

    out: dict[str, Any] = {"status": "ok", "passport": profile["origin"], "residence": profile["residence"], "purpose": profile["purpose"]}
    if inp.near_code:
        target = decisions.get(inp.near_code)
        out["requested"] = view({"code": inp.near_code, "status": target.status if target else "unknown",
                                 "basis": target.basis if target else "none", "stay_days": target.stay_days if target else None})
        if target:
            g_rows = (await session.exec(select(CountryGuideline).where(CountryGuideline.destination_code == inp.near_code))).all()
            g = explore.pick_guideline(list(g_rows), inp.near_code, profile["origin"], profile["purpose"])
            out["routes"] = explore.routes(inp.near_code, profile, target, explore.guideline_detail(g) if g else None)
        out["alternatives"] = [view(o) for o in explore.alternatives(inp.near_code, decisions)]
    else:
        out["destinations"] = [view(o) for o in explore.easiest(decisions, inp.region)]
    out["note"] = ("Ranked visa-free first, then visa on arrival, then eVisa. Entries with verified=false come from the open Passport "
                   "Index dataset (as of " + explore.visa_matrix.SOURCE["as_of"] + ") and are indicative: say so, and say to confirm "
                   "with the official source or get_country_guidelines before travelling. Link each country with its map_url.")
    return _jsonable(out)


async def update_my_profile(session, user: User, inp: ProfileInput, ctx: Context):
    changed = {k: v.strip() for k, v in inp.model_dump(exclude_none=True).items() if v and v.strip()}
    for k, v in changed.items():
        setattr(user, k, v)
    session.add(user)
    await session.commit()
    return {"status": "saved", "updated": sorted(changed)}


# ------------------------------------------------------------ registry

Handler = Callable[[AsyncSession, User, Any, Context], Awaitable[dict]]

TOOLS: dict[str, tuple[type[In], Handler, str, str, tuple[str, ...]]] = {
    # name: (input model, handler, description, progress label, data it changes)
    "get_my_case": (NoInput, get_my_case,
        "The user's profile, documents (with analysed fields and issues), journeys with progress, and personal tasks. "
        "Call this first in a conversation about their situation.",
        "Reading your case", ()),
    "list_supported_destinations": (NoInput, list_supported_destinations,
        "Which destination / citizenship / purpose combinations the platform has guidelines for, and whether each is up to date.",
        "Checking supported countries", ()),
    "get_country_guidelines": (Trip, get_country_guidelines,
        "Official requirements, fees, steps and forms for a destination, citizenship and purpose, from the platform's "
        "verified guidelines database (each item cites its official source). The only allowed source for immigration rules.",
        "Looking up official guidelines", ()),
    "check_my_documents": (TripWithDates, check_my_documents,
        "Compare the user's documents with the requirements for a trip: satisfied, problem (with the exact reason) or missing, plus fee totals.",
        "Checking your documents", ()),
    "create_journey": (NewJourney, create_journey,
        "Create a journey: the user's plan for a trip or move. Builds the pathway (documents to get, then application steps "
        "with due dates), and returns documents needed, financial overview and automation options. Confirm destination, "
        "citizenship and purpose first; ask for the travel date and length of stay if unknown. Use continues_journey_id for a next leg.",
        "Building your journey", ("journeys", "tasks")),
    "get_journey": (JourneyRef, get_journey,
        "A journey with its pathway steps (ids, done or not), documents needed, finances and automation options.",
        "Opening your journey", ()),
    "update_journey": (JourneyUpdate, update_journey,
        "Change a journey: status (planning, active, completed, archived; completed journeys can be reopened), travel date "
        "or length of stay (due dates are recomputed), or a short summary of where the user stands.",
        "Updating your journey", ("journeys", "tasks")),
    "set_step_done": (StepUpdate, set_step_done,
        "Mark a journey step as done or not done.",
        "Updating your progress", ("journeys", "tasks")),
    "prefill_form": (PrefillInput, prefill_form,
        "Prefill an application form for a journey from the user's profile, analysed passport and journey dates. "
        "Returns a link and the fields the user still has to complete.",
        "Prefilling the form", ("forms", "journeys")),
    "find_destinations": (DestinationSearch, find_destinations,
        "Where the user can go easily on their passport (and residence permit): visa-free first, then visa on arrival, then eVisa. "
        "With near_code: ways into that country and easier alternatives near it. Use when the user can't easily enter a "
        "country, asks for options or ideas, or asks where they can travel.",
        "Finding destinations for you", ()),
    "update_my_profile": (ProfileInput, update_my_profile,
        "Save details the user told you about themselves (citizenship, address, status, studies or occupation).",
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


async def run(session: AsyncSession, user: User, name: str, raw_input: Any, ctx: Optional[Context] = None) -> tuple[dict, bool]:
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
    return await handler(session, user, inp, ctx or Context()), False
