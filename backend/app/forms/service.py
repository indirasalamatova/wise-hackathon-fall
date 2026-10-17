"""
Official form PDFs: found on their official page, fetched from allowlisted domains only,
cached for a day in memory and kept in object storage as a fallback if the site is down.
"""
from __future__ import annotations

import hashlib
import logging
import re
import time
from typing import Optional
from urllib.parse import urljoin

from app.models import PrefilledForm
from app.pipeline.fetch import Fetcher, allowed
from app.services.storage import StorageService

from . import pdf as pdfmod
from .templates import pdf_spec

log = logging.getLogger(__name__)
CACHE_S = 24 * 3600
_memory: dict[str, tuple[float, bytes]] = {}


async def _download(spec: dict) -> Optional[bytes]:
    async with Fetcher() as f:
        page = await f.client.get(spec["find_on"])
        links = [urljoin(str(page.url), h) for h in re.findall(r'href="([^"]+)"', page.text) if re.search(spec["link_pattern"], h)]
        for link in links:
            link = re.sub(r"^http://", "https://", link)
            if not allowed(link):
                continue
            r = await f.client.get(link)
            if r.status_code == 200 and allowed(str(r.url)) and r.content.startswith(b"%PDF"):
                return r.content
    return None


async def official_pdf(form_key: str) -> Optional[bytes]:
    spec = pdf_spec(form_key)
    if not spec:
        return None
    key = f"forms/{form_key}-{hashlib.sha256((spec['find_on'] + spec['link_pattern']).encode()).hexdigest()[:16]}.pdf"
    hit = _memory.get(key)
    if hit and time.monotonic() - hit[0] < CACHE_S:
        return hit[1]
    try:
        data = await _download(spec)
        if data:
            _memory[key] = (time.monotonic(), data)
            await StorageService.put(key, data, "application/pdf")
            return data
    except Exception as e:  # network or site problem: fall back to the stored copy
        log.warning("couldn't fetch official form %s: %s", form_key, e)
    try:
        data = await StorageService.get(key)
        _memory[key] = (time.monotonic(), data)
        return data
    except Exception:
        return None


def values_of(form: PrefilledForm) -> dict[str, Optional[str]]:
    return {f["key"]: f.get("value") for f in form.fields}


async def filled_official(form: PrefilledForm) -> tuple[Optional[bytes], list[str]]:
    """(filled PDF, fields that couldn't be placed) or (None, []) if there's no printable official form."""
    spec = pdf_spec(form.form_key)
    original = await official_pdf(form.form_key)
    if not spec or not original:
        return None, []
    result = pdfmod.fill(original, spec["placements"], values_of(form))
    return result.pdf, result.not_found


def datasheet(form: PrefilledForm, journey_title: Optional[str], passport_verified: bool) -> bytes:
    fields = [{**f, "source_label": pdfmod.label_for_source(f.get("source"), passport_verified) if f.get("value") else ""} for f in form.fields]
    missing = [f["label"] for f in form.fields if not f.get("value")]
    notes = [
        "Prepared by Unbound from your documents and profile. Check every value against your passport before you submit or sign.",
        f"Still to complete: {', '.join(missing)}." if missing else "Every field has a value.",
    ]
    subtitle = f"{journey_title} · " if journey_title else ""
    return pdfmod.data_sheet(form.title, subtitle + "values to copy into the official form", fields, notes, form.official_url)
