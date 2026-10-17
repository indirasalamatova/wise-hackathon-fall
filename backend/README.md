# Unbound backend

FastAPI + SQLModel (Postgres) + RustFS (S3) + Google Gemini or Anthropic Claude.

```bash
docker compose up -d --build                     # from the repo root
docker exec -w /app unbound_backend python -m pytest -q tests/
```

Settings live in the repo-root `.env` (see `.env.example`): `GOOGLE_CLIENT_ID`, `JWT_SECRET`, and an
AI key. Without an AI key the app still runs; chat and document analysis report that the assistant
isn't configured. Optional: `GUIDELINE_MAX_AGE_DAYS` (default `90`).

### AI provider

| | Gemini | Claude |
| --- | --- | --- |
| Key | `GEMINI_API_KEY` ([AI Studio](https://aistudio.google.com/apikey)) | `ANTHROPIC_API_KEY` |
| Model | `GEMINI_MODEL` (default `gemini-3.5-flash`) | `ANTHROPIC_MODEL` (default `claude-opus-5-5`), `AGENT_EFFORT` (default `high`) |

List the Gemini models your key can use (the current one is starred):
`docker exec unbound_backend python -m app.cli.list_models`. Not every listed model works on every
key: previews may have no free quota (429), and some need the API enabled in the key's Google Cloud
project (403).

`LLM_PROVIDER=gemini|anthropic` picks one; unset, Gemini is used when `GEMINI_API_KEY` is set. After
changing `.env`, recreate the container: `docker compose up -d backend`. Conversations remember the
provider they started with (message formats differ); switching providers means starting a new
conversation. Tools, rules, the guideline gate and the UI are the same for both.

**Free-tier data:** on Gemini's free tier Google may use what you send, including document scans, to
improve its products. Use a paid Gemini key (or Claude) before real users upload documents.

## Agents

```
           user message
                │
        ┌───────▼────────┐  tools (app/agents/tools.py)        deterministic (app/agents/rules.py)
        │  Chat agent    │──► get_my_case                  ──► dates, MRZ check digits, validity
        │ orchestrator.py│──► get_country_guidelines  ──┐      windows, exact fee sums, gap check,
        └───────┬────────┘──► check_my_documents       │      form filling
                │          ──► create_visa_plan  (writes plan + to-do tasks)
                │          ──► prefill_form      (writes a prefilled form)
                │          ──► update_my_profile
                │                                       │
                │                     app/agents/guidelines.py: freshness gate
                │                     current → content · stale/missing → "being updated soon"
        ┌───────▼────────┐
        │ Document agent │  on every upload (background): the model reads the file into a fixed
        │  documents.py  │  schema, values as printed → rules.normalize_extraction → stored
        └────────────────┘  in document_analyses (fields, issues, MRZ verified or not)
```

What the model does and doesn't decide:

- **The model** talks with the user, chooses tools, and reads documents into raw strings.
- **Code** decides everything with legal or numeric weight: whether a guideline may be used,
  date parsing (ambiguous `03/04/2027` is reported, never guessed), passport MRZ check digits,
  "valid N months after the trip", document age, minimum amounts, fee totals (`Decimal`, per
  currency), task due dates, and form values. A constraint whose input is unknown is a problem,
  not a pass.
- **Stale guidelines are withheld in code.** When an entry is unverified, older than
  `GUIDELINE_MAX_AGE_DAYS`, or past its `valid_until`, the tools return only a "not up to date"
  status, so the model has nothing outdated to repeat. The system prompt tells it to say the
  country's information is being updated and will be available soon.

Chat history is stored append-only in `chat_messages`, exactly as exchanged with the API (thinking
blocks replay unchanged). Replies stream to the browser as server-sent events from
`POST /api/chat/sessions/{id}/messages`: `text`, `tool` (start/done/error), `done` (which data
changed) and `error`.

## Country guidelines (for the pipeline)

Table `country_guidelines`, one row per destination + citizenship (`*` = any) + purpose. Load and
update with the importer, which validates against `app/agents/schema.py` and bumps `version`:

```bash
docker exec -w /app unbound_backend python -m app.cli.import_guidelines data/guidelines/ --dry-run
docker exec -w /app unbound_backend python -m app.cli.import_guidelines data/guidelines/hu-from-ru-tourism.json
```

Format: see `data/guidelines/hu-from-ru-tourism.json`. Key rules:

- `requirements[].doc_kind` is matched against what the document agent detected (or the upload's
  type). Supported `constraints`: `valid_months_after_stay`, `max_age_days`, `issued_within_years`,
  `min_amount` + `min_amount_currency`.
- `fees[].amount` is a decimal string, or `null` when it varies (listed, never summed).
- `steps[].days_before_travel` becomes the task due date.
- `forms[].fields[].source` is one or more of `profile.*`, `passport.*`, `plan.*` (allowed names in
  `FORM_SOURCES`); `format` is `text`, `upper` or `date:DD-MM-YYYY`. Unfillable fields stay empty.
- **`verified_at` is set only after a person or the pipeline has checked the entry against its
  `sources`.** Until then agents treat it as out of date.

`data/guidelines/hu-from-ru-tourism.json` is a **draft written without checking current rules**
and is imported unverified. Review it against the listed official sources before setting
`verified_at`.

## Tests

- `tests/test_rules.py`: the deterministic rules (dates, MRZ, fees, requirement checks, form fill).
  `npm test` from the repo root (the compose image includes `requirements-dev.txt`).
