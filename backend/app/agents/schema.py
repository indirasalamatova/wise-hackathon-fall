"""
The guideline import format: the contract for the guidelines pipeline.

Each file is one JSON object or a list of them. Validate with:
    python -m app.cli.import_guidelines path/to/file.json --dry-run
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

DocKind = Literal[
    "passport", "photo", "application_form", "insurance", "bank_statement", "accommodation",
    "itinerary", "invitation", "enrolment", "employment_contract", "criminal_record",
    "medical_certificate", "permit", "other",
]
DOC_KINDS: tuple[str, ...] = DocKind.__args__  # type: ignore[attr-defined]

# Where a form field's value may come from (see rules.fill_form).
FORM_SOURCES = {
    "profile": ["full_name", "first_name", "surname", "email", "citizenship", "address", "residence_status", "studies"],
    "passport": ["surname", "given_names", "full_name", "document_number", "nationality", "date_of_birth", "place_of_birth",
                 "issue_date", "expiry_date", "issuing_country", "sex"],
    # Facts read off the user's other analysed documents of that kind.
    "accommodation": ["issuer_name", "address"],
    "enrolment": ["issuer_name", "address"],
    "employment_contract": ["issuer_name", "address"],
    "insurance": ["issuer_name", "document_number", "expiry_date"],
    "plan": ["destination_name", "purpose", "visa_type", "travel_date", "stay_days", "departure_date"],
}


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Evidence(Strict):
    """Where a fact comes from: the official page and the exact text on it (original language)."""
    url: str
    quote: str


class Constraints(Strict):
    valid_months_after_stay: Optional[int] = Field(default=None, ge=0, le=60)
    max_age_days: Optional[int] = Field(default=None, ge=1)
    issued_within_years: Optional[int] = Field(default=None, ge=1, le=30)
    min_amount: Optional[str] = None
    min_amount_currency: Optional[str] = None


class Requirement(Strict):
    key: str
    title: str
    description: str
    doc_kind: DocKind
    mandatory: bool = True
    constraints: Constraints = Field(default_factory=Constraints)
    evidence: Optional[Evidence] = None


class Fee(Strict):
    key: str
    title: str
    amount: Optional[str] = Field(description="Decimal string, e.g. \"90.00\"; null when it varies")
    currency: str = Field(min_length=3, max_length=3)
    mandatory: bool = True
    note: Optional[str] = None
    evidence: Optional[Evidence] = None

    @field_validator("amount")
    @classmethod
    def decimal_string(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        from decimal import Decimal, InvalidOperation
        try:
            Decimal(v)
        except InvalidOperation:
            raise ValueError("amount must be a decimal string like \"90.00\"")
        return v


class Step(Strict):
    key: str
    title: str
    description: str
    days_before_travel: Optional[int] = Field(default=None, description="Due date offset; null for no deadline")
    category: Literal["Documents", "Finances", "Journey", "Appointment"] = "Journey"
    evidence: Optional[Evidence] = None


class FormField(Strict):
    key: str
    label: str
    source: Union[str, list[str], None] = None
    format: str = "text"  # text, upper, date:DD-MM-YYYY
    hint: Optional[str] = None

    @field_validator("source")
    @classmethod
    def known_source(cls, v):
        for path in [v] if isinstance(v, str) else (v or []):
            group, _, name = path.partition(".")
            if name not in FORM_SOURCES.get(group, []):
                raise ValueError(f"unknown source {path!r}; allowed: {FORM_SOURCES}")
        return v


class FormTemplate(Strict):
    key: str
    title: str
    official_url: Optional[str] = None
    fields: list[FormField]


class Source(Strict):
    title: str
    url: str


class GuidelineIn(Strict):
    destination_code: str = Field(min_length=2, max_length=2)
    destination_name: str
    origin_code: str = Field(description="ISO alpha-2 citizenship, or * for any")
    purpose: Literal["tourism", "study", "work", "job_search", "family"]
    visa_type: str
    entry_type: Optional[Literal["visa_free", "visa_on_arrival", "evisa", "visa_required"]] = Field(
        default=None, description="How this citizenship enters for this purpose; colours the explore map"
    )
    summary: str
    max_stay_days: Optional[int] = None
    processing_days_min: Optional[int] = None
    processing_days_max: Optional[int] = None
    requirements: list[Requirement]
    fees: list[Fee]
    steps: list[Step] = []
    forms: list[FormTemplate] = []
    sources: list[Source] = Field(min_length=1)
    verified_at: Optional[datetime] = Field(default=None, description="Set only after a person checked it against the sources")
    valid_until: Optional[date] = None

    @field_validator("destination_code", "origin_code")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.upper()
