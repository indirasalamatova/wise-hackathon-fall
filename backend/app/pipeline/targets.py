"""
What the pipeline keeps up to date: one guideline per (destination, citizenship, purpose).

`seeds` are the official pages to read every run; web discovery may add pages on the
same allowlisted domains. Form templates are structural (which field is which), not
rules, so they live here; every rule comes from the verified pages.
"""
from __future__ import annotations

from dataclasses import dataclass, field

OIF_FEES = "https://oif.gov.hu/tajekoztatok/eljarasi-dijak"

# Field keys are shared with the PDF placements in app/forms/templates.py.
SCHENGEN_FORM = {
    "key": "schengen_application",
    "title": "Schengen visa application form",
    "official_url": "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en",
    "fields": [
        {"key": "surname", "label": "1. Surname (family name)", "source": "passport.surname", "format": "upper"},
        {"key": "given_names", "label": "3. First name(s)", "source": "passport.given_names", "format": "upper"},
        {"key": "date_of_birth", "label": "4. Date of birth (day-month-year)", "source": "passport.date_of_birth", "format": "date:DD-MM-YYYY"},
        {"key": "place_of_birth", "label": "5. Place of birth", "source": "passport.place_of_birth", "format": "upper"},
        {"key": "nationality", "label": "7. Current nationality", "source": ["passport.nationality", "profile.citizenship"], "format": "upper"},
        {"key": "sex", "label": "8. Sex (M/F)", "source": "passport.sex"},
        {"key": "travel_document_type", "label": "12. Type of travel document", "source": None, "hint": "Tick the box for your passport type"},
        {"key": "document_number", "label": "13. Number of travel document", "source": "passport.document_number"},
        {"key": "issue_date", "label": "14. Date of issue", "source": "passport.issue_date", "format": "date:DD-MM-YYYY"},
        {"key": "expiry_date", "label": "15. Valid until", "source": "passport.expiry_date", "format": "date:DD-MM-YYYY"},
        {"key": "issuing_country", "label": "16. Issued by (country)", "source": "passport.issuing_country", "format": "upper"},
        {"key": "address", "label": "19. Home address", "source": "profile.address"},
        {"key": "email", "label": "19. Email address", "source": "profile.email"},
        {"key": "occupation", "label": "21. Current occupation", "source": "profile.studies"},
        {"key": "purpose", "label": "23. Purpose of the journey", "source": "plan.purpose", "format": "upper"},
        {"key": "destination", "label": "25. Member State of main destination", "source": "plan.destination_name", "format": "upper"},
        {"key": "arrival", "label": "Intended date of arrival", "source": "plan.travel_date", "format": "date:DD-MM-YYYY"},
        {"key": "departure", "label": "Intended date of departure", "source": "plan.departure_date", "format": "date:DD-MM-YYYY"},
        {"key": "accommodation_name", "label": "30. Hotel or temporary accommodation", "source": "accommodation.issuer_name"},
        {"key": "accommodation_address", "label": "30. Address of the accommodation", "source": "accommodation.address"},
    ],
}


def residence_form(official_url: str) -> dict:
    """OIF form 9 ("Tartózkodási engedély iránti kérelem"), used for every residence purpose."""
    return {
        "key": "residence_permit_application",
        "title": "Residence permit application (OIF form 9)",
        "official_url": official_url,
        "fields": [
            {"key": "surname", "label": "Family name (as in passport)", "source": "passport.surname", "format": "upper"},
            {"key": "given_names", "label": "Given name(s) (as in passport)", "source": "passport.given_names", "format": "upper"},
            {"key": "email", "label": "Email address", "source": "profile.email"},
            {"key": "sex", "label": "Sex (M/F)", "source": "passport.sex"},
            {"key": "date_of_birth", "label": "Date of birth", "source": "passport.date_of_birth", "format": "date:DD-MM-YYYY"},
            {"key": "place_of_birth", "label": "Place of birth", "source": "passport.place_of_birth", "format": "upper"},
            {"key": "nationality", "label": "Nationality", "source": ["passport.nationality", "profile.citizenship"], "format": "upper"},
            {"key": "document_number", "label": "Passport number", "source": "passport.document_number"},
            {"key": "issue_date", "label": "Passport issued on", "source": "passport.issue_date", "format": "date:DD-MM-YYYY"},
            {"key": "expiry_date", "label": "Passport valid until", "source": "passport.expiry_date", "format": "date:DD-MM-YYYY"},
            {"key": "arrival", "label": "Date of entry to Hungary", "source": "plan.travel_date", "format": "date:DD-MM-YYYY"},
            {"key": "accommodation_address", "label": "Address in Hungary", "source": ["accommodation.address", "profile.address"]},
            {"key": "studies", "label": "School or employer", "source": ["enrolment.issuer_name", "employment_contract.issuer_name", "profile.studies"]},
        ],
    }


@dataclass(frozen=True)
class Target:
    key: str
    destination_code: str
    destination_name: str
    origin_code: str
    purpose: str
    description: str  # what to look for, used in prompts
    seeds: tuple[str, ...]
    forms: tuple = field(default_factory=tuple)


TARGETS: tuple[Target, ...] = (
    Target(
        "hu-tourism", "HU", "Hungary", "*", "tourism",
        "a short stay (up to 90 days in any 180) in Hungary for tourism by a third-country national who needs a Schengen visa: "
        "documents to submit, the visa fee, processing time and the application steps",
        ("https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en",
         "https://www.oif.gov.hu/tajekoztatok/tajekoztatas-vizummentesen-tartozkodok-szamara"),
        (SCHENGEN_FORM,),
    ),
    Target(
        "hu-study", "HU", "Hungary", "*", "study",
        "a residence permit for study (higher education students) in Hungary for a third-country national: "
        "documents to attach, procedure fee, processing time and steps",
        ("https://www.oif.gov.hu/tajekoztatok/a-hallgato-tanulo-tartozkodasa", OIF_FEES),
        (residence_form("https://www.oif.gov.hu/tajekoztatok/a-hallgato-tanulo-tartozkodasa"),),
    ),
    Target(
        "hu-work", "HU", "Hungary", "*", "work",
        "a residence permit for employment in Hungary for a third-country national with a job offer: "
        "documents to attach, procedure fee, processing time and steps",
        ("https://www.oif.gov.hu/tajekoztatok/foglalkoztatasi-celu-tartozkodasi-engedely", OIF_FEES),
        (residence_form("https://www.oif.gov.hu/tajekoztatok/foglalkoztatasi-celu-tartozkodasi-engedely"),),
    ),
    Target(
        "hu-job-search", "HU", "Hungary", "*", "job_search",
        "a residence permit for job seeking or starting a business in Hungary for a third-country national "
        "(for example after graduating): documents, fee, processing time and steps",
        ("https://www.oif.gov.hu/tajekoztatok/allaskereses-vagy-vallalkozas-inditasa", OIF_FEES),
        (residence_form("https://www.oif.gov.hu/tajekoztatok/allaskereses-vagy-vallalkozas-inditasa"),),
    ),
    Target(
        "hu-family", "HU", "Hungary", "*", "family",
        "a residence permit for family reunification in Hungary for a third-country national family member: "
        "documents, fee, processing time and steps",
        ("https://www.oif.gov.hu/tajekoztatok/csaladi-egyutteles-biztositasa-celu-tartozkodasi-engedely", OIF_FEES),
        (residence_form("https://www.oif.gov.hu/tajekoztatok/csaladi-egyutteles-biztositasa-celu-tartozkodasi-engedely"),),
    ),
)
