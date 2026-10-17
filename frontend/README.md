# Unbound frontend

React 19 + Vite + TypeScript + Tailwind CSS v4. Design follows `../source_data/`
(Canva app screens PDF + home deck PPTX).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Setup

Everything is per user and comes from the FastAPI backend in `../backend`. There is no seeded or demo data.

1. Create an OAuth client in Google Cloud Console → APIs & Services → Credentials:
   type **Web application**, authorised JavaScript origin `http://localhost:5173`.
2. In the repo root, copy `.env.example` to `.env` and set `GOOGLE_CLIENT_ID` and `JWT_SECRET`
   (`openssl rand -hex 32`). The frontend reads the same `GOOGLE_CLIENT_ID` (see `vite.config.ts`).
3. Run it:

```bash
docker compose up -d --build  # from the repo root: Postgres, RustFS, Redis, API on :8000
npm run dev                   # must run on :5173, the origin the API allows (CORS_ORIGINS)
```

## How auth works

Google Sign-In gives the browser an ID token. `POST /api/auth/google` checks it against
`GOOGLE_CLIENT_ID`, creates or updates the user, and returns our own JWT (7 days). `src/lib/http.ts`
sends it as `Authorization: Bearer …` on every call; a 401 logs you out. Every table has a `user_id`,
and the API only returns rows owned by the caller.

`src/lib/api.ts` is the only file that knows backend field names; it maps them to `src/lib/types.ts`.

| Screen | Endpoints |
| --- | --- |
| Login | `POST /api/auth/google` |
| Profile, journey stage, budget, savings, notification settings | `GET/PATCH/DELETE /api/me` |
| Documents | `GET/POST /api/documents`, `GET /api/documents/{id}/file`, `DELETE /api/documents/{id}` |
| To-do list | `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}` |
| Payments | `GET/POST /api/payments` (records a simulated Wise payment; no money moves) |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/mark-all-read` |
| Assistant | `GET/POST/DELETE /api/chat/sessions`, `GET /api/chat/sessions/{id}/messages`, `POST /api/chat/sessions/{id}/messages` (server-sent events) |
| Journeys | `GET /api/journeys`, `GET/PATCH/DELETE /api/journeys/{id}`, `POST /api/journeys/{id}/forms/{form_key}`, `POST /api/journeys/{id}/fees/{fee_key}/pay`, `GET /api/journeys/{id}/calendar.ics` |
| Document analysis, forms | `POST /api/documents/{id}/analyze`, `GET/PATCH/DELETE /api/forms/{id}`, `GET /api/forms/{id}/official.pdf`, `GET /api/forms/{id}/datasheet.pdf`, `GET /api/guidelines/coverage` |
| Data sources (admins) | `GET /api/admin/pipeline`, `POST /api/admin/pipeline/runs` |

Uploads: PDF, JPG or PNG up to 10 MB, checked by file contents, not the name. Re-uploading the same
file is refused. Documents with an expiry date within 60 days create a notification.

Kept in the browser only: language. The agents are described in `../backend/README.md`.

## Structure

```
src/
  index.css              design tokens (@theme): colors, fonts, radii
  lib/
    http.ts              fetch wrapper (VITE_API_URL, error messages, upload progress)
    api.ts               API client + adapters from backend shapes to frontend types
    mock-data.ts         static reference data only: countries, visa costs, journey stages
    types.ts, format.ts
  store/                 Auth (Google session + profile), Case (server data, optimistic updates), Toast
  components/
    ui/                  Button, Card, Badge, Input, Toggle, Checkbox, Progress, Segmented, Dialog…
    brand/               Logo, Flag
    layout/              AppLayout (auth guard), Sidebar, Topbar (search, language, notifications), PublicHeader
    case/                DocumentList, Upload / Pay dialogs, expiry rules
  pages/
    public/              Landing, OptionsWizard, Login, Signup
    app/                 Assistant, Journeys, JourneyDetail, Documents, FormView, Finances, Costs, Todo, Profile, AdminData
```

Routes: `/`, `/login`, `/signup`, `/app` (assistant), `/app/journey`, `/app/documents`,
`/app/finances`, `/app/finances/costs`, `/app/todo`, `/app/profile`.
