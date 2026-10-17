"""
Form definitions: the fields (shared with app/pipeline/targets.py) and, where the official
form is a printable PDF, where each value goes on it. Anchors are the form's printed labels.
"""
from __future__ import annotations

from typing import Optional

from app.forms.pdf import Placement
from app.pipeline.targets import SCHENGEN_FORM, residence_form

P = Placement

SCHENGEN_PDF = {
    # EU harmonised application form (home-affairs.ec.europa.eu "Visa Application Form.pdf")
    "find_on": "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en",
    "link_pattern": r"Visa%20Application%20Form\.pdf",
    "placements": {
        "surname": P(1, "right", r"1\.\s*Surname \(Family name\):", field="surname", max_x=418),
        "given_names": P(1, "right", r"3\.\s*First name\(s\) \(Given name\(s\)\):", field="given_names", max_x=418),
        "date_of_birth": P(1, "below", r"year\):", field="date_of_birth", dx=-18, max_x=158),
        "place_of_birth": P(1, "below", r"Place of birth:", field="place_of_birth", max_x=340),
        "nationality": P(1, "right", r"7\.\s*Current", field="nationality", max_x=434),
        "sex_m": P(1, "check_at", r"☐\s*Male", when={"field": "sex", "equals": "M"}),
        "sex_f": P(1, "check_at", r"☐\s*Female", when={"field": "sex", "equals": "F"}),
        "document_number": P(2, "below", r"document:", occurrence=2, field="document_number", dx=-18, max_x=158),
        "issue_date": P(2, "below", r"Date of issue:", field="issue_date", max_x=250),
        "expiry_date": P(2, "below", r"Valid until:", field="expiry_date", max_x=342),
        "issuing_country": P(2, "below", r"\(country\):", field="issuing_country", max_x=436),
        "address": P(2, "below", r"Applicant.s home address and email address:", field="address", dx=-18, dy=1.5, max_x=345, size=7),
        "email": P(2, "below", r"Applicant.s home address and email address:", field="email", dx=-18, dy=-6.5, max_x=345, size=7),
        "occupation": P(2, "right", r"Current occupation:", field="occupation", max_x=436),
        "purpose_tourism": P(2, "check_at", r"☐\s*Tourism", when={"field": "purpose", "equals": "TOURISM"}),
        "destination": P(2, "below", r"destination, if applicable\):", field="destination", max_x=250),
        "arrival": P(2, "below", r"Intended date of arrival of the first intended stay", field="arrival", max_x=430),
        "departure": P(2, "below", r"Intended date of departure from the Schengen area", field="departure", max_x=430),
        "accommodation_name": P(3, "below", r"name of hotel\(s\) or temporary accommodation\(s\)", field="accommodation_name", dx=-18, max_x=430),
        "accommodation_address": P(3, "below", r"accommodation\(s\):", field="accommodation_address", max_x=250, size=8),
    },
}

RESIDENCE_PDF = {
    # OIF form 9: "Tartózkodási engedély iránti kérelem" (Hungarian, print in Latin capitals)
    "find_on": "https://www.oif.gov.hu/tajekoztatok/a-hallgato-tanulo-tartozkodasa",
    "link_pattern": r"Tart%C3%B3zkod%C3%A1si%20enged%C3%A9ly%20ir%C3%A1nti%20k%C3%A9relem",
    "placements": {
        "arrival_year": P(1, "before_word", line=r"Beutazás helye, ideje:", word="év", field="arrival", part="year"),
        "arrival_month": P(1, "before_word", line=r"Beutazás helye, ideje:", word="hó", field="arrival", part="month"),
        "arrival_day": P(1, "before_word", line=r"Beutazás helye, ideje:", word="nap", field="arrival", part="day"),
        "email": P(1, "right", r"E-mail cím:", field="email", max_x=565),
        "surname": P(1, "right", r"családi név \(útlevél szerint\):", field="surname", max_x=300),
        "given_names": P(1, "right", r"utónév \(útlevél szerint\):", field="given_names", max_x=565),
        "sex_m": P(2, "check_before", r"\bférfi\b", when={"field": "sex", "equals": "M"}),
        "sex_f": P(2, "check_before", r"\bnő\b", when={"field": "sex", "equals": "F"}),
        "dob_year": P(2, "before_word", line=r"születési idő:", word="év", field="date_of_birth", part="year"),
        "dob_month": P(2, "before_word", line=r"születési idő:", word="hó", field="date_of_birth", part="month"),
        "dob_day": P(2, "before_word", line=r"születési idő:", word="nap", field="date_of_birth", part="day"),
        "place_of_birth": P(2, "right", r"születési hely \(település\):", field="place_of_birth", max_x=420),
        "nationality": P(2, "right", r"állampolgársága:", field="nationality", max_x=290),
        "document_number": P(2, "right", r"útlevél száma:", field="document_number", max_x=230),
        "issue_year": P(2, "before_word", line=r"kiállításának ideje, helye:", word="év", field="issue_date", part="year"),
        "issue_month": P(2, "before_word", line=r"kiállításának ideje, helye:", word="hó", field="issue_date", part="month"),
        "issue_day": P(2, "before_word", line=r"kiállításának ideje, helye:", word="nap", field="issue_date", part="day"),
        "expiry_year": P(2, "before_word", line=r"érvényességi ideje:", word="év", field="expiry_date", part="year"),
        "expiry_month": P(2, "before_word", line=r"érvényességi ideje:", word="hó", field="expiry_date", part="month"),
        "expiry_day": P(2, "before_word", line=r"érvényességi ideje:", word="nap", field="expiry_date", part="day"),
    },
}

FORMS: dict[str, dict] = {
    "schengen_application": {"fields": SCHENGEN_FORM["fields"], "pdf": SCHENGEN_PDF},
    "residence_permit_application": {"fields": residence_form("")["fields"], "pdf": RESIDENCE_PDF},
}


def fields_for(form_key: str, fallback: list[dict]) -> list[dict]:
    """The current field list for a form (code wins over what a guideline stored when it was published)."""
    return FORMS.get(form_key, {}).get("fields", fallback)


def pdf_spec(form_key: str) -> Optional[dict]:
    return FORMS.get(form_key, {}).get("pdf")
