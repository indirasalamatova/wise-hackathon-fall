from datetime import date
from typing import Optional, List, Union
from pydantic import BaseModel

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

class BudgetUpdate(BaseModel):
    monthly_budget_eur: int

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