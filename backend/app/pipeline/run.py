"""
One pipeline run: for every target, fetch the official pages, then either
  - re-verify the published entry's quotes if the pages haven't changed (no model call), or
  - extract a new version with the model, verify it in code, and publish or hold it.

A target that fails keeps its previous entry; that entry stops being used once it is older
than PIPELINE_MAX_AGE_DAYS, and the agent then says the country is being updated.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import timedelta
from typing import Any, Optional

from sqlmodel import delete, select

from app.agents import guidelines
from app.agents.schema import GuidelineIn
from app.core.database import async_session_maker
from app.models import CountryGuideline, PipelineRun, SourceSnapshot, utcnow
from app.pipeline import verify as v
from app.pipeline.extract import discover, extract
from app.pipeline.fetch import Fetcher, Page
from app.pipeline.targets import TARGETS, Target

log = logging.getLogger(__name__)
SNAPSHOT_RETENTION_DAYS = 30


def combined_hash(pages: list[Page]) -> str:
    return hashlib.sha256("\n".join(sorted(f"{p.final_url} {p.content_hash}" for p in pages)).encode()).hexdigest()


def reverify(entry: CountryGuideline, texts: dict[str, str]) -> bool:
    """True if every stored quote is still on its page (pages unchanged or only cosmetically changed)."""
    items = [*entry.requirements, *entry.fees, *entry.steps]
    return bool(items) and all(
        (it.get("evidence") or {}).get("url") in texts and v.quote_on_page(it["evidence"]["quote"], texts[it["evidence"]["url"]])
        for it in items
    )


async def process_target(session, run: PipelineRun, fetcher: Fetcher, target: Target, discovery: bool = True) -> dict[str, Any]:
    result: dict[str, Any] = {"target": target.key, "status": "failed"}
    urls = list(target.seeds)
    if discovery:
        found, note = await discover(target, fetcher)
        urls += found
        result["discovered"] = found
        if note:
            result["note"] = note

    fetched: list[Page] = []
    for url in dict.fromkeys(urls):
        page = await fetcher.fetch(url)
        fetched.append(page)
        session.add(SourceSnapshot(
            run_id=run.id, url=url, final_url=page.final_url, status_code=page.status,
            found_by="seed" if url in target.seeds else "search", content_hash=page.content_hash,
            text=page.text, error=page.error,
        ))
    await session.commit()
    pages = [p for p in fetched if p.text]
    result["sources"] = [{"url": p.final_url, "title": p.title} for p in pages]
    result["fetch_errors"] = [{"url": p.url, "error": p.error} for p in fetched if p.error]
    if not pages:
        result["reason"] = "no official page could be fetched"
        return result

    texts = {p.final_url: p.text for p in pages}
    source_hash = combined_hash(pages)
    entry = (await session.exec(select(CountryGuideline).where(
        CountryGuideline.destination_code == target.destination_code,
        CountryGuideline.origin_code == target.origin_code,
        CountryGuideline.purpose == target.purpose,
    ))).first()
    published = entry if entry and entry.managed_by == "pipeline" and entry.verified_at else None

    if published and published.source_hash == source_hash and reverify(published, texts):
        published.verified_at = published.checked_at = utcnow()
        session.add(published)
        await session.commit()
        result.update(status="reverified", reason="sources unchanged; every quote re-checked", version=published.version)
        return result

    extracted, error, model = await extract(target, pages)
    result["model"] = model
    if error:
        result["reason"] = error
        return result

    checked = v.verify(extracted, texts)
    decision = v.decide(checked, extracted.get("applies", False), len(published.requirements) if published else None)
    result.update(
        verified={"requirements": len(checked.requirements), "fees": len(checked.fees), "steps": len(checked.steps)},
        dropped=checked.dropped,
    )
    if not decision.publish:
        if entry:
            entry.checked_at = utcnow()
            session.add(entry)
            await session.commit()
        result.update(status="held", reason=decision.reason)
        return result

    used = [p for p in pages if p.final_url in checked.used_urls]
    g = GuidelineIn(
        destination_code=target.destination_code, destination_name=target.destination_name,
        origin_code=target.origin_code, purpose=target.purpose,
        visa_type=extracted["visa_type"], summary=extracted["summary"],
        max_stay_days=checked.max_stay_days, processing_days_max=checked.processing_days_max,
        requirements=checked.requirements, fees=checked.fees, steps=checked.steps, forms=list(target.forms),
        sources=[{"title": p.title or p.final_url, "url": p.final_url} for p in used] or [{"title": pages[0].title, "url": pages[0].final_url}],
        verified_at=utcnow(),
    )
    row, action = await guidelines.upsert(session, g, managed_by="pipeline", source_hash=source_hash)
    await session.commit()
    result.update(status="published", reason=decision.reason, action=action, version=row.version)
    return result


async def execute(run_id: str, targets: Optional[tuple[Target, ...]] = None, discovery: bool = True) -> PipelineRun:
    async with async_session_maker() as session:
        run = await session.get(PipelineRun, run_id)
        run.status, run.started_at = "running", utcnow()
        session.add(run)
        await session.commit()
        results, log_lines = [], []
        try:
            async with Fetcher() as fetcher:
                for target in targets or TARGETS:
                    try:
                        res = await process_target(session, run, fetcher, target, discovery)
                    except Exception as e:  # one target never stops the others
                        log.exception("pipeline target %s crashed", target.key)
                        await session.rollback()
                        res = {"target": target.key, "status": "failed", "reason": f"crashed: {type(e).__name__}: {e}"}
                    results.append(res)
                    log_lines.append(f"{target.key}: {res['status']} ({res.get('reason', '')})")
                    log.info("pipeline %s", log_lines[-1])
            await session.execute(delete(SourceSnapshot).where(SourceSnapshot.fetched_at < utcnow() - timedelta(days=SNAPSHOT_RETENTION_DAYS)))
        except Exception as e:
            log.exception("pipeline run crashed")
            await session.rollback()
            log_lines.append(f"run crashed: {type(e).__name__}: {e}")
        run = await session.get(PipelineRun, run_id)
        run.results, run.log, run.finished_at = results, log_lines, utcnow()
        run.status = "done" if results and len(results) == len(targets or TARGETS) and all(r["status"] != "failed" for r in results) else "failed"
        session.add(run)
        await session.commit()
        return run
