# Unbound frontend

React 19 + Vite + TypeScript + Tailwind CSS v4. Design follows `../source_data/`
(Canva app screens PDF + home deck PPTX).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Backend

The app reads and writes everything through the FastAPI backend in `../backend`.

```bash
docker compose up -d          # from the repo root: Postgres, RustFS, Redis, API on :8000
cp .env.example .env          # VITE_API_URL, defaults to http://localhost:8000
npm run dev                   # must run on :5173, the origin the API allows (CORS_ORIGINS)
```

If the API is down, the app shows "Your case didn't load" with a retry button.

`src/lib/api.ts` is the only file that knows backend field names; it maps them to `src/lib/types.ts`.

| Screen | Endpoints |
| --- | --- |
| Profile, sidebar, greeting | `GET/PATCH /api/profile`, `PATCH /api/profile/settings` |
| Finances budget slider | `PATCH /api/profile/budget` |
| To-do list | `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}` |
| Journey, Documents | `GET /api/documents`, `PATCH /api/documents/{id}` (request) |
| Upload + AI check | `POST /api/documents/{id}/upload` (file goes to RustFS, response has check results) |
| Pay renewal fee | `POST /api/documents/{id}/pay` |
| Payments history, visa fee | `GET /api/payments`, `POST /api/payments/pay-visa-fee` |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/mark-all-read` |
| Assistant | `POST /api/assistant/chat` |

Not on the server yet: login (no auth endpoint, so any email + 6-character password
opens the single `user_default` profile), chat history (kept in the browser), language
choice (kept in the browser) and account deletion.

Demo: in document upload, a file whose name contains `old` or `expired` fails the AI check.

## Structure

```
src/
  index.css              design tokens (@theme): colors, fonts, radii
  lib/
    http.ts              fetch wrapper (VITE_API_URL, error messages, upload progress)
    api.ts               API client + adapters from backend shapes to frontend types
    mock-data.ts         static reference data: countries, visa costs, journey stages
    types.ts, format.ts
  store/                 Auth (session + profile), Case (server data, optimistic updates), Toast
  components/
    ui/                  Button, Card, Badge, Input, Toggle, Checkbox, Progress, Segmented, Dialog…
    brand/               Logo, Flag
    layout/              AppLayout (auth guard), Sidebar, Topbar (search, language, notifications), PublicHeader
    case/                DocumentList + Upload / Request / Pay dialogs
  pages/
    public/              Landing, OptionsWizard, Login, Signup
    app/                 Assistant, Journey, Documents, Finances, Costs, Todo, Profile
```

Routes: `/`, `/login`, `/signup`, `/app` (assistant), `/app/journey`, `/app/documents`,
`/app/finances`, `/app/finances/costs`, `/app/todo`, `/app/profile`.
