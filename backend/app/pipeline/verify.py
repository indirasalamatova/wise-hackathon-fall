"""
Deterministic verification of an extracted guideline against the fetched pages.

The model proposes facts with evidence (source URL + quote). Code keeps a fact only if
its quote is found on that page as fetched today, and every number it states (fees,
months, days, amounts) appears in that quote. Nothing here calls a model.
"""
from __future__ import annotations

import html
import re
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

MIN_QUOTE_CHARS = 12
MIN_REQUIREMENTS = 3
# A new extraction may not lose more than this share of the previous entry's requirements.
MAX_REQUIREMENT_LOSS = 0.4

_DASHES = dict.fromkeys(map(ord, "‐‑‒–—−"), "-")
_QUOTES = dict.fromkeys(map(ord, "‘’‚‛′"), "'") | dict.fromkeys(map(ord, "“”„‟″"), '"')


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFKC", html.unescape(text or ""))
    t = t.translate(_DASHES).translate(_QUOTES).replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip().lower()


def quote_on_page(quote: str, page_text: str) -> bool:
    """Exact (normalised) match; a quote may elide text with '...' or '…', each part must match in order."""
    page = normalize(page_text)
    parts = [p.strip() for p in re.split(r"\.\.\.|…", normalize(quote)) if p.strip()]
    if not parts or sum(len(p) for p in parts) < MIN_QUOTE_CHARS or any(len(p) < 6 for p in parts):
        return False
    pos = 0
    for p in parts:
        i = page.find(p, pos)
        if i < 0:
            return False
        pos = i + len(p)
    return True


_CURRENCY_TOKENS = {
    "EUR": r"eur|€|euro",
    "HUF": r"huf|ft\b|forint",
    "USD": r"usd|\$|dollar",
    "GBP": r"gbp|£|pound",
}


def _int_pattern(n: int) -> str:
    """12000 -> 12[ .,]?000 so "12 000 Ft", "12.000", "12,000" and "12000" all match."""
    s = str(n)
    groups = []
    while s:
        groups.insert(0, s[-3:])
        s = s[:-3]
    return r"[\s., ]?".join(groups)


def number_in_text(n: int, text: str) -> bool:
    return re.search(rf"(?<![\d.,]){_int_pattern(n)}(?![\d])", normalize(text)) is not None


def amount_in_quote(amount: str, currency: str, quote: str) -> bool:
    try:
        d = Decimal(amount)
    except InvalidOperation:
        return False
    q = normalize(quote)
    whole = int(d)
    frac = d - whole
    num = _int_pattern(whole) + (rf"[.,]{str(frac)[2:4].ljust(2, '0')}" if frac else r"(?:[.,]0{1,2})?")
    if not re.search(rf"(?<![\d.,]){num}(?![\d])", q):
        return False
    token = _CURRENCY_TOKENS.get(currency.upper(), re.escape(currency.lower()))
    return re.search(token, q) is not None


# --------------------------------------------------------------- results

@dataclass
class Verified:
    requirements: list[dict] = field(default_factory=list)
    fees: list[dict] = field(default_factory=list)
    steps: list[dict] = field(default_factory=list)
    max_stay_days: Optional[int] = None
    processing_days_max: Optional[int] = None
    used_urls: set[str] = field(default_factory=set)
    dropped: list[dict] = field(default_factory=list)  # {"item", "reason"}


def _evidence_ok(item: dict, pages: dict[str, str]) -> tuple[bool, str]:
    ev = item.get("evidence") or {}
    url, quote = ev.get("url"), ev.get("quote") or ""
    if url not in pages:
        return False, f"cites a page that wasn't fetched ({url})"
    if not quote_on_page(quote, pages[url]):
        return False, "quote not found on the cited page"
    return True, ""


