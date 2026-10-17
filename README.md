# Unbound

Plan a trip or move abroad with an AI assistant, then follow it step by step: the documents you need, what it costs, every step with its deadline, and what Unbound can do for you (prefill application forms from your documents and download them as filled-in official PDFs, pay fees, calendar reminders, document requests). Immigration rules come from official government pages, re-checked every day.

```
frontend/   React + Vite + Tailwind (served by nginx in production)
backend/    FastAPI API, AI agents, guidelines pipeline, worker
deploy/     Caddyfile (HTTPS) for production
```

## Run locally

```bash
cp .env.example .env        # fill in GOOGLE_CLIENT_ID, JWT_SECRET and GEMINI_API_KEY (or ANTHROPIC_API_KEY)
docker compose up -d --build                                 # Postgres, storage, API on :8000, worker
cd frontend && npm install && npm run dev                    # http://localhost:5173
```

Add your Google account to `ADMIN_EMAILS` in `.env` to see **Data sources** (the pipeline) in the app.

## Run the production stack locally

The same images and setup as production (built frontend behind nginx, backend without reload,
worker with the daily pipeline), on `http://localhost:8080`, without a domain or HTTPS:

```bash
./scripts/local-prod.sh up       # first run generates .env.prod.local with local-only secrets
./scripts/local-prod.sh logs     # backend + worker logs
./scripts/local-prod.sh down     # stop, keep data
./scripts/local-prod.sh reset    # stop and delete its data
```

It uses your `.env` keys but its own database and storage (project `unbound-local`), so it can run
next to the dev stack. Add `http://localhost:8080` to the Google OAuth client's authorised
JavaScript origins. Set `LOCAL_PORT` to use another port, and `PIPELINE_ENABLED=false` in `.env` to
keep it from spending AI quota on the daily pipeline.

## Deploy (one server)

1. Point a domain at the server. In the Google OAuth client, add `https://<domain>` as an authorised JavaScript origin.
2. Fill the production part of `.env` (`DOMAIN`, `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`) plus the keys above.
3. `docker compose -f docker-compose.prod.yml up -d --build`

Caddy gets HTTPS certificates automatically; only ports 80 and 443 are exposed. The worker runs the guidelines pipeline daily at `PIPELINE_HOUR_UTC` (default 03:00 UTC).

**AI quota:** a daily pipeline run plus chat needs a paid Gemini key (the free tier allows about 20 requests per model per day) or an Anthropic key with credits.

## Tests

```bash
docker exec -w /app unbound_backend python -m pytest -q tests/
```

More detail: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md).
