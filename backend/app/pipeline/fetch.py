"""
Polite fetching of official pages: allowlisted domains only, robots.txt respected,
one request per host per second, TLS always verified, size-capped. HTML and PDF are
turned into plain text; quotes are later verified against exactly this text.
"""
from __future__ import annotations

import asyncio
import hashlib
import html as htmllib
import io
import logging
import re
import time
import urllib.robotparser
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin, urlsplit

import httpx

log = logging.getLogger(__name__)

# Only official government / EU sources. Facts are only ever verified against these.
ALLOWED_DOMAINS = (
    "oif.gov.hu",
    "enterhungary.gov.hu",
    "kormany.hu",
    "njt.hu",
    "home-affairs.ec.europa.eu",
    "europa.eu",
    "eur-lex.europa.eu",
)
USER_AGENT = "UnboundGuidelinesBot/1.0 (immigration guidance; contact: admin)"
MAX_BYTES = 5 * 1024 * 1024
MAX_TEXT_CHARS = 150_000
HOST_DELAY_S = 1.0


def allowed(url: str) -> bool:
    host = (urlsplit(url).hostname or "").lower()
    return urlsplit(url).scheme == "https" and any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS)


@dataclass
class Page:
    url: str
    final_url: str
    status: int
    text: str = ""
    title: str = ""
    content_hash: Optional[str] = None
    error: Optional[str] = None
    links: list[tuple[str, str]] = field(default_factory=list)


# Style residue left in pages pasted from Microsoft Word.
_WORD_JUNK = {"Normal", "false", "true", "X-NONE", "MicrosoftInternetExplorer4"}
_DROP = re.compile(r"(?is)<(script|style|noscript|nav|header|footer|aside|form|svg)[^>]*>.*?</\1>")
_BREAKS = re.compile(r"(?i)<br\s*/?>|</(p|li|h[1-6]|tr|div|section|table|ul|ol)>")


def html_to_text(raw: str) -> tuple[str, str, list[tuple[str, str]]]:
    title_m = re.search(r"(?is)<title[^>]*>(.*?)</title>", raw)
    title = htmllib.unescape(re.sub(r"\s+", " ", title_m.group(1))).strip() if title_m else ""
    main = re.search(r"(?is)<main[^>]*>(.*)</main>", raw)
    body = main.group(1) if main else raw
    links = [(href, htmllib.unescape(re.sub(r"<[^>]+>|\s+", " ", label)).strip())
             for href, label in re.findall(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', body)]
    body = _BREAKS.sub("\n", _DROP.sub(" ", body))
    text = htmllib.unescape(re.sub(r"<[^>]+>", " ", body))
    lines = [re.sub(r"[ \t ]+", " ", ln).strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln and ln not in _WORD_JUNK)[:MAX_TEXT_CHARS], title, links


def pdf_to_text(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join((p.extract_text() or "") for p in reader.pages)[:MAX_TEXT_CHARS]


class Fetcher:
    def __init__(self):
        self.client = httpx.AsyncClient(follow_redirects=True, timeout=30, headers={"User-Agent": USER_AGENT})
        self._robots: dict[str, Optional[urllib.robotparser.RobotFileParser]] = {}
        self._last: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.client.aclose()

    async def _polite(self, host: str):
        async with self._lock:
            wait = self._last.get(host, 0) + HOST_DELAY_S - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
            self._last[host] = time.monotonic()

    async def _robots_ok(self, url: str) -> bool:
        parts = urlsplit(url)
        host = parts.hostname or ""
        if host not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                await self._polite(host)
                r = await self.client.get(f"{parts.scheme}://{host}/robots.txt")
                if r.status_code == 200:
                    rp.parse(r.text.splitlines())
                    self._robots[host] = rp
                else:
                    self._robots[host] = None  # no robots.txt: allowed
            except httpx.HTTPError:
                self._robots[host] = None
        rp = self._robots[host]
        return rp is None or rp.can_fetch(USER_AGENT, url)

    async def fetch(self, url: str) -> Page:
        if not allowed(url):
            return Page(url, url, 0, error="not an allowlisted official domain")
        if not await self._robots_ok(url):
            return Page(url, url, 0, error="disallowed by robots.txt")
        try:
            await self._polite(urlsplit(url).hostname or "")
            async with self.client.stream("GET", url) as r:
                final = str(r.url)
                if not allowed(final):
                    return Page(url, final, r.status_code, error="redirected off the allowlist")
                if r.status_code != 200:
                    return Page(url, final, r.status_code, error=f"HTTP {r.status_code}")
                chunks, size = [], 0
                async for chunk in r.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_BYTES:
                        return Page(url, final, r.status_code, error="page too large")
                    chunks.append(chunk)
                data = b"".join(chunks)
                ctype = r.headers.get("content-type", "")
        except httpx.HTTPError as e:
            return Page(url, url, 0, error=f"{type(e).__name__}: {str(e)[:200]}")

        try:
            if "pdf" in ctype or final.lower().endswith(".pdf"):
                text, title, links = pdf_to_text(data), final.rsplit("/", 1)[-1], []
            elif "html" in ctype:
                text, title, links = html_to_text(data.decode(r.encoding or "utf-8", errors="replace"))
            else:
                return Page(url, final, 200, error=f"unsupported content type {ctype}")
        except Exception as e:  # malformed PDF/HTML
            return Page(url, final, 200, error=f"couldn’t read the page: {type(e).__name__}")
        if len(text) < 200:
            return Page(url, final, 200, error="page has almost no text")
        return Page(
            url, final, 200, text=text, title=title,
            content_hash=hashlib.sha256(text.encode()).hexdigest(),
            links=[(urljoin(final, h), lbl) for h, lbl in links],
        )

    async def resolve(self, url: str) -> Optional[str]:
        """Follow a redirect link (e.g. a search result) to its final URL without downloading the body."""
        try:
            async with self.client.stream("GET", url) as r:
                return str(r.url)
        except httpx.HTTPError:
            return None