def verify(extracted: dict[str, Any], pages: dict[str, str]) -> Verified:
    """`extracted` is the model's output as a dict; `pages` maps URL to fetched text."""
    out = Verified()

    def drop(kind: str, item: dict, reason: str):
        out.dropped.append({"item": f"{kind}: {item.get('title') or item.get('key')}", "reason": reason})

    for r in extracted.get("requirements", []):
        ok, why = _evidence_ok(r, pages)
        if not ok:
            drop("requirement", r, why)
            continue
        quote = r["evidence"]["quote"]
        constraints = {}
        for k in ("valid_months_after_stay", "max_age_days", "issued_within_years"):
            v = r.get(k)
            if v is not None:
                if number_in_text(int(v), quote):
                    constraints[k] = int(v)
                else:
                    drop("constraint", {"title": f"{r['title']} / {k}={v}"}, "number not in the quote")
        if r.get("min_amount") and r.get("min_amount_currency"):
            if amount_in_quote(r["min_amount"], r["min_amount_currency"], quote):
                constraints["min_amount"] = str(Decimal(r["min_amount"]).quantize(Decimal("0.01")))
                constraints["min_amount_currency"] = r["min_amount_currency"].upper()
            else:
                drop("constraint", {"title": f"{r['title']} / min amount {r['min_amount']} {r['min_amount_currency']}"}, "amount not in the quote")
        out.requirements.append({
            "key": r["key"], "title": r["title"], "description": r["description"], "doc_kind": r["doc_kind"],
            "mandatory": bool(r.get("mandatory", True)), "constraints": constraints, "evidence": r["evidence"],
        })
        out.used_urls.add(r["evidence"]["url"])

    for f in extracted.get("fees", []):
        ok, why = _evidence_ok(f, pages)
        if not ok:
            drop("fee", f, why)
            continue
        amount = f.get("amount")
        if amount is not None and not amount_in_quote(amount, f.get("currency") or "", f["evidence"]["quote"]):
            drop("fee", f, f"amount {amount} {f.get('currency')} not in the quote")
            continue
        out.fees.append({
            "key": f["key"], "title": f["title"],
            "amount": str(Decimal(amount).quantize(Decimal("0.01"))) if amount is not None else None,
            "currency": (f.get("currency") or "EUR").upper(),
            # A fee for a subgroup is an alternative, never added to the total.
            "mandatory": bool(f.get("mandatory", True)) and not f.get("applies_to"),
            "note": "; ".join(x for x in (f"For {f['applies_to']}" if f.get("applies_to") else None, f.get("note")) if x) or None,
            "evidence": f["evidence"],
        })
        out.used_urls.add(f["evidence"]["url"])

    for s in extracted.get("steps", []):
        ok, why = _evidence_ok(s, pages)
        if not ok:
            drop("step", s, why)
            continue
        days = s.get("days_before_travel")
        if days is not None and not number_in_text(int(days), s["evidence"]["quote"]):
            days = None  # keep the step, but without an unproven deadline
        out.steps.append({
            "key": s["key"], "title": s["title"], "description": s["description"], "days_before_travel": days,
            "category": s.get("category") or "Journey", "evidence": s["evidence"],
        })
        out.used_urls.add(s["evidence"]["url"])

    for name in ("max_stay_days", "processing_days_max"):
        fact = extracted.get(name) or {}
        value, ev = fact.get("value"), fact.get("evidence")
        if value is None or not ev:
            continue
        if ev.get("url") in pages and quote_on_page(ev.get("quote", ""), pages[ev["url"]]) and number_in_text(int(value), ev["quote"]):
            setattr(out, name, int(value))
            out.used_urls.add(ev["url"])
        else:
            drop("fact", {"title": f"{name}={value}"}, "not proven by its quote")

    # Keys must be unique for tasks and form fill.
    for coll in (out.requirements, out.fees, out.steps):
        seen = set()
        for item in list(coll):
            if item["key"] in seen:
                coll.remove(item)
            seen.add(item["key"])
    return out


@dataclass
class Decision:
    publish: bool
    reason: str


def decide(v: Verified, applies: bool, previous_requirements: Optional[int]) -> Decision:
    if not applies:
        return Decision(False, "the sources don’t describe this route")
    if len(v.requirements) < MIN_REQUIREMENTS:
        return Decision(False, f"only {len(v.requirements)} requirement(s) could be verified (need {MIN_REQUIREMENTS})")
    if previous_requirements and len(v.requirements) < previous_requirements * (1 - MAX_REQUIREMENT_LOSS):
        return Decision(False, f"verified requirements fell from {previous_requirements} to {len(v.requirements)}; held for review")
    return Decision(True, f"{len(v.requirements)} requirements, {len(v.fees)} fees, {len(v.steps)} steps verified")
