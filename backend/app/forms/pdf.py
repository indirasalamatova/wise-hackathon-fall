"""
Write values onto official, non-fillable PDF forms, and produce a clean data sheet.

Placements are anchored to the form's own printed text (found with pdfplumber), never to
hard-coded coordinates, so a re-typeset form still lines up as long as its labels exist.
A placement whose anchor can't be found is reported, not guessed. Values are drawn on a
transparent overlay (reportlab) and merged onto the original pages (pypdf).
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from typing import Any, Optional

import pdfplumber
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.agents.rules import normalize_date

FONT, FONT_BOLD = "UnboundSans", "UnboundSans-Bold"
_FONT_FILES = {FONT: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", FONT_BOLD: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"}
INK = colors.HexColor("#0b2a6f")  # dark blue, like a pen: easy to tell from the printed form
MIN_SIZE = 6.0


def _fonts() -> None:
    for name, path in _FONT_FILES.items():
        if name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name, path))  # Unicode: accents and Cyrillic render


@dataclass
class Placement:
    page: int  # 1-based
    place: str  # right | below | before_word | check_before | check_at
    anchor: Optional[str] = None  # regex matched against the page text
    occurrence: int = 1
    line: Optional[str] = None  # before_word: regex identifying the line
    word: Optional[str] = None  # before_word: the word on that line to write in front of
    word_occurrence: int = 1
    field: Optional[str] = None  # which form field's value to write
    part: Optional[str] = None  # year | month | day: write only that part of a date field
    when: Optional[dict] = None  # checks: {"field": key, "equals": value}
    dx: float = 0
    dy: float = 0
    max_x: Optional[float] = None
    size: float = 9


@dataclass
class Result:
    pdf: bytes
    placed: list[str] = field(default_factory=list)
    not_found: list[str] = field(default_factory=list)  # anchor missing or no room: never drawn over text


def _value(p: Placement, values: dict[str, Optional[str]]) -> Optional[str]:
    if p.when:
        return "X" if (values.get(p.when["field"]) or "").upper() == str(p.when["equals"]).upper() else None
    v = values.get(p.field or "")
    if not v or not p.part:
        return v
    iso = normalize_date(v).iso
    if not iso:
        return None
    y, m, d = iso.split("-")
    return {"year": y, "month": m, "day": d}[p.part]


def _find(page, p: Placement) -> Optional[dict]:
    if p.place == "before_word":
        words = page.extract_words(x_tolerance=1.5)
        lines = [m for m in page.search(p.line, regex=True)]
        if not lines:
            return None
        ln = lines[0]
        on_line = sorted((w for w in words if abs(w["top"] - ln["top"]) < 3), key=lambda w: w["x0"])
        hits = [w for w in on_line if w["x0"] >= ln["x1"] - 1 and w["text"].strip(",.:") == p.word]
        if len(hits) < p.word_occurrence:
            return None
        hit = dict(hits[p.word_occurrence - 1])
        # The value goes in the gap after the previous printed word; never over it.
        before = [w["x1"] for w in on_line if w["x1"] <= hit["x0"] + 0.5 and w is not hits[p.word_occurrence - 1]]
        hit["room_from"] = max(before) if before else 0
        return hit
    hits = page.search(p.anchor, regex=True)
    return hits[p.occurrence - 1] if len(hits) >= p.occurrence else None


def _fit(text: str, size: float, width: Optional[float]) -> tuple[list[str], float]:
    """Shrink to fit the box; if even the minimum size is too wide, wrap onto two lines."""
    if not width:
        return [text], size
    s = size
    while s > MIN_SIZE and pdfmetrics.stringWidth(text, FONT, s) > width:
        s -= 0.5
    if pdfmetrics.stringWidth(text, FONT, s) <= width:
        return [text], s
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if pdfmetrics.stringWidth(trial, FONT, s) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines, s


def fill(pdf_bytes: bytes, placements: dict[str, Placement], values: dict[str, Optional[str]]) -> Result:
    _fonts()
    result = Result(b"")
    reader = PdfReader(io.BytesIO(pdf_bytes))
    overlays: dict[int, canvas.Canvas] = {}
    buffers: dict[int, io.BytesIO] = {}
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as plumber:
        for name, p in placements.items():
            text = _value(p, values)
            if not text:
                continue
            if p.page > len(plumber.pages):
                result.not_found.append(name)
                continue
            page = plumber.pages[p.page - 1]
            box = _find(page, p)
            if not box:
                result.not_found.append(name)
                continue
            h = float(page.height)
            if p.page not in overlays:
                buffers[p.page] = io.BytesIO()
                overlays[p.page] = canvas.Canvas(buffers[p.page], pagesize=(float(page.width), h))
            c = overlays[p.page]
            c.setFillColor(INK)
            if p.place in ("check_before", "check_at"):
                c.setFont(FONT_BOLD, 9)
                x = box["x0"] - 9 if p.place == "check_before" else box["x0"] + 1
                c.drawString(x + p.dx, h - box["bottom"] + 1.5 + p.dy, "X")
            elif p.place == "before_word":
                right = box["x0"] - 3 + p.dx
                room = right - box["room_from"] - 3
                lines, size = _fit(text, p.size, room)
                if len(lines) > 1 or pdfmetrics.stringWidth(text, FONT, size) > room:  # no room: leave it for the data sheet
                    result.not_found.append(name)
                    continue
                c.setFont(FONT, size)
                c.drawRightString(right, h - box["bottom"] + 1.5 + p.dy, text)
            else:
                x = (box["x1"] + 4 if p.place == "right" else box["x0"]) + p.dx
                width = (p.max_x - x) if p.max_x else None
                lines, size = _fit(text, p.size, width)
                y = (h - box["bottom"] + 1.5 if p.place == "right" else h - box["bottom"] - size - 2) + p.dy
                c.setFont(FONT, size)
                for i, ln in enumerate(lines):
                    c.drawString(x, y - i * (size + 1.5), ln)
            result.placed.append(name)

    writer = PdfWriter()
    for i, src in enumerate(reader.pages, start=1):
        if i in overlays:
            overlays[i].save()
            src.merge_page(PdfReader(io.BytesIO(buffers[i].getvalue())).pages[0])
        writer.add_page(src)
    out = io.BytesIO()
    writer.write(out)
    result.pdf = out.getvalue()
    return result


def data_sheet(title: str, subtitle: str, fields: list[dict[str, Any]], notes: list[str], official_url: Optional[str]) -> bytes:
    """A clean, printable summary of every field and where its value came from, for online forms."""
    _fonts()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                            title=title, author="Unbound")
    h1 = ParagraphStyle("h1", fontName=FONT_BOLD, fontSize=16, leading=20, textColor=colors.HexColor("#03100a"))
    small = ParagraphStyle("s", fontName=FONT, fontSize=8.5, leading=11, textColor=colors.HexColor("#5f5a5a"))
    cell = ParagraphStyle("c", fontName=FONT, fontSize=9, leading=12)
    bold = ParagraphStyle("b", parent=cell, fontName=FONT_BOLD)
    missing = ParagraphStyle("m", parent=cell, textColor=colors.HexColor("#8a5a12"))

    def esc(s: str) -> str:
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    rows = [[Paragraph("Field", bold), Paragraph("Value", bold), Paragraph("From", bold)]]
    for f in fields:
        val = Paragraph(esc(f["value"]), cell) if f.get("value") else Paragraph(esc("To fill in" + (f": {f['hint']}" if f.get("hint") else "")), missing)
        rows.append([Paragraph(esc(f["label"]), cell), val, Paragraph(esc(f.get("source_label") or ""), small)])
    table = Table(rows, colWidths=[62 * mm, 72 * mm, 40 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#ecd3d3")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f9f1f1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story = [Paragraph(esc(title), h1), Spacer(1, 3), Paragraph(esc(subtitle), small), Spacer(1, 10), table, Spacer(1, 12)]
    for n in notes:
        story.append(Paragraph(esc(n), small))
        story.append(Spacer(1, 3))
    if official_url:
        story.append(Paragraph(f"Official form: {esc(official_url)}", small))
    doc.build(story)
    return buf.getvalue()


# Passport fields carried by the machine-readable zone (check digits verify them).
MRZ_FIELDS = {"surname", "given_names", "document_number", "nationality", "date_of_birth", "expiry_date", "sex", "issuing_country"}


def label_for_source(path: Optional[str], passport_verified: bool) -> str:
    if not path:
        return "You"
    kind, _, name = path.partition(".")
    return {
        "passport": "Passport (MRZ verified)" if passport_verified and name in MRZ_FIELDS else "Passport",
        "profile": "Your profile",
        "plan": "Your journey",
        "accommodation": "Accommodation document",
        "enrolment": "Enrolment document",
        "employment_contract": "Employment contract",
        "insurance": "Insurance document",
    }.get(kind, kind.replace("_", " ").title())


def safe_filename(s: str) -> str:
    return re.sub(r"[^\w.-]+", "-", s).strip("-")[:80] or "form"
