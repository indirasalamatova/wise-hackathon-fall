"""Reading a PDF's text layer for the local model (no model calls)."""
from app.agents.documents import _mrz_from_text

L1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
L2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"


def test_mrz_is_taken_from_the_text_layer():
    text = f"PASSPORT\nSurname: ERIKSSON\nDate of birth: 12 AUG 74\n{L1}\n{L2}"
    mrz = _mrz_from_text(text)
    assert mrz and (mrz.line1, mrz.line2) == (L1, L2)


def test_spaces_inside_mrz_lines_are_ignored():
    mrz = _mrz_from_text(f"{L1[:20]} {L1[20:]}\n{L2}")
    assert mrz and mrz.line1 == L1


def test_no_mrz_without_two_matching_lines():
    assert _mrz_from_text("INVOICE\nTOTAL<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n") is None
    assert _mrz_from_text(f"{L1}\nsome other line") is None
