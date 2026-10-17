import hashlib
import json
import os
from contextlib import asynccontextmanager
from datetime import date
from typing import List, Optional, Type, TypeVar
from urllib.parse import quote

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import SQLModel, delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import create_access_token, get_current_user, verify_google_credential
from app.core.database import get_session, init_db
from app.agents import guidelines as guideline_store
from app.agents.documents import analyze_document
from app.agents import llm as agent_llm, tools as agent_tools
from app.agents.orchestrator import run_turn
from app.models import (
    ChatMessage, ChatSession, Document, DocumentAnalysis, Notification, Payment, PrefilledForm, Task, User,
    VisaPlan, utcnow,
)
from app.schemas import (
    AuthResponse, ChatRequest, DocumentOut, GoogleAuthRequest, PaymentCreate, TaskCreate, TaskUpdate, UserOut,
    UserUpdate,
)
from app.services.storage import StorageService

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DOCUMENT_CATEGORIES = {"Passport", "Visa or permit", "Insurance", "Finances", "Education", "Housing", "Other"}
EXPIRY_WARNING_DAYS = 60

# Magic bytes, so the stored type is what the file really is, not what the browser claims.
SIGNATURES = {b"%PDF": "application/pdf", b"\xff\xd8\xff": "image/jpeg", b"\x89PNG": "image/png"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await StorageService.ensure_bucket_exists()
    yield


app = FastAPI(title="Unbound API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

M = TypeVar("M", bound=SQLModel)


async def owned(session: AsyncSession, model: Type[M], item_id: str, user: User, label: str) -> M:
    """Loads a row and 404s unless it belongs to the user, so ids can't be guessed across accounts."""
    item = await session.get(model, item_id)
    if not item or getattr(item, "user_id") != user.id:
        raise HTTPException(404, f"{label} not found")
    return item


def notify(session: AsyncSession, user: User, kind: str, title: str, body: str, href: str) -> None:
    session.add(Notification(user_id=user.id, kind=kind, title=title, body=body, href=href))


# --- AUTH ---

@app.post("/api/auth/google", response_model=AuthResponse)
async def google_login(payload: GoogleAuthRequest, session: AsyncSession = Depends(get_session)):
    info = await verify_google_credential(payload.credential)
    result = await session.exec(select(User).where(User.google_sub == info["sub"]))
    user = result.first()
    name = info.get("name") or info["email"].split("@")[0]
    if user:
        # keep the Google account details current; the rest is the user's own
        user.email = info["email"]
        user.picture_url = info.get("picture")
    else:
        user = User(
            google_sub=info["sub"],
            email=info["email"],
            full_name=name,
            first_name=info.get("given_name") or name.split()[0],
            picture_url=info.get("picture"),
        )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user, from_attributes=True))


# --- PROFILE ---

