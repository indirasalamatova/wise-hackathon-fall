from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task(name="process_document_task")
def process_document_task(document_id: str):
    # TODO: Integrate LangGraph agent workflow for document parsing & verification
    return f"Document {document_id} processed successfully."