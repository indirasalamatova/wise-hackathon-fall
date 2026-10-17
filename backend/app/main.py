import asyncio
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import date
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import init_db, get_session, async_session_maker
from app.models import UserProfile, Task, CaseDocument, Payment, AppNotification
from app.schemas import (
    TaskCreate, TaskUpdate, DocumentUpdate, BudgetUpdate, SettingsUpdate, ProfileUpdate,
    ChatRequest, ChatResponse, ChatBlock, DocumentCheck, DocumentUploadResponse, VisaFeePayment
)
from app.seed import seed_data
from app.services.storage import StorageService

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ACCEPTED_UPLOAD_TYPES = {"application/pdf", "image/jpeg", "image/png"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with async_session_maker() as session:
        await seed_data(session)
    yield

app = FastAPI(
    title="Unbound API",
    description="Backend services for Unbound immigration case tracking",
    version="1.0.0",
    lifespan=lifespan
)

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- USER PROFILE & STATS ---

@app.get("/api/profile", response_model=UserProfile)
async def get_profile(session: AsyncSession = Depends(get_session)):
    profile = await session.get(UserProfile, "user_default")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.patch("/api/profile", response_model=UserProfile)
async def update_profile(payload: ProfileUpdate, session: AsyncSession = Depends(get_session)):
    profile = await session.get(UserProfile, "user_default")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if payload.full_name is not None:
        full_name = payload.full_name.strip()
        if not full_name:
            raise HTTPException(status_code=422, detail="Add your name as it appears in your passport.")
        parts = full_name.split()
        profile.full_name = full_name
        profile.first_name = parts[0]
        profile.initials = "".join(p[0] for p in parts[:2]).upper()
    if payload.address is not None:
        profile.address = payload.address.strip()
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile

@app.patch("/api/profile/budget", response_model=UserProfile)
async def update_budget(payload: BudgetUpdate, session: AsyncSession = Depends(get_session)):
    profile = await session.get(UserProfile, "user_default")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.monthly_budget_eur = payload.monthly_budget_eur
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile

@app.patch("/api/profile/settings", response_model=UserProfile)
async def update_settings(payload: SettingsUpdate, session: AsyncSession = Depends(get_session)):
    profile = await session.get(UserProfile, "user_default")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile

# --- TASKS ---

@app.get("/api/tasks", response_model=List[Task])
async def list_tasks(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Task).order_by(Task.due_date))
    return result.all()

@app.post("/api/tasks", response_model=Task)
async def create_task(payload: TaskCreate, session: AsyncSession = Depends(get_session)):
    task = Task(
        id=f"task-{uuid.uuid4().hex[:8]}",
        title=payload.title,
        short_title=payload.title[:24],
        category=payload.category,
        due_date=payload.due_date,
        done=False
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate, session: AsyncSession = Depends(get_session)):
    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if payload.done is not None:
        task.done = payload.done
    if payload.title is not None:
        task.title = payload.title
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, session: AsyncSession = Depends(get_session)):
    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.delete(task)
    await session.commit()
    return {"status": "success", "deleted_id": task_id}

# --- CASE DOCUMENTS ---

@app.get("/api/documents", response_model=List[CaseDocument])
async def list_documents(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(CaseDocument))
    return result.all()

