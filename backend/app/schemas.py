from datetime import date
from typing import Optional, List, Union
from pydantic import BaseModel

from app.models import CaseDocument

class TaskCreate(BaseModel):
    title: str
    category: str = "Personal"
    due_date: Optional[date] = None

class TaskUpdate(BaseModel):
    done: Optional[bool] = None
    title: Optional[str] = None

class DocumentUpdate(BaseModel):
    status: Optional[str] = None
    action: Optional[str] = None

class DocumentCheck(BaseModel):
    label: str
    ok: bool
    detail: str

class DocumentUploadResponse(BaseModel):
    document: CaseDocument
    checks: List[DocumentCheck]

class VisaFeePayment(BaseModel):
    title: str
    amount_eur: int

class BudgetUpdate(BaseModel):
    monthly_budget_eur: int

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None

class SettingsUpdate(BaseModel):
    connected_wise: Optional[bool] = None
    connected_calendar: Optional[bool] = None
    notify_push: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_sms: Optional[bool] = None

class ChatRequest(BaseModel):
    message: str

class ChatBlock(BaseModel):
    type: str  # "lead", "bullets", "text"
    text: Optional[str] = None
    items: Optional[List[str]] = None

class ChatResponse(BaseModel):
    role: str = "assistant"
    blocks: List[ChatBlock]