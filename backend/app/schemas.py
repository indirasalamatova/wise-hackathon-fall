from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class GoogleAuthRequest(BaseModel):
    credential: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    first_name: str
    picture_url: Optional[str]
    created_at: datetime
    citizenship: str
    passport: str
    address: str
    residence_status: str
    studies: str
    monthly_budget_eur: int
    savings_eur: int
    journey_stage: str
    nationality_code: str
    residence_code: str
    travel_purpose: str
    notify_push: bool
    notify_email: bool
    notify_sms: bool
    is_admin: bool = False


class AuthResponse(BaseModel):
    access_token: str
    user: UserOut


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    citizenship: Optional[str] = Field(default=None, max_length=80)
    passport: Optional[str] = Field(default=None, max_length=120)
    address: Optional[str] = Field(default=None, max_length=200)
    residence_status: Optional[str] = Field(default=None, max_length=200)
    studies: Optional[str] = Field(default=None, max_length=200)
    monthly_budget_eur: Optional[int] = Field(default=None, ge=0, le=100_000)
    savings_eur: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    journey_stage: Optional[Literal["apply", "arrive", "stay", "transition"]] = None
    nationality_code: Optional[str] = Field(default=None, pattern=r"^([A-Z]{2})?$")
    residence_code: Optional[str] = Field(default=None, pattern=r"^([A-Z]{2})?$")
    travel_purpose: Optional[Literal["tourism", "study", "work", "job_search", "family"]] = None
    notify_push: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_sms: Optional[bool] = None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = "Personal"
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    done: Optional[bool] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    due_date: Optional[date] = None


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    category: str
    file_name: str
    content_type: str
    size_bytes: int
    expires_on: Optional[date]
    uploaded_at: datetime
    analysis: Optional[dict] = None


class PaymentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    amount_eur: int = Field(gt=0, le=100_000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatCreate(BaseModel):
    journey_id: Optional[str] = None


class JourneyPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    status: Optional[Literal["planning", "active", "completed", "archived"]] = None
    travel_date: Optional[date] = None
    stay_days: Optional[int] = Field(default=None, ge=1, le=3650)


class FormValues(BaseModel):
    """Values the user typed or corrected; null clears a field."""
    values: dict[str, Optional[str]]
class FavoriteCreate(BaseModel):
    country_code: str = Field(pattern=r"^[A-Z]{2}$")
