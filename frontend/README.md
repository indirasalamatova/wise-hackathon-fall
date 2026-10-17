# Unbound frontend

React 19 + Vite + TypeScript + Tailwind CSS v4. Design follows `../source_data/`
(Canva app screens PDF + home deck PPTX).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Demo login

Any email + any password with 6+ characters. `wrongpass` shows the error state.
In document upload, a file whose name contains `old` or `expired` fails the AI check.
"Reset demo data" on the Profile page restores the seed data.

## Structure

```
src/
  index.css              design tokens (@theme): colors, fonts, radii
  lib/
    api.ts               mock backend (auth, AI document check, Wise payments, assistant) — swap for fetch()
    mock-data.ts         seed case: user, documents, tasks, payments, countries
    types.ts, format.ts
  store/                 Auth / Case / Toast providers, localStorage persistence
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
