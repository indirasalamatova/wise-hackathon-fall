import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel


def new_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=new_id, primary_key=True)
    google_sub: str = Field(unique=True, index=True)
    email: str = Field(index=True)
    full_name: str
    first_name: str
    picture_url: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    # Filled in by the user on their profile
    citizenship: str = ""
    passport: str = ""
    address: str = ""
    residence_status: str = ""
    studies: str = ""
    monthly_budget_eur: int = 1000
    savings_eur: int = 0
    journey_stage: str = "apply"  # apply, arrive, stay, transition
    # Structured travel profile for the explore map (ISO 3166-1 alpha-2, "" = not set)
    nationality_code: str = ""
    residence_code: str = ""  # country of the user's residence permit
    travel_purpose: str = "tourism"  # tourism, study, work, job_search, family

    notify_push: bool = True
    notify_email: bool = True
    notify_sms: bool = False


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    title: str
    category: str = "Personal"
    due_date: Optional[date] = None
    done: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    # Set when the planning agent created the task, so a re-plan can replace its own tasks only.
    plan_id: Optional[str] = Field(default=None, index=True)
    source: str = "user"  # user, agent


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    title: str
    category: str = "Other"
    file_name: str
    content_type: str
    size_bytes: int
    sha256: str = Field(index=True)
    storage_key: str
    expires_on: Optional[date] = None
    uploaded_at: datetime = Field(default_factory=utcnow)


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    title: str
    amount_eur: int
    status: str = "paid"  # paid, upcoming
    paid_on: date = Field(default_factory=lambda: utcnow().date())


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    kind: str  # deadline, money, document, travel
    title: str
    body: str
    href: str
    read: bool = False
    created_at: datetime = Field(default_factory=utcnow)


def json_col(default=list):
    return Field(default_factory=default, sa_column=Column(JSON, nullable=False))


class CountryGuideline(SQLModel, table=True):
    """
    Curated immigration rules the agents are allowed to use. Populated by the
    guidelines pipeline (see app/cli/import_guidelines.py). An entry is usable only
    while it is verified and fresh (app/agents/guidelines.py decides, not the model).
    """
    __tablename__ = "country_guidelines"
    __table_args__ = (UniqueConstraint("destination_code", "origin_code", "purpose"),)

    id: str = Field(default_factory=new_id, primary_key=True)
    destination_code: str = Field(index=True)  # ISO 3166-1 alpha-2
    destination_name: str
    origin_code: str = Field(index=True)  # ISO alpha-2, or "*" for any citizenship
    purpose: str  # tourism, study, work, job_search, family
    visa_type: str
    # visa_free, visa_on_arrival, evisa, visa_required; drives the explore map colour
    entry_type: Optional[str] = None
    summary: str
    max_stay_days: Optional[int] = None
    processing_days_min: Optional[int] = None
    processing_days_max: Optional[int] = None
    requirements: list = json_col()
    fees: list = json_col()
    steps: list = json_col()
    forms: list = json_col()
    sources: list = json_col()
    verified_at: Optional[datetime] = None
    valid_until: Optional[date] = None
    version: int = 1
    updated_at: datetime = Field(default_factory=utcnow)


class DocumentAnalysis(SQLModel, table=True):
    __tablename__ = "document_analyses"

    id: str = Field(default_factory=new_id, primary_key=True)
    document_id: str = Field(foreign_key="documents.id", unique=True, index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    status: str = "pending"  # pending, done, failed, skipped
    document_kind: Optional[str] = None
    summary: Optional[str] = None
    raw: dict = json_col(dict)  # what the model read, as printed
    normalized: dict = json_col(dict)  # strict values from app/agents/rules.py
    issues: list = json_col()
    error: Optional[str] = None
    model: Optional[str] = None
    analyzed_at: Optional[datetime] = None


class VisaPlan(SQLModel, table=True):
    __tablename__ = "visa_plans"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    guideline_id: str = Field(foreign_key="country_guidelines.id")
    guideline_version: int
    origin_code: str
    destination_code: str
    destination_name: str
    purpose: str
    visa_type: str
    travel_date: Optional[date] = None
    stay_days: Optional[int] = None
    gap: dict = json_col(dict)
    fees: dict = json_col(dict)
    status: str = "active"  # active, archived
    created_at: datetime = Field(default_factory=utcnow)


class PrefilledForm(SQLModel, table=True):
    __tablename__ = "prefilled_forms"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    plan_id: Optional[str] = Field(default=None, foreign_key="visa_plans.id")
    form_key: str
    title: str
    official_url: Optional[str] = None
    fields: list = json_col()
    created_at: datetime = Field(default_factory=utcnow)


class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    title: str = "New conversation"
    provider: str = "anthropic"  # gemini, anthropic: whose message format the history uses
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ChatMessage(SQLModel, table=True):
    """
    One API message per row, stored exactly as sent to / received from Claude
    (append-only, so thinking blocks replay unchanged). `display_text` is what the
    UI shows; tool-result turns have none.
    """
    __tablename__ = "chat_messages"

    id: str = Field(default_factory=new_id, primary_key=True)
    session_id: str = Field(foreign_key="chat_sessions.id", index=True)
    seq: int
    role: str  # user, assistant (API roles)
    content: list = json_col()
    display_text: Optional[str] = None
    events: list = json_col()  # tool steps shown in the UI
    created_at: datetime = Field(default_factory=utcnow)


class VisaRequirement(SQLModel, table=True):
    """
    Indicative short-stay entry rules per passport, imported from an open dataset
    (app/services/visa_matrix.py). Shown on the explore map with their source and date;
    verified country_guidelines take precedence over them.
    """
    __tablename__ = "visa_requirements"
    __table_args__ = (UniqueConstraint("origin_code", "destination_code"),)

    id: str = Field(default_factory=new_id, primary_key=True)
    origin_code: str = Field(index=True)  # passport, ISO alpha-2
    destination_code: str = Field(index=True)
    category: str  # visa_free, visa_on_arrival, evisa, eta, visa_required, no_admission
    stay_days: Optional[int] = None
    raw: str  # the dataset value as published
    imported_at: datetime = Field(default_factory=utcnow)


class FavoriteDestination(SQLModel, table=True):
    __tablename__ = "favorite_destinations"
    __table_args__ = (UniqueConstraint("user_id", "country_code"),)

    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    country_code: str
    created_at: datetime = Field(default_factory=utcnow)
