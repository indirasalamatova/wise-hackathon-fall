from app.pipeline.verify import amount_in_quote, decide, normalize, number_in_text, quote_on_page, verify

FEES = ("Eljárási díjak A díj mértéke I. Rövid időtartamú tartózkodásra jogosító vízummal összefüggő díjak "
        "2. ... belföldön előterjesztett fellebbezés esetén 12 000 Ft 3. Kishatárforgalmi engedély ... 10 EUR")
STUDY = ("Tanulmányi cél. A kérelemhez csatolni kell: érvényes úti okmány másolatát; a hallgatói jogviszony igazolását; "
         "a lakhatás igazolását; egészségbiztosítás igazolását; a megélhetés fedezetének igazolását. "
         "Az úti okmány érvényességének legalább 3 hónappal meg kell haladnia a tartózkodás idejét.")
PAGES = {"https://oif.gov.hu/fees": FEES, "https://oif.gov.hu/study": STUDY}


def ev(url, quote):
    return {"url": url, "quote": quote}


def test_normalize_and_quote_matching():
    assert normalize("12 000  Ft – díj") == "12 000 ft - díj"
    assert quote_on_page("a hallgatói jogviszony igazolását", STUDY)
    assert quote_on_page("A kérelemhez csatolni kell: … a lakhatás igazolását", STUDY)  # elided, in order
    assert not quote_on_page("a lakhatás igazolását … A kérelemhez csatolni kell", STUDY)  # wrong order
    assert not quote_on_page("hallgatói jogviszony nem kell", STUDY)  # invented text
    assert not quote_on_page("díj", FEES)  # too short to prove anything


def test_amount_and_number_matching():
    assert amount_in_quote("12000.00", "HUF", "esetén 12 000 Ft")
    assert amount_in_quote("12000", "HUF", "12.000 forint")
    assert not amount_in_quote("1200", "HUF", "esetén 12 000 Ft")  # different number
    assert not amount_in_quote("12000", "EUR", "esetén 12 000 Ft")  # wrong currency
    assert amount_in_quote("90", "EUR", "The visa fee is €90 for adults")
    assert not amount_in_quote("9", "EUR", "The visa fee is €90")
    assert number_in_text(3, "legalább 3 hónappal")
    assert not number_in_text(3, "legalább 30 nap")


def test_verify_keeps_only_proven_facts():
    extracted = {
        "requirements": [
            {"key": "passport", "title": "Valid passport", "description": "Copy of passport", "doc_kind": "passport",
             "valid_months_after_stay": 3, "evidence": ev("https://oif.gov.hu/study", "Az úti okmány érvényességének legalább 3 hónappal meg kell haladnia")},
            {"key": "enrolment", "title": "Proof of student status", "description": "", "doc_kind": "enrolment",
             "evidence": ev("https://oif.gov.hu/study", "a hallgatói jogviszony igazolását")},
            {"key": "invented", "title": "Criminal record", "description": "", "doc_kind": "criminal_record",
             "evidence": ev("https://oif.gov.hu/study", "erkölcsi bizonyítvány szükséges")},
            {"key": "elsewhere", "title": "X", "description": "", "doc_kind": "other",
             "evidence": ev("https://example.com/blog", "a hallgatói jogviszony igazolását")},
            {"key": "insurance", "title": "Health insurance", "description": "", "doc_kind": "insurance",
             "max_age_days": 30, "evidence": ev("https://oif.gov.hu/study", "egészségbiztosítás igazolását")},
        ],
        "fees": [
            {"key": "appeal", "title": "Appeal fee", "amount": "12000", "currency": "HUF", "evidence": ev("https://oif.gov.hu/fees", "fellebbezés esetén 12 000 Ft")},
            {"key": "wrong", "title": "Wrong amount", "amount": "15000", "currency": "HUF", "evidence": ev("https://oif.gov.hu/fees", "fellebbezés esetén 12 000 Ft")},
        ],
        "steps": [{"key": "apply", "title": "Apply", "description": "", "days_before_travel": 45, "category": "Journey",
                   "evidence": ev("https://oif.gov.hu/study", "A kérelemhez csatolni kell")}],
        "max_stay_days": {"value": 90, "evidence": ev("https://oif.gov.hu/study", "a tartózkodás idejét")},
    }
    v = verify(extracted, PAGES)
    assert [r["key"] for r in v.requirements] == ["passport", "enrolment", "insurance"]
    assert v.requirements[0]["constraints"] == {"valid_months_after_stay": 3}
    assert v.requirements[2]["constraints"] == {}  # unproven max_age_days dropped
    assert [f["key"] for f in v.fees] == ["appeal"] and v.fees[0]["amount"] == "12000.00"
    assert v.steps[0]["days_before_travel"] is None  # deadline not in the quote
    assert v.max_stay_days is None
    reasons = {d["item"]: d["reason"] for d in v.dropped}
    assert "quote not found" in reasons["requirement: Criminal record"]
    assert "wasn't fetched" in reasons["requirement: X"]
    assert "not in the quote" in reasons["fee: Wrong amount"]


def test_decide():
    v = verify({"requirements": []}, PAGES)
    assert not decide(v, True, None).publish
    v.requirements = [{}] * 5
    assert decide(v, True, None).publish
    assert not decide(v, False, None).publish
    assert not decide(v, True, previous_requirements=10).publish  # lost half
    assert decide(v, True, previous_requirements=7).publish


def test_fee_for_a_subgroup_is_never_summed():
    v = verify({"fees": [
        {"key": "adult", "title": "Visa fee", "amount": "12000", "currency": "HUF", "mandatory": True, "applies_to": None,
         "evidence": ev("https://oif.gov.hu/fees", "fellebbezés esetén 12 000 Ft")},
        {"key": "child", "title": "Child fee", "amount": "12000", "currency": "HUF", "mandatory": True, "applies_to": "children",
         "evidence": ev("https://oif.gov.hu/fees", "fellebbezés esetén 12 000 Ft")},
    ]}, PAGES)
    assert [f["mandatory"] for f in v.fees] == [True, False]
    assert v.fees[1]["note"] == "For children"
