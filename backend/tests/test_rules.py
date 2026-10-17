from datetime import date

from app.agents.rules import (
    UserDoc, add_months, check_requirements, fill_form, mrz_check_digit, normalize_date,
    normalize_extraction, parse_td3_mrz, sum_fees,
)

TODAY = date(2026, 10, 17)
# ICAO Doc 9303 specimen passport
MRZ1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
MRZ2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"


def test_normalize_date_formats():
    assert normalize_date("2031-03-12").iso == "2031-03-12"
    assert normalize_date("12.03.2031").iso == "2031-03-12"
    assert normalize_date("12-03-2031").iso == "2031-03-12"
    assert normalize_date("12 MAR 2031").iso == "2031-03-12"
    assert normalize_date("12 марта 2031").iso == "2031-03-12"
    assert normalize_date("13/03/2031").iso == "2031-03-13"
    assert normalize_date("03/13/2031").iso == "2031-03-13"


def test_normalize_date_refuses_to_guess():
    r = normalize_date("03/04/2031")
    assert r.iso is None and "ambiguous" in r.issue
    assert normalize_date("31.02.2031").iso is None
    assert normalize_date(None).issue == "missing"


def test_add_months_clamps_end_of_month():
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert add_months(date(2026, 11, 15), 3) == date(2027, 2, 15)


def test_mrz_check_digits_and_parse():
    assert mrz_check_digit("L898902C3") == "6"
    r = parse_td3_mrz(MRZ1, MRZ2, TODAY)
    assert r.valid, r.issues
    assert r.fields["document_number"] == "L898902C3"
    assert r.fields["date_of_birth"] == "1974-08-12"
    assert r.fields["expiry_date"] == "2012-04-15"
    assert r.fields["surname"] == "ERIKSSON"


def test_mrz_tampering_is_detected():
    bad = MRZ2[:13] + "7408132" + MRZ2[20:]  # change birth day, keep old check digit
    r = parse_td3_mrz(MRZ1, bad, TODAY)
    assert not r.valid
    assert any("date of birth" in i for i in r.issues)


def test_normalize_extraction_prefers_verified_mrz():
    raw = {"document_kind": "passport", "full_name": "Anna Maria Eriksson", "document_number": "L898902C3",
           "date_of_birth": "13.08.1974", "expiry_date": "15.04.2012", "mrz": {"line1": MRZ1, "line2": MRZ2}}
    out, issues = normalize_extraction(raw, TODAY)
    assert out["mrz_verified"] is True
    assert out["date_of_birth"] == "1974-08-12"  # MRZ wins over the misread printed date
    assert any(i["field"] == "date_of_birth" for i in issues)
    assert any(i["severity"] == "error" and "Expired" in i["message"] for i in issues)


def test_sum_fees_is_exact_and_never_guesses():
    r = sum_fees([
        {"title": "Visa fee", "amount": "90", "currency": "EUR"},
        {"title": "Photo", "amount": "0.10", "currency": "EUR"},
        {"title": "Photo 2", "amount": "0.20", "currency": "EUR"},
        {"title": "Service fee", "amount": None, "currency": "EUR"},
        {"title": "Courier", "amount": "15", "currency": "EUR", "mandatory": False},
    ])
    assert r["mandatory_totals"] == {"EUR": "90.30"}
    assert r["amounts_not_fixed"] == ["Service fee"]


def test_check_requirements_passport_validity_after_trip():
    reqs = [{"key": "passport", "title": "Passport", "doc_kind": "passport", "constraints": {"valid_months_after_stay": 3}},
            {"key": "insurance", "title": "Travel insurance", "doc_kind": "insurance"}]
    docs = [UserDoc("1", "Passport", "Passport", "passport", "2027-01-10", "2017-01-10", [])]
    r = check_requirements(reqs, docs, date(2026, 12, 1), 14, TODAY)
    passport = r["requirements"][0]
    assert passport["status"] == "problem"
    assert "2027-03-15" in passport["problems"][0]["problems"][0]  # 1 Dec + 14 days + 3 months
    assert r["requirements"][1]["status"] == "missing"
    ok = check_requirements(reqs[:1], [UserDoc("1", "Passport", "Passport", None, "2031-03-12", None, [])], date(2026, 12, 1), 14, TODAY)
    assert ok["requirements"][0]["status"] == "satisfied"


def test_fill_form_formats_and_leaves_unknowns_empty():
    tpl = {"fields": [
        {"key": "surname", "label": "Surname", "source": "passport.surname", "format": "upper"},
        {"key": "dob", "label": "Date of birth", "source": ["passport.date_of_birth", "profile.date_of_birth"], "format": "date:DD-MM-YYYY"},
        {"key": "phone", "label": "Phone", "source": "profile.phone"},
    ]}
    out = fill_form(tpl, {"passport": {"surname": "Ivanova", "date_of_birth": "1999-05-04"}, "profile": {}})
    assert [f["value"] for f in out] == ["IVANOVA", "04-05-1999", None]
    assert out[2]["status"] == "missing"


def test_normalize_extraction_names_from_mrz():
    out, _ = normalize_extraction({"document_kind": "passport", "sex": "Ж", "mrz": {"line1": MRZ1, "line2": MRZ2}}, TODAY)
    assert (out["surname"], out["given_names"], out["sex"]) == ("ERIKSSON", "ANNA MARIA", "F")


def test_unknown_values_never_pass_a_constraint():
    reqs = [
        {"key": "funds", "title": "Funds", "doc_kind": "bank_statement", "constraints": {"max_age_days": 30}},
        {"key": "insurance", "title": "Insurance", "doc_kind": "insurance", "constraints": {"min_amount": "30000.00", "min_amount_currency": "EUR"}},
        {"key": "passport", "title": "Passport", "doc_kind": "passport", "constraints": {"valid_months_after_stay": 3}},
    ]
    docs = [
        UserDoc("1", "Statement", "Finances", None, None, None, []),
        UserDoc("2", "Policy", "Insurance", "insurance", "2027-06-01", None, [], amount=None),
        UserDoc("3", "Passport", "Passport", "passport", None, None, []),
    ]
    r = {x["key"]: x for x in check_requirements(reqs, docs, date(2026, 12, 1), 10, TODAY)["requirements"]}
    assert all(x["status"] == "problem" for x in r.values()), r
    assert "issue date unknown" in r["funds"]["problems"][0]["problems"][0]


def test_min_amount_compares_exact_decimals():
    req = [{"key": "insurance", "title": "Insurance", "doc_kind": "insurance", "constraints": {"min_amount": "30000.00", "min_amount_currency": "EUR"}}]
    low = UserDoc("2", "Policy", "Insurance", "insurance", None, None, [], amount="29999.99", currency="EUR")
    ok = UserDoc("2", "Policy", "Insurance", "insurance", None, None, [], amount="30000.00", currency="EUR")
    usd = UserDoc("2", "Policy", "Insurance", "insurance", None, None, [], amount="50000.00", currency="USD")
    assert check_requirements(req, [low], None, None, TODAY)["requirements"][0]["status"] == "problem"
    assert check_requirements(req, [ok], None, None, TODAY)["requirements"][0]["status"] == "satisfied"
    assert "convert" in check_requirements(req, [usd], None, None, TODAY)["requirements"][0]["problems"][0]["problems"][0]
