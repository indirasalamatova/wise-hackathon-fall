"""
Background worker (run as its own process: `python -m app.worker`).

- Document analysis queue: claims pending analyses from the database, so uploads are
  analysed even if the API restarts; a claim older than CLAIM_TIMEOUT is retried.
- Guidelines pipeline: runs once a day at PIPELINE_HOUR_UTC, plus any run an admin
  queued. A Postgres advisory lock keeps it to one run at a time across workers.
"""
from __future__ import annotations

import asyncio
import logging
import os
import signal
from datetime import timedelta

from sqlalchemy import text
from sqlmodel import select

from app.agents.documents import analyze_document
from app.core.database import async_session_maker, engine, init_db
from app.core.logging import setup_logging
from app.models import PipelineRun, utcnow
from app.pipeline import run as pipeline

log = logging.getLogger("worker")

POLL_S = 3
CLAIM_TIMEOUT = timedelta(minutes=10)
PIPELINE_HOUR_UTC = int(os.getenv("PIPELINE_HOUR_UTC", "3"))
PIPELINE_ENABLED = os.getenv("PIPELINE_ENABLED", "true").lower() == "true"
PIPELINE_LOCK = 0x756E626F  # arbitrary constant: "unbo"

_stop = asyncio.Event()


async def claim_analysis() -> str | None:
    async with async_session_maker() as session:
        row = (await session.execute(text(
            """
            UPDATE document_analyses SET claimed_at = now()
            WHERE id = (
                SELECT id FROM document_analyses
                WHERE status = 'pending' AND (claimed_at IS NULL OR claimed_at < now() - make_interval(secs => :timeout))
                ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
            )
            RETURNING document_id
            """
        ), {"timeout": CLAIM_TIMEOUT.total_seconds()})).first()
        await session.commit()
        return row[0] if row else None


async def analysis_loop():
    while not _stop.is_set():
        doc_id = await claim_analysis()
        if doc_id:
            log.info("analysing document %s", doc_id)
            await analyze_document(doc_id)
            continue
        try:
            await asyncio.wait_for(_stop.wait(), POLL_S)
        except asyncio.TimeoutError:
            pass


async def next_pipeline_run() -> str | None:
    """A queued manual run, or today's scheduled run if it's due and hasn't happened."""
    async with async_session_maker() as session:
        queued = (await session.exec(select(PipelineRun).where(PipelineRun.status == "queued").order_by(PipelineRun.created_at))).first()
        if queued:
            return queued.id
        if not PIPELINE_ENABLED:
            return None
        now = utcnow()
        if now.hour < PIPELINE_HOUR_UTC:
            return None
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today = (await session.exec(select(PipelineRun).where(
            PipelineRun.trigger == "schedule", PipelineRun.created_at >= day_start,
        ))).first()
        if today:
            return None
        run = PipelineRun(trigger="schedule")
        session.add(run)
        await session.commit()
        return run.id


async def pipeline_loop():
    while not _stop.is_set():
        async with engine.connect() as conn:
            got = (await conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": PIPELINE_LOCK})).scalar()
            if got:
                try:
                    run_id = await next_pipeline_run()
                    if run_id:
                        log.info("pipeline run %s starting", run_id)
                        run = await pipeline.execute(run_id)
                        log.info("pipeline run %s finished: %s", run_id, run.status)
                finally:
                    await conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": PIPELINE_LOCK})
                    await conn.commit()
        try:
            await asyncio.wait_for(_stop.wait(), 30)
        except asyncio.TimeoutError:
            pass


async def main():
    setup_logging()
    await init_db()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _stop.set)
    log.info("worker started (pipeline %s at %02d:00 UTC)", "on" if PIPELINE_ENABLED else "off", PIPELINE_HOUR_UTC)
    await asyncio.gather(analysis_loop(), pipeline_loop())
    log.info("worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
