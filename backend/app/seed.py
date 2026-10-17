from datetime import date
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models import UserProfile, Task, CaseDocument, Payment, AppNotification

async def seed_data(session: AsyncSession) -> None:
    user_check = await session.exec(select(UserProfile).where(UserProfile.id == "user_default"))
    if user_check.first():
        return

    # User Profile
    session.add(UserProfile(id="user_default"))

    # Initial Tasks from Spec
    tasks = [
        Task(id="task-1", title="Request student status certificate", short_title="Request certificate", category="Documents", due_date=date(2026, 10, 23), done=False),
        Task(id="task-2", title="Extend health insurance to Jan 2028", short_title="Extend health insurance", category="Documents", due_date=date(2026, 11, 6), done=False),
        Task(id="task-3", title="Pay HUF 18,000 renewal fee with Wise", short_title="Pay renewal fee", category="Finances", due_date=date(2026, 11, 13), done=False),
        Task(id="task-4", title="Submit renewal on Enter Hungary", short_title="Submit on Enter Hungary", category="Journey", due_date=date(2026, 11, 13), done=False),
        Task(id="task-5", title="Biometrics appointment, 10:30", short_title="Biometrics, 10:30", category="Appointment", due_date=date(2026, 11, 26), done=False),
        Task(id="task-6", title="Confirm case details", short_title="Confirm case", category="Journey", due_date=date(2026, 10, 1), done=True),
    ]
    session.add_all(tasks)

    # Documents (8 total)
    documents = [
        CaseDocument(id="doc-1", title="Student status certificate", note="Issued within 30 days of submitting", status="missing", action="request"),
        CaseDocument(id="doc-2", title="Health insurance certificate", note="Current policy ends 30 Nov", status="needs_update", action="upload"),
        CaseDocument(id="doc-3", title="Fee payment receipt", note="HUF 18,000 · pay when you submit", status="to_pay", action="pay"),
        CaseDocument(id="doc-4", title="Passport", note="Valid until 12 Mar 2031", status="ready", action=None),
        CaseDocument(id="doc-5", title="Enrolment letter", note="Current academic semester active", status="ready", action=None),
        CaseDocument(id="doc-6", title="Proof of accommodation", note="Rental agreement verified", status="ready", action=None),
        CaseDocument(id="doc-7", title="Bank statement", note="Wise EUR balance verified", status="ready", action=None),
        CaseDocument(id="doc-8", title="Passport photo", note="ICAO format biometric photo", status="ready", action=None),
    ]
    session.add_all(documents)

    # Payments
    payments = [
        Payment(id="pay-1", date_str="13 Nov 2026", title="Permit renewal fee", amount_eur=47, status="upcoming"),
        Payment(id="pay-2", date_str="6 Nov 2026", title="Health insurance", amount_eur=620, status="upcoming"),
        Payment(id="pay-3", date_str="1 Sep 2026", title="Rent, September", amount_eur=520, status="paid"),
        Payment(id="pay-4", date_str="15 Jul 2026", title="Translations (3)", amount_eur=75, status="paid"),
        Payment(id="pay-5", date_str="2 Jul 2025", title="Study visa fee", amount_eur=110, status="paid"),
        Payment(id="pay-6", date_str="20 Jun 2025", title="Tuition deposit", amount_eur=1500, status="paid"),
    ]
    session.add_all(payments)

    # Notifications
    notifications = [
        AppNotification(id="notif-1", title="Certificate due in 7 days", body="Request it by Fri 23 Oct.", time_str="9:00", tone="danger", icon="clock", read=False, href="/app/todo"),
        AppNotification(id="notif-2", title="Bank statement checked", body="Your Wise balance meets the minimum.", time_str="2h ago", tone="success", icon="banknote", read=False, href="/app/finances"),
        AppNotification(id="notif-3", title="Insurance ends too early", body="Policy ends 30 Nov, before the new permit.", time_str="Yesterday", tone="neutral", icon="file", read=False, href="/app/journey"),
        AppNotification(id="notif-4", title="Planning a December trip?", body="After 31 Jan bring your renewal receipt.", time_str="Tue", tone="warning", icon="send", read=True, href="/app/assistant"),
    ]
    session.add_all(notifications)

    await session.commit()