@app.get("/api/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@app.patch("/api/me", response_model=UserOut)
async def update_me(payload: UserUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    changes = payload.model_dump(exclude_unset=True)
    if "full_name" in changes:
        name = (changes["full_name"] or "").strip()
        if not name:
            raise HTTPException(422, "Add your name as it appears in your passport.")
        changes["full_name"] = name
        user.first_name = name.split()[0]
    for key, value in changes.items():
        setattr(user, key, value.strip() if isinstance(value, str) else value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@app.delete("/api/me", status_code=204)
async def delete_me(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    docs = (await session.exec(select(Document).where(Document.user_id == user.id))).all()
    for doc in docs:
        await StorageService.delete(doc.storage_key)
    chat_ids = select(ChatSession.id).where(ChatSession.user_id == user.id)
    await session.execute(delete(ChatMessage).where(ChatMessage.session_id.in_(chat_ids)))
    # Children before parents (foreign keys).
    for model in (ChatSession, PrefilledForm, DocumentAnalysis, Document, Task, VisaPlan, Payment, Notification):
        await session.execute(delete(model).where(model.user_id == user.id))
    await session.delete(user)
    await session.commit()


# --- TASKS ---

@app.get("/api/tasks", response_model=List[Task])
async def list_tasks(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Task).where(Task.user_id == user.id).order_by(Task.due_date, Task.created_at))
    return result.all()


@app.post("/api/tasks", response_model=Task)
async def create_task(payload: TaskCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    task = Task(user_id=user.id, title=payload.title.strip(), category=payload.category, due_date=payload.due_date)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    task = await owned(session, Task, task_id, user, "Task")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@app.delete("/api/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    task = await owned(session, Task, task_id, user, "Task")
    await session.delete(task)
    await session.commit()


# --- DOCUMENTS ---

def document_out(doc: Document, analysis: Optional[DocumentAnalysis]) -> DocumentOut:
    out = DocumentOut.model_validate(doc, from_attributes=True)
    if analysis:
        out.analysis = {
            "status": analysis.status, "document_kind": analysis.document_kind, "summary": analysis.summary,
            "fields": analysis.normalized, "issues": analysis.issues, "error": analysis.error,
            "analyzed_at": analysis.analyzed_at,
        }
    return out


@app.get("/api/documents", response_model=List[DocumentOut])
async def list_documents(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    docs = (await session.exec(select(Document).where(Document.user_id == user.id).order_by(Document.uploaded_at.desc()))).all()
    analyses = {a.document_id: a for a in (await session.exec(select(DocumentAnalysis).where(DocumentAnalysis.user_id == user.id))).all()}
    return [document_out(d, analyses.get(d.id)) for d in docs]


@app.post("/api/documents/{doc_id}/analyze", response_model=DocumentOut)
async def reanalyze_document(doc_id: str, background: BackgroundTasks, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    doc = await owned(session, Document, doc_id, user, "Document")
    analysis = (await session.exec(select(DocumentAnalysis).where(DocumentAnalysis.document_id == doc.id))).first()
    if analysis and analysis.status == "pending":
        raise HTTPException(409, "This document is already being analysed.")
    analysis = analysis or DocumentAnalysis(document_id=doc.id, user_id=user.id)
    analysis.status, analysis.error = "pending", None
    session.add(analysis)
    await session.commit()
    background.add_task(analyze_document, doc.id)
    return document_out(doc, analysis)


@app.post("/api/documents", response_model=DocumentOut)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=120),
    category: str = Form("Other"),
    expires_on: Optional[date] = Form(None),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if category not in DOCUMENT_CATEGORIES:
        raise HTTPException(422, "Choose a document type from the list.")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "This file is over 10 MB. Compress it or upload a single page.")
    if not data:
        raise HTTPException(422, "This file is empty. Choose another one.")
    content_type = next((t for sig, t in SIGNATURES.items() if data.startswith(sig)), None)
    if not content_type:
        raise HTTPException(415, "Upload a PDF, JPG or PNG file.")

    digest = hashlib.sha256(data).hexdigest()
    dupe = (await session.exec(select(Document).where(Document.user_id == user.id, Document.sha256 == digest))).first()
    if dupe:
        raise HTTPException(409, f"You already uploaded this file as “{dupe.title}”.")

    doc = Document(
        user_id=user.id,
        title=title.strip(),
        category=category,
        file_name=os.path.basename(file.filename or "document"),
        content_type=content_type,
        size_bytes=len(data),
        sha256=digest,
        storage_key="",
        expires_on=expires_on,
    )
    doc.storage_key = f"{user.id}/{doc.id}"
    await StorageService.put(doc.storage_key, data, content_type)
    session.add(doc)

    if expires_on:
        days = (expires_on - date.today()).days
        if days < 0:
            notify(session, user, "document", f"{doc.title} has expired", f"It expired on {expires_on:%d %b %Y}. Upload a valid one.", "/app/documents")
        elif days <= EXPIRY_WARNING_DAYS:
            notify(session, user, "deadline", f"{doc.title} expires in {days} days", f"Renew it before {expires_on:%d %b %Y}.", "/app/documents")

    analysis = DocumentAnalysis(document_id=doc.id, user_id=user.id)
    session.add(analysis)
    await session.commit()
    await session.refresh(doc)
    background.add_task(analyze_document, doc.id)
    return document_out(doc, analysis)


@app.get("/api/documents/{doc_id}/file")
async def download_document(doc_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    doc = await owned(session, Document, doc_id, user, "Document")
    data = await StorageService.get(doc.storage_key)
    return Response(
        content=data,
        media_type=doc.content_type,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(doc.file_name)}"},
    )


@app.delete("/api/documents/{doc_id}", status_code=204)
async def delete_document(doc_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    doc = await owned(session, Document, doc_id, user, "Document")
    await StorageService.delete(doc.storage_key)
    await session.execute(delete(DocumentAnalysis).where(DocumentAnalysis.document_id == doc.id))
    await session.delete(doc)
    await session.commit()


# --- PAYMENTS ---

@app.get("/api/payments", response_model=List[Payment])
async def list_payments(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Payment).where(Payment.user_id == user.id).order_by(Payment.paid_on.desc()))
    return result.all()


@app.post("/api/payments", response_model=Payment)
async def create_payment(payload: PaymentCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """Simulated Wise payment: records it as paid. No money moves."""
    payment = Payment(user_id=user.id, title=payload.title, amount_eur=payload.amount_eur, status="paid")
    session.add(payment)
    notify(session, user, "money", "Payment recorded", f"€{payload.amount_eur} for {payload.title}.", "/app/finances/costs")
    await session.commit()
    await session.refresh(payment)
    return payment


# --- NOTIFICATIONS ---

@app.get("/api/notifications", response_model=List[Notification])
async def list_notifications(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50)
    )
    return result.all()


@app.post("/api/notifications/{notif_id}/read", response_model=Notification)
async def mark_notification_read(notif_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    notif = await owned(session, Notification, notif_id, user, "Notification")
    notif.read = True
    session.add(notif)
    await session.commit()
    await session.refresh(notif)
    return notif


@app.post("/api/notifications/mark-all-read", status_code=204)
async def mark_all_read(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Notification).where(Notification.user_id == user.id, Notification.read == False))  # noqa: E712
    for notif in result.all():
        notif.read = True
        session.add(notif)
    await session.commit()


# --- ASSISTANT ---

def session_out(c: ChatSession) -> dict:
    return {"id": c.id, "title": c.title, "created_at": c.created_at, "updated_at": c.updated_at}


@app.get("/api/chat/sessions")
async def list_chat_sessions(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.exec(select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.updated_at.desc()).limit(50))).all()
    return [session_out(c) for c in rows]


@app.post("/api/chat/sessions")
async def create_chat_session(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    chat = ChatSession(user_id=user.id, provider=agent_llm.provider())
    session.add(chat)
    await session.commit()
    await session.refresh(chat)
    return session_out(chat)


@app.delete("/api/chat/sessions/{chat_id}", status_code=204)
async def delete_chat_session(chat_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    chat = await owned(session, ChatSession, chat_id, user, "Conversation")
    await session.execute(delete(ChatMessage).where(ChatMessage.session_id == chat.id))
    await session.delete(chat)
    await session.commit()


@app.get("/api/chat/sessions/{chat_id}/messages")
async def list_chat_messages(chat_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """What the UI shows: user turns and assistant text with its tool steps. Tool-result turns are internal."""
    chat = await owned(session, ChatSession, chat_id, user, "Conversation")
    rows = (await session.exec(select(ChatMessage).where(ChatMessage.session_id == chat.id).order_by(ChatMessage.seq))).all()
    return [
        {"id": r.id, "role": r.role, "text": r.display_text, "events": r.events, "created_at": r.created_at}
        for r in rows if r.display_text or r.events
    ]


# One answer at a time per conversation; a second request would interleave the history.
_busy: set[str] = set()


@app.post("/api/chat/sessions/{chat_id}/messages")
async def send_chat_message(chat_id: str, payload: ChatRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    await owned(session, ChatSession, chat_id, user, "Conversation")
    if chat_id in _busy:
        raise HTTPException(409, "The assistant is still answering in this conversation.")
    _busy.add(chat_id)

    async def events():
        try:
            async for event in run_turn(user.id, chat_id, payload.message.strip()):
                yield f"data: {json.dumps(event, default=str)}\n\n"
        finally:
            _busy.discard(chat_id)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# --- PLANS & FORMS ---

@app.get("/api/plans")
async def list_plans(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.exec(select(VisaPlan).where(VisaPlan.user_id == user.id, VisaPlan.status == "active").order_by(VisaPlan.created_at.desc()))).all()
    return [await agent_tools.live_plan(session, user, p) for p in rows]


@app.get("/api/forms")
async def list_forms(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.exec(select(PrefilledForm).where(PrefilledForm.user_id == user.id).order_by(PrefilledForm.created_at.desc()))).all()
    return rows


@app.get("/api/forms/{form_id}")
async def get_form(form_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await owned(session, PrefilledForm, form_id, user, "Form")


@app.delete("/api/forms/{form_id}", status_code=204)
async def delete_form(form_id: str, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    form = await owned(session, PrefilledForm, form_id, user, "Form")
    await session.delete(form)
    await session.commit()


@app.get("/api/guidelines/coverage")
async def guideline_coverage(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await guideline_store.coverage(session)
