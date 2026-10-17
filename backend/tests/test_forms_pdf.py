"""The PDF form engine, on a generated form with known labels (no network)."""
import io

import pdfplumber
from reportlab.pdfgen import canvas

from app.forms.pdf import Placement as P, data_sheet, fill
from app.forms.templates import FORMS


def make_form() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(595, 842))
    c.setFont("Helvetica", 10)
    c.drawString(60, 760, "1. Surname (Family name):")
    c.drawString(60, 720, "Date of birth:            year            month            day")
    c.drawString(60, 600, "Issued: year month day")  # no room for the values
    c.drawString(60, 680, "Sex: [ ] Male   [ ] Female")
    c.drawString(60, 640, "Address:")
    c.save()
    return buf.getvalue()


def words_near(pdf: bytes, top_min: float, top_max: float) -> list[dict]:
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        return [w for w in doc.pages[0].extract_words() if top_min <= w["top"] <= top_max]


def test_values_land_next_to_their_labels():
    placements = {
        "surname": P(1, "right", r"Surname \(Family name\):", field="surname", max_x=400),
        "year": P(1, "before_word", line=r"Date of birth:", word="year", field="dob", part="year"),
        "day": P(1, "before_word", line=r"Date of birth:", word="day", field="dob", part="day"),
        "sex_f": P(1, "check_at", r"\[ \] Female", when={"field": "sex", "equals": "F"}),
        "sex_m": P(1, "check_at", r"\[ \] Male", when={"field": "sex", "equals": "M"}),
        "address": P(1, "below", r"Address:", field="address", max_x=200),
        "missing": P(1, "right", r"No such label", field="surname"),
        "tight": P(1, "before_word", line=r"Issued:", word="year", field="dob", part="year"),
    }
    values = {"surname": "ERIKSSON", "dob": "12-08-1974", "sex": "F",
              "address": "Kossuth Lajos utca 19, 1053 Budapest, Hungary, Europe"}
    r = fill(make_form(), placements, values)
    assert set(r.placed) == {"surname", "year", "day", "sex_f", "address"}  # sex_m: condition false
    # An anchor that isn't on the form, or a gap too small, is reported, never guessed or drawn over text.
    assert r.not_found == ["missing", "tight"]
    tight = [w["text"] for w in words_near(r.pdf, 230, 250)]
    assert tight == ["Issued:", "year", "month", "day"]

    row = words_near(r.pdf, 70, 90)  # the surname line (top ≈ 82)
    label_end = max(w["x1"] for w in row if w["text"] == "name):")
    surname = next(w for w in row if w["text"] == "ERIKSSON")
    assert surname["x0"] > label_end  # written after the label, on the same line

    # Values are drawn in their own font (DejaVu; the form uses Helvetica), so read by character.
    with pdfplumber.open(io.BytesIO(r.pdf)) as doc:
        chars = [ch for ch in doc.pages[0].chars if 110 <= ch["top"] <= 130 and ch["text"].strip()]
    printed = [ch for ch in chars if "Helvetica" in ch["fontname"]]
    drawn = [ch for ch in chars if "DejaVu" in ch["fontname"]]
    def drawn_before(word: str) -> str:
        line = "".join(ch["text"] for ch in printed)
        start = printed[line.index(word)]["x0"]  # where the printed word begins
        prev_end = max(ch["x1"] for ch in printed if ch["x1"] < start)
        return "".join(ch["text"] for ch in drawn if prev_end <= ch["x0"] < start)
    assert drawn_before("year") == "1974"  # in the gap right before "year", not over a label
    assert drawn_before("day") == "12"

    addr = [w["text"] for w in words_near(r.pdf, 200, 240)]
    assert "Kossuth" in addr and "Europe" in addr  # too long for the box: wrapped, not cut


def test_every_form_definition_is_consistent():
    for key, form in FORMS.items():
        field_keys = {f["key"] for f in form["fields"]}
        for name, p in form["pdf"]["placements"].items():
            ref = p.when["field"] if p.when else p.field
            assert ref in field_keys, f"{key}.{name} refers to unknown field {ref}"


def test_data_sheet_renders_unicode_and_missing_fields():
    pdf = data_sheet("Form", "Journey", [
        {"label": "Surname", "value": "ŐRSÉG-ÁRVAI", "source_label": "Passport"},
        {"label": "Phone", "value": None, "hint": "with country code"},
    ], ["Check every value."], "https://example.org/form")
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        text = doc.pages[0].extract_text()
    assert "ŐRSÉG-ÁRVAI" in text and "To fill in: with country code" in text
