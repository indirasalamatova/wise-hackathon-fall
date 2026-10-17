from datetime import date
from typing import Optional
from sqlmodel import SQLModel, Field

class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"

    id: str = Field(default="user_default", primary_key=True)
    first_name: str = "Aigerim"
    full_name: str = "Aigerim Nurlanovna"
    initials: str = "AN"
    member_since: str = "July 2025"
    citizenship_code: str = "KZ"
    citizenship_name: str = "Kazakhstan"
    passport_masked: str = "•••• 4417 · valid to 12 Mar 2031"
    address: str = "Budapest VIII, Hungary"
    status: str = "Residence permit · study, to 31 Jan 2027"
    studies: str = "BSc Business Informatics, to Jun 2029"
    monthly_budget_eur: int = 1100
    wise_balance_eur: int = 6240
    permit_label: str = "Study permit · 107 days"
    connected_wise: bool = True
    connected_calendar: bool = True
    notify_push: bool = True
    notify_email: bool = True
    notify_sms: bool = False

class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: str = Field(primary_key=True)
    title: str
    short_title: Optional[str] = None
    category: str  # Documents, Journey, Finances, Appointment, Personal
    due_date: Optional[date] = None
    done: bool = False

class CaseDocument(SQLModel, table=True):
    __tablename__ = "case_documents"

    id: str = Field(primary_key=True)
    title: str
    note: str
    status: str  # missing, needs_update, to_pay, ready
    action: Optional[str] = None  # request, upload, pay
    file_path: Optional[str] = None

class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: str = Field(primary_key=True)
    date_str: str  # "13 Nov 2026"
    title: str
    amount_eur: int
    status: str  # upcoming, paid

class AppNotification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(primary_key=True)
    title: str
    body: str
    time_str: str
    tone: str  # danger, success, neutral, warning
    icon: str  # clock, banknote, file, send
    read: bool = False
    href: str