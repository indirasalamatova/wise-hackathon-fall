import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import CaseDocument

class BackgroundWorkerService:
    @staticmethod
    async def process_document_verification(doc_id: str, session: AsyncSession) -> None:
        """
        Background task simulating AI validation of uploaded passport / certificates.
        """
        await asyncio.sleep(1.5)
        doc = await session.get(CaseDocument, doc_id)
        if doc and doc.status != "ready":
            doc.status = "ready"
            doc.action = None
            session.add(doc)
            await session.commit()