@app.patch("/api/documents/{doc_id}", response_model=CaseDocument)
async def update_document(doc_id: str, payload: DocumentUpdate, session: AsyncSession = Depends(get_session)):
    doc = await session.get(CaseDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if payload.status is not None:
        doc.status = payload.status
    if payload.action is not None:
        doc.action = payload.action
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc

@app.post("/api/documents/{doc_id}/upload", response_model=DocumentUploadResponse)
async def upload_document(
    doc_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    doc = await session.get(CaseDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if file.content_type not in ACCEPTED_UPLOAD_TYPES:
        raise HTTPException(status_code=415, detail="Upload a PDF, JPG or PNG file.")
    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="This file is over 10 MB. Compress it or upload a single page.")

    doc.file_path = await StorageService.save_upload(file, doc_id)

    # Simulated AI check. A file named with "old" or "expired" fails the
    # validity check so the rejected path can be demoed.
    await asyncio.sleep(1.5)
    stale = bool(re.search(r"old|expired", file.filename or "", re.IGNORECASE))
    checks = [
        DocumentCheck(label="Name matches passport", ok=True, detail="Aigerim Nurlanovna"),
        DocumentCheck(label=f"Recognised as {doc.title.lower()}", ok=True, detail="All pages present, text is sharp"),
        DocumentCheck(label="Valid for your new permit", ok=False, detail="Ends before 31 Jan 2027. Upload a policy that covers the full permit period.")
        if stale
        else DocumentCheck(label="Valid for your new permit", ok=True, detail="Covers the full permit period"),
        DocumentCheck(label="Accepted format", ok=True, detail="PDF" if file.content_type == "application/pdf" else "Image"),
    ]
    doc.status = "rejected" if stale else "ready"
    doc.action = "upload" if stale else None
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return DocumentUploadResponse(document=doc, checks=checks)

@app.post("/api/documents/{doc_id}/pay", response_model=CaseDocument)
async def pay_document_fee(doc_id: str, session: AsyncSession = Depends(get_session)):
    doc = await session.get(CaseDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.status = "ready"
    doc.action = None
    session.add(doc)

    # Sync matching payment to paid
    result = await session.exec(select(Payment).where(Payment.title == "Permit renewal fee"))
    payment = result.first()
    if payment:
        payment.status = "paid"
        session.add(payment)

    await session.commit()
    await session.refresh(doc)
    return doc

# --- PAYMENTS ---

@app.get("/api/payments", response_model=List[Payment])
async def list_payments(status: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    stmt = select(Payment)
    if status and status != "all":
        stmt = stmt.where(Payment.status == status.lower())
    result = await session.exec(stmt)
    return result.all()

@app.post("/api/payments/pay-visa-fee", response_model=Payment)
async def pay_visa_fee(payload: VisaFeePayment, session: AsyncSession = Depends(get_session)):
    if payload.amount_eur <= 0:
        raise HTTPException(status_code=422, detail="Choose at least one official fee to pay.")
    today = date.fromisoformat(os.getenv("MOCK_TODAY", date.today().isoformat()))
    payment = Payment(
        id=f"pay-{uuid.uuid4().hex[:8]}",
        date_str=f"{today.day} {today.strftime('%b %Y')}",
        title=payload.title,
        amount_eur=payload.amount_eur,
        status="paid"
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    return payment

# --- NOTIFICATIONS ---

@app.get("/api/notifications", response_model=List[AppNotification])
async def list_notifications(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(AppNotification))
    return result.all()

@app.post("/api/notifications/{notif_id}/read", response_model=AppNotification)
async def mark_notification_read(notif_id: str, session: AsyncSession = Depends(get_session)):
    notif = await session.get(AppNotification, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    session.add(notif)
    await session.commit()
    await session.refresh(notif)
    return notif

@app.post("/api/notifications/mark-all-read")
async def mark_all_read(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(AppNotification))
    notifications = result.all()
    for notif in notifications:
        notif.read = True
        session.add(notif)
    await session.commit()
    return {"status": "success", "count": len(notifications)}

# --- ASSISTANT CHAT ---

@app.post("/api/assistant/chat", response_model=ChatResponse)
async def assistant_chat(payload: ChatRequest):
    msg = payload.message.lower().strip()
    
    if "still need" in msg or "renewal" in msg or "certificate" in msg:
        return ChatResponse(
            role="assistant",
            blocks=[
                ChatBlock(type="lead", text="You still need 3 items:"),
                ChatBlock(
                    type="bullets", 
                    items=[
                        "Student status certificate — missing",
                        "Health insurance — needs update",
                        "Fee payment receipt — to pay"
                    ]
                ),
                ChatBlock(
                    type="text", 
                    text="Next step: request the certificate by Fri 23 Oct. Submit on Enter Hungary by 13 Nov, then biometrics on 26 Nov."
                )
            ]
        )
    elif "turkey" in msg or "travel" in msg:
        return ChatResponse(
            role="assistant",
            blocks=[
                ChatBlock(type="lead", text="Yes, but note your timeline carefully:"),
                ChatBlock(
                    type="bullets",
                    items=[
                        "Your current permit card is valid until 31 January 2027.",
                        "If you travel in December 2026, your card remains valid for re-entry.",
                        "After 31 Jan, you must carry your renewal submission certificate."
                    ]
                ),
                ChatBlock(type="text", text="Ensure your passport is valid for at least 6 months beyond travel dates.")
            ]
        )
    elif "budget" in msg or "after graduation" in msg:
        return ChatResponse(
            role="assistant",
            blocks=[
                ChatBlock(type="lead", text="Based on your monthly budget of €1,100:"),
                ChatBlock(
                    type="bullets",
                    items=[
                        "Hungary: Job-seeking permit (est. living cost €780/mo) — Best fit",
                        "Poland: Residence to look for work (€860/mo) — Fits",
                        "Czechia: Job-seeker residence (€950/mo) — Fits",
                        "Spain: Job-search residence (€1,080/mo) — Fits"
                    ]
                ),
                ChatBlock(type="text", text="Germany Opportunity Card requires ~€1,250/mo (short €150/mo).")
            ]
        )
    elif "german" in msg or "opportunity card" in msg or "how much money" in msg:
        return ChatResponse(
            role="assistant",
            blocks=[
                ChatBlock(type="lead", text="For the German Opportunity Card:"),
                ChatBlock(
                    type="bullets",
                    items=[
                        "Proof of funds requirement: €13,200 (€1,100/month blocked account).",
                        "Your current Wise balance is €6,240 (short €6,960).",
                        "Official application fee is €75."
                    ]
                ),
                ChatBlock(type="text", text="Check the Visa Costs & Payments calculator for line-by-line breakdown.")
            ]
        )

    return ChatResponse(
        role="assistant",
        blocks=[
            ChatBlock(type="lead", text="I've recorded your question regarding your case:"),
            ChatBlock(type="text", text=f"Regarding '{payload.message}': All your personal documents, deadlines, and requirements are monitored on your dashboard. Please refer to My Journey or To-do list for specific instructions.")
        ]
    )