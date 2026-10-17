# Unbound

Plan a trip or move abroad with an AI assistant, then follow it step by step: the documents you need, what it costs, every step with its deadline, and what Unbound can do for you (prefill application forms from your documents and download them as filled-in official PDFs, pay fees, calendar reminders, document requests). Immigration rules come from official government pages, re-checked every day.

**Explore** shows a 3D globe of where your passport lets you go (verified guidelines first, an open
visa dataset as an indicative fallback, always labelled with its source). The app is in English,
Hungarian and Russian.

```
frontend/   React + Vite + Tailwind (served by nginx in production)
backend/    FastAPI API, AI agents, guidelines pipeline, worker
deploy/     Caddyfile (HTTPS) for production
```

## Run locally

Requirements: Docker (Compose v2) and Node.js 22+ (`nvm use` reads `.nvmrc`).

```bash
npm run setup     # creates .env from .env.example, generates JWT_SECRET, installs frontend deps
```

Then fill in `.env`: `GOOGLE_CLIENT_ID` (OAuth "Web application" client, authorised origin
`http://localhost:5173`) and an AI provider (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, or a local model:
see [backend/README.md](backend/README.md)). `.env` is the only env file you edit: compose passes it
to the containers and `frontend/vite.config.ts` reads `GOOGLE_CLIENT_ID` from it.

```bash
npm run dev         # Postgres, storage, API on :8000 and worker in Docker; frontend locally on :5173
npm run docker:up   # or everything in Docker, frontend included (hot reload)
```

The app must be on port 5173 (the origin the API allows), so don't run both at once. After changing
`.env`, run the command again to recreate the containers. Add your Google account to `ADMIN_EMAILS`
in `.env` to see **Data sources** (the pipeline) in the app.

| Service | URL |
| --- | --- |
| App | http://localhost:5173 |
| API / docs | http://localhost:8000 · http://localhost:8000/docs |
| RustFS console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Postgres | `localhost:5432`, `unbound_user` / `unbound_password`, db `unbound_db` |

| Command | What it does |
| --- | --- |
| `npm run setup` | Create `.env`, install frontend deps |
| `npm run dev` | Backend stack in Docker + local Vite dev server |
| `npm run docker:up` / `docker:down` | Start / stop everything |
| `npm run docker:reset` | Stop and **delete** the database and storage volumes |
| `npm run docker:logs` | Follow backend and worker logs |
| `npm test` | Backend tests (pytest, in the running backend container) |
| `npm run lint` / `npm run build` | Frontend lint / production build |
| `npm run check` | Lint, build and test |
| `npm run guidelines:import` | Load `backend/data/guidelines/` into the database |
| `npm run models:list` | Gemini models your key can use |

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
npm test          # or: docker exec -w /app unbound_backend python -m pytest -q tests/
```

More detail: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md